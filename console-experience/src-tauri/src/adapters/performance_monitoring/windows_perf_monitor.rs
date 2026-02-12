use crate::adapters::fps_service::FpsClient;
use crate::adapters::performance_monitoring::{NVMLAdapter, PdhAdapter};
use crate::domain::performance::{FPSStats, PerformanceMetrics};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};
use tracing::{info, warn};

/// Windows performance monitoring adapter - orchestrates all performance metrics.
///
/// # Features
/// - **CPU/RAM:** sysinfo (fast, cross-platform)
/// - **GPU (NVIDIA):** `NVML` adapter (official API, full metrics)
/// - **GPU (AMD/Intel):** `PDH` adapter (Performance Counters, usage only)
/// - **FPS:** `FpsClient` (Windows Service via Named Pipe)
///
/// # Performance
/// - CPU/RAM: <10ms per query
/// - GPU (`NVML`): <5ms per query
/// - GPU (`PDH`): <10ms per query
/// - FPS (Service): <1ms per query (cached, Named Pipe)
/// - Total overhead: <2% CPU
///
/// # Architecture
/// This is the main orchestrator that aggregates metrics from multiple adapters:
/// - sysinfo for CPU/RAM
/// - `NVML` for NVIDIA GPU (primary, full metrics)
/// - `PDH` for AMD/Intel GPU (fallback, usage only)
/// - `FpsClient` for FPS (Windows Service)
///
/// All adapters are lazy-initialized and handle errors gracefully.
///
/// # GPU Monitoring Strategy
/// 1. Try NVML first (NVIDIA only) - provides usage, temp, power
/// 2. Fallback to PDH (universal) - provides usage only
/// 3. This ensures AMD/Intel users get GPU usage percentage
///
/// # Important Note on CPU Usage
/// sysinfo requires TWO snapshots with a delay to calculate CPU usage correctly.
/// This struct maintains a background refresh mechanism to ensure accurate readings.
pub struct WindowsPerfMonitor {
    /// System information instance (cached for performance)
    system: Arc<Mutex<System>>,
    /// `NVML` adapter for NVIDIA GPU metrics (lazy initialized)
    nvml: Arc<NVMLAdapter>,
    /// `PDH` adapter for universal GPU metrics (lazy initialized)
    pdh: Arc<PdhAdapter>,
    /// FPS Service client (Windows Service via Named Pipe)
    fps_client: Arc<FpsClient>,
    /// Last time system metrics were refreshed (for rate limiting)
    #[allow(dead_code)]
    last_refresh: Arc<Mutex<Instant>>,
}

impl WindowsPerfMonitor {
    /// Creates a new Windows performance monitor.
    ///
    /// Initializes sysinfo System and creates adapter instances (lazy initialization).
    /// `NVML` and `PDH` are not initialized until first use.
    ///
    /// # Important
    /// This also starts a background thread that refreshes sysinfo metrics every 500ms.
    /// This is required for accurate CPU usage readings (sysinfo needs two snapshots).
    #[must_use]
    pub fn new() -> Self {
        info!("Initializing WindowsPerfMonitor");

        // Create System with optimized refresh settings
        let refresh_kind = RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything());

        let mut system = System::new_with_specifics(refresh_kind);
        system.refresh_all();

        let system_arc = Arc::new(Mutex::new(system));
        let last_refresh = Arc::new(Mutex::new(Instant::now()));

        // Start background refresh thread for sysinfo
        // This ensures CPU usage is calculated correctly (needs two snapshots)
        let system_clone = system_arc.clone();
        let last_refresh_clone = last_refresh.clone();
        thread::spawn(move || {
            info!("Performance monitor background refresh thread started");
            loop {
                thread::sleep(Duration::from_millis(500));

                if let Ok(mut system_guard) = system_clone.lock() {
                    system_guard.refresh_cpu();
                    system_guard.refresh_memory();

                    if let Ok(mut last_refresh_guard) = last_refresh_clone.lock() {
                        *last_refresh_guard = Instant::now();
                    }
                }
            }
        });

        // Wait for first refresh to complete (ensure we have baseline)
        thread::sleep(Duration::from_millis(600));

