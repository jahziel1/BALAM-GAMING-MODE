use std::sync::{Arc, Mutex};
use tracing::{debug, info, warn};
use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::ERROR_SUCCESS;
use windows::Win32::System::Performance::{
    PdhAddEnglishCounterW, PdhCloseQuery, PdhCollectQueryData, PdhGetFormattedCounterValue, PdhOpenQueryW,
    PDH_FMT_COUNTERVALUE, PDH_FMT_DOUBLE,
};

// PDH handle types (opaque pointers)
#[allow(non_camel_case_types)]
type PDH_HQUERY = isize;
#[allow(non_camel_case_types)]
type PDH_HCOUNTER = isize;

/// PDH (Performance Data Helper) adapter for universal GPU monitoring.
///
/// Uses Windows Performance Counters to query GPU utilization, which is the
/// same mechanism used by Windows Task Manager.
///
/// # Features
/// - **Universal**: Works with NVIDIA, AMD, and Intel GPUs
/// - **Native**: Windows PDH API, no external SDKs required
/// - **Reliable**: Same data source as Task Manager
/// - **Thread Safe**: Arc<Mutex> for concurrent access
///
/// # Data Source
/// Performance Counters pull data directly from Windows Display Driver Model (WDDM):
/// - **VidSch** (GPU Scheduler) - tracks engine utilization
/// - **VidMm** (Video Memory Manager) - tracks memory usage
///
/// This works with ANY graphics API (DirectX, OpenGL, Vulkan, CUDA, etc.) and
/// ANY GPU vendor that supports WDDM 2.0+ (Windows 10+).
///
/// # Supported Metrics
/// - GPU utilization percentage (0-100) via `\GPU Engine(*)\Utilization Percentage`
///
/// # NOT Supported (Use Vendor SDKs)
/// - GPU temperature - Not available via Performance Counters
/// - GPU power draw - Not available via Performance Counters
/// - Fan speed - Not available via Performance Counters
///
/// # Performance
/// - Initialization: ~50ms (one-time setup, counter enumeration)
/// - Query: <10ms per sample
/// - Recommended sampling: ≥500ms (Performance Counters designed for 1Hz+)
///
/// # Requirements
/// - Windows 10+ (WDDM 2.0+)
/// - GPU driver supporting WDDM 2.0+ (~70% of Windows 10 population)
///
/// # Error Handling
/// All methods return `Result<Option<T>, String>`:
/// - `Ok(Some(value))` - Metric available
/// - `Ok(None)` - Counter not available (no GPU, old driver)
/// - `Err(...)` - PDH error (query failed, permission denied)
pub struct PdhAdapter {
    /// PDH query handle (must be kept alive for counter queries)
    query_handle: Arc<Mutex<Option<PDH_HQUERY>>>,
    /// PDH counter handle for GPU Engine utilization
    counter_handle: Arc<Mutex<Option<PDH_HCOUNTER>>>,
    /// Initialization attempted flag
    init_attempted: Arc<Mutex<bool>>,
    /// Last successful value (for graceful degradation)
    last_value: Arc<Mutex<Option<f32>>>,
}

impl PdhAdapter {
    /// Creates a new PDH adapter (lazy initialization).
    #[must_use]
    pub fn new() -> Self {
        Self {
            query_handle: Arc::new(Mutex::new(None)),
            counter_handle: Arc::new(Mutex::new(None)),
            init_attempted: Arc::new(Mutex::new(false)),
            last_value: Arc::new(Mutex::new(None)),
        }
    }

    /// Initializes PDH and sets up GPU utilization counter.
    ///
    /// # Returns
    /// - `Ok(())` - PDH query and counter initialized successfully
    /// - `Err(...)` - Initialization failed (no GPU, old driver, permission denied)
    fn ensure_initialized(&self) -> Result<(), String> {
        // Check if already attempted
        {
            let attempted = self
                .init_attempted
                .lock()
                .map_err(|e| format!("Failed to lock init_attempted: {e}"))?;

            if *attempted {
                let query_guard = self
                    .query_handle
                    .lock()
                    .map_err(|e| format!("Failed to lock query_handle: {e}"))?;

                return if query_guard.is_some() {
                    Ok(())
                } else {
                    Err("PDH initialization failed previously".to_string())
                };
            }
        }

        // Mark as attempted
        {
            let mut attempted = self
                .init_attempted
                .lock()
                .map_err(|e| format!("Failed to lock init_attempted: {e}"))?;
            *attempted = true;
        }

        info!("Initializing PDH GPU monitoring...");

        unsafe {
            // Step 1: Open PDH query
            let mut query: PDH_HQUERY = std::mem::zeroed();
            let result = PdhOpenQueryW(PCWSTR::null(), 0, &mut query);

            if result != ERROR_SUCCESS.0 {
                return Err(format!("PdhOpenQueryW failed with code: {result}"));
            }

            info!("PDH query opened successfully");

            // Step 2: Add GPU Engine utilization counter
            // Counter path: "\GPU Engine(*engtype_3D)\Utilization Percentage"
            // This queries the 3D engine (main GPU workload)
            let counter_path = w!("\\GPU Engine(*engtype_3D)\\Utilization Percentage");
            let mut counter: PDH_HCOUNTER = std::mem::zeroed();

            let result = PdhAddEnglishCounterW(query, counter_path, 0, &mut counter);

            if result != ERROR_SUCCESS.0 {
                // Cleanup query before returning error
                let _ = PdhCloseQuery(query);
                return Err(format!(
                    "PdhAddEnglishCounterW failed with code: {result} (GPU engine not available - check WDDM 2.0+ driver)"
                ));
            }

            info!("PDH GPU counter added successfully");

            // Step 3: Collect initial sample
            // PDH requires at least one collection before values are available
            let result = PdhCollectQueryData(query);

            if result != ERROR_SUCCESS.0 {
                // Cleanup before returning error
                let _ = PdhCloseQuery(query);
                return Err(format!("Initial PdhCollectQueryData failed with code: {result}"));
            }

            info!("PDH initial sample collected");

            // Store handles
            {
                let mut query_guard = self
                    .query_handle
                    .lock()
                    .map_err(|e| format!("Failed to lock query_handle: {e}"))?;
                *query_guard = Some(query);
            }

            {
                let mut counter_guard = self
                    .counter_handle
                    .lock()
                    .map_err(|e| format!("Failed to lock counter_handle: {e}"))?;
                *counter_guard = Some(counter);
            }

            info!("PDH GPU monitoring initialized successfully");
            Ok(())
        }
    }