        Self {
            system: system_arc,
            nvml: Arc::new(NVMLAdapter::new()),
            pdh: Arc::new(PdhAdapter::new()),
            fps_client: Arc::new(FpsClient::new()),
            last_refresh,
        }
    }

    /// Gets CPU usage percentage (average across all cores).
    ///
    /// # Returns
    /// CPU usage as percentage (0-100).
    ///
    /// # Implementation Note
    /// This reads the cached value that is refreshed by the background thread.
    /// The background thread ensures accurate readings by maintaining proper
    /// time deltas between sysinfo refreshes.
    fn get_cpu_usage(&self) -> f32 {
        let system_guard = match self.system.lock() {
            Ok(guard) => guard,
            Err(_) => {
                warn!("Failed to lock system mutex for CPU usage");
                return 0.0;
            },
        };

        // Get global CPU usage (average across all cores)
        // Background thread handles refresh_cpu() every 500ms
        system_guard.global_cpu_info().cpu_usage()
    }

    /// Gets RAM usage in GB.
    ///
    /// # Returns
    /// Tuple of (used_gb, total_gb).
    ///
    /// # Implementation Note
    /// This reads the cached value that is refreshed by the background thread.
    fn get_ram_usage(&self) -> (f32, f32) {
        let system_guard = match self.system.lock() {
            Ok(guard) => guard,
            Err(_) => {
                warn!("Failed to lock system mutex for RAM usage");
                return (0.0, 0.0);
            },
        };

        // Background thread handles refresh_memory() every 500ms
        let used_bytes = system_guard.used_memory();
        let total_bytes = system_guard.total_memory();

        // Convert from bytes to GB (1 GB = 1073741824 bytes)
        let used_gb = used_bytes as f32 / 1_073_741_824.0;
        let total_gb = total_bytes as f32 / 1_073_741_824.0;

        (used_gb, total_gb)
    }

    /// Gets GPU usage percentage (0-100).
    ///
    /// Uses a two-tier fallback strategy:
    /// 1. **NVML** (NVIDIA GPUs) - Highest priority, most accurate
    /// 2. **PDH** (AMD/Intel GPUs) - Fallback, uses Performance Counters
    ///
    /// # Returns
    /// GPU usage percentage (0-100), or 0.0 if no GPU monitoring available.
    ///
    /// # Strategy
    /// - NVIDIA users: Get data from NVML (vendor-specific, precise)
    /// - AMD/Intel users: Get data from PDH (universal, Task Manager source)
    /// - This ensures all users get GPU usage regardless of vendor
    fn get_gpu_usage(&self) -> f32 {
        // Try NVML first (NVIDIA only, but provides full metrics)
        match self.nvml.get_gpu_usage() {
            Ok(Some(usage)) => {
                return usage;
            },
            Ok(None) => {
                // NVML available but no GPU usage metric
            },
            Err(_) => {
                // NVML not available (not NVIDIA, drivers missing, etc.)
            },
        }

        // Fallback to PDH (universal - works with AMD, Intel, NVIDIA)
        match self.pdh.get_gpu_usage() {
            Ok(Some(usage)) => {
                return usage;
            },
            Ok(None) => {
                // PDH counter not available (old driver, no GPU)
            },
            Err(_) => {
                // PDH query failed
            },
        }

        // No GPU monitoring available
        0.0
    }

    /// Gets GPU temperature in Celsius.
    ///
    /// Uses NVML for NVIDIA GPUs. Returns `None` if not available.
    fn get_gpu_temp(&self) -> Option<f32> {
        match self.nvml.get_gpu_temperature() {
            Ok(temp) => temp,
            Err(_) => None,
        }
    }

    /// Gets GPU power draw in Watts.
    ///
    /// Uses NVML for NVIDIA GPUs. Returns `None` if not available.
    fn get_gpu_power(&self) -> Option<f32> {
        match self.nvml.get_gpu_power() {
            Ok(power) => power,
            Err(_) => None,
        }
    }

    /// Gets complete performance metrics.
    ///
    /// # Returns
    /// PerformanceMetrics with CPU, RAM, GPU, FPS data.
    ///
    /// # Error Handling
    /// All metrics use graceful fallbacks:
    /// - CPU/RAM: Always available (sysinfo)
    /// - GPU: 0% if `NVML` not available
    /// - FPS: `None` if FPS Service not available
    pub fn get_metrics(&self) -> PerformanceMetrics {
        let cpu_usage = self.get_cpu_usage();
        let (ram_used_gb, ram_total_gb) = self.get_ram_usage();
        let gpu_usage = self.get_gpu_usage();
        let gpu_temp_c = self.get_gpu_temp();
        let gpu_power_w = self.get_gpu_power();

        // Get FPS from FPS Service (Windows Service via Named Pipe)
        let fps = self.fps_client.get_fps().map(FPSStats::new);

        PerformanceMetrics {
            cpu_usage,
            gpu_usage,
            ram_used_gb,
            ram_total_gb,
            gpu_temp_c,
            cpu_temp_c: None, // CPU temp not available via sysinfo on Windows
            gpu_power_w,
            fps,
        }
    }

    /// Checks if `NVML` (NVIDIA GPU) is available.
    #[must_use]
    pub fn is_nvml_available(&self) -> bool {
        self.nvml.is_available()
    }

    /// Checks if `PDH` (Performance Counters GPU) is available.
    #[must_use]
    pub fn is_pdh_available(&self) -> bool {
        self.pdh.is_available()
    }

    /// Gets GPU vendor information for debugging.
    ///
    /// # Returns
    /// String describing which GPU monitoring is active:
    /// - "NVML (NVIDIA)" - NVIDIA GPU with full metrics
    /// - "PDH (AMD/Intel)" - Non-NVIDIA GPU with PDH fallback
    /// - "None" - No GPU monitoring available
    #[must_use]
    pub fn get_gpu_vendor_info(&self) -> String {
        if self.is_nvml_available() {
            "NVML (NVIDIA)".to_string()
        } else if self.is_pdh_available() {
            "PDH (AMD/Intel/Universal)".to_string()
        } else {
            "None".to_string()
        }
    }
}

impl Default for WindowsPerfMonitor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_monitor_creation() {
        let monitor = WindowsPerfMonitor::new();
        let metrics = monitor.get_metrics();

        // CPU should be a valid percentage
        assert!(metrics.cpu_usage >= 0.0 && metrics.cpu_usage <= 100.0);

        // RAM total should be > 0
        assert!(metrics.ram_total_gb > 0.0);

        // Used RAM should be less than total
        assert!(metrics.ram_used_gb <= metrics.ram_total_gb);
    }

    #[test]
    fn test_nvml_availability() {
        let monitor = WindowsPerfMonitor::new();
        // Should not panic
        let _available = monitor.is_nvml_available();
    }

    #[test]
    fn test_gpu_metrics_graceful_fallback() {
        let monitor = WindowsPerfMonitor::new();
        let metrics = monitor.get_metrics();

        // GPU should be 0 or valid percentage (not panic)
        assert!(metrics.gpu_usage >= 0.0 && metrics.gpu_usage <= 100.0);
    }
}