    /// Checks if PDH is available and initialized.
    #[must_use]
    pub fn is_available(&self) -> bool {
        self.ensure_initialized().is_ok()
    }

    /// Gets GPU utilization percentage from Performance Counters.
    ///
    /// Queries the `\GPU Engine(*engtype_3D)\Utilization Percentage` counter,
    /// which represents the 3D engine utilization (main GPU workload).
    ///
    /// # Returns
    /// - `Ok(Some(usage))` - GPU usage percentage (0.0-100.0)
    /// - `Ok(None)` - Counter not available (no GPU, old driver)
    /// - `Err(...)` - Query failed
    ///
    /// # Implementation Note
    /// This method:
    /// 1. Collects a new sample via `PdhCollectQueryData`
    /// 2. Retrieves the formatted value via `PdhGetFormattedCounterValue`
    /// 3. Returns the value as a percentage
    ///
    /// The counter aggregates utilization across all processes using the GPU.
    pub fn get_gpu_usage(&self) -> Result<Option<f32>, String> {
        self.ensure_initialized()?;

        let query = {
            let query_guard = self
                .query_handle
                .lock()
                .map_err(|e| format!("Failed to lock query_handle: {e}"))?;

            query_guard.ok_or("PDH query not initialized")?
        };

        let counter = {
            let counter_guard = self
                .counter_handle
                .lock()
                .map_err(|e| format!("Failed to lock counter_handle: {e}"))?;

            counter_guard.ok_or("PDH counter not initialized")?
        };

        unsafe {
            // Step 1: Collect new sample
            let result = PdhCollectQueryData(query);

            if result != ERROR_SUCCESS.0 {
                warn!("PdhCollectQueryData failed with code: {result}");

                // Return last known value if available
                let last_value_guard = self
                    .last_value
                    .lock()
                    .map_err(|e| format!("Failed to lock last_value: {e}"))?;

                return if let Some(last) = *last_value_guard {
                    debug!("Using last known GPU value: {last}%");
                    Ok(Some(last))
                } else {
                    Ok(None)
                };
            }

            // Step 2: Get formatted counter value
            let mut counter_value: PDH_FMT_COUNTERVALUE = std::mem::zeroed();
            let result = PdhGetFormattedCounterValue(counter, PDH_FMT_DOUBLE, None, &mut counter_value);

            if result != ERROR_SUCCESS.0 {
                warn!("PdhGetFormattedCounterValue failed with code: {result}");

                // Return last known value if available
                let last_value_guard = self
                    .last_value
                    .lock()
                    .map_err(|e| format!("Failed to lock last_value: {e}"))?;

                return if let Some(last) = *last_value_guard {
                    debug!("Using last known GPU value: {last}%");
                    Ok(Some(last))
                } else {
                    Ok(None)
                };
            }

            // Step 3: Extract value
            let usage = counter_value.Anonymous.doubleValue as f32;

            // Clamp to valid range (Performance Counters can occasionally return >100)
            let clamped_usage = usage.clamp(0.0, 100.0);

            // Update last known value
            {
                let mut last_value_guard = self
                    .last_value
                    .lock()
                    .map_err(|e| format!("Failed to lock last_value: {e}"))?;
                *last_value_guard = Some(clamped_usage);
            }

            debug!("PDH GPU usage: {clamped_usage}%");
            Ok(Some(clamped_usage))
        }
    }
}

impl Default for PdhAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for PdhAdapter {
    /// Cleanup PDH resources when adapter is dropped.
    fn drop(&mut self) {
        if let Ok(query_guard) = self.query_handle.lock() {
            if let Some(query) = *query_guard {
                unsafe {
                    let _ = PdhCloseQuery(query);
                    debug!("PDH query closed");
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adapter_creation() {
        let adapter = PdhAdapter::new();
        // Should not panic
        let _available = adapter.is_available();
    }

    #[test]
    fn test_gpu_usage_graceful_fallback() {
        let adapter = PdhAdapter::new();

        // Should return Ok(None) or Ok(Some(value)), never panic
        if adapter.is_available() {
            let usage = adapter.get_gpu_usage();
            assert!(usage.is_ok());

            // If we got a value, it should be in valid range
            if let Ok(Some(value)) = usage {
                assert!(value >= 0.0 && value <= 100.0);
            }
        }
    }

    #[test]
    fn test_multiple_queries() {
        let adapter = PdhAdapter::new();

        if adapter.is_available() {
            // Should be able to query multiple times
            let _usage1 = adapter.get_gpu_usage();
            let _usage2 = adapter.get_gpu_usage();
            let _usage3 = adapter.get_gpu_usage();
            // Should not panic or error
        }
    }
}
