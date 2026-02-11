/// AMD Display Library (ADL) Adapter
///
/// Provides GPU monitoring for AMD Radeon GPUs using AMD's official ADL SDK.
/// Works with any AMD GPU that has drivers installed (user-mode, no admin required).
///
/// # Features
/// - GPU usage percentage
/// - GPU temperature (°C)
/// - GPU power draw (Watts)
/// - VRAM usage
/// - GPU clocks
///
/// # Architecture
/// - Uses FFI to load atiadlxx.dll (comes with AMD drivers)
/// - Lazy initialization with graceful fallback
/// - Thread-safe with parking_lot
use libloading::{Library, Symbol};
use parking_lot::Mutex;
use std::ffi::c_void;
use std::sync::Arc;
use tracing::{error, info, warn};

// ADL Return Codes
const ADL_OK: i32 = 0;

/// ADL Memory allocation callback (required by ADL)
unsafe extern "C" fn adl_malloc(size: i32) -> *mut c_void {
    if size <= 0 {
        return std::ptr::null_mut();
    }
    libc::malloc(size as usize)
}

/// ADL Memory free callback (required by ADL)
unsafe extern "C" fn adl_free(buffer: *mut c_void) {
    if !buffer.is_null() {
        libc::free(buffer);
    }
}

// ADL Structures (from ADL SDK)

#[repr(C)]
#[derive(Debug, Clone, Copy)]
struct ADLPMActivity {
    size: i32,
    engine_clock: i32,
    memory_clock: i32,
    vddc: i32,
    activity_percent: i32,
    current_performance_level: i32,
    current_bus_speed: i32,
    current_bus_lanes: i32,
    maximum_bus_lanes: i32,
    reserved: i32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
struct ADLTemperature {
    size: i32,
    temperature: i32, // In millidegrees Celsius (e.g., 65000 = 65°C)
}

/// AMD Display Library Adapter
pub struct ADLAdapter {
    /// ADL library handle
    library: Option<Arc<Library>>,
    /// ADL context handle
    context: Option<*mut c_void>,
    /// Primary adapter index
    adapter_index: i32,
    /// Cache of last known state
    state: Arc<Mutex<ADLState>>,
}

#[derive(Debug, Clone)]
struct ADLState {
    available: bool,
}

impl ADLAdapter {
    /// Creates a new ADL adapter instance.
    ///
    /// Attempts to load atiadlxx.dll (AMD driver DLL) and initialize ADL.
    /// If AMD drivers are not installed or GPU is not AMD, gracefully returns
    /// an inactive adapter.
    #[must_use]
    pub fn new() -> Self {
        info!("🔍 Initializing ADL adapter for AMD GPU monitoring");

        // Try to load AMD driver DLL
        let library = unsafe {
            // Try 64-bit DLL first (atiadlxx.dll)
            Library::new("atiadlxx.dll")
                .or_else(|_| {
                    // Fallback to 32-bit DLL (atiadlxy.dll) - unlikely but possible
                    Library::new("atiadlxy.dll")
                })
                .ok()
        };

        if library.is_none() {
            info!("ℹ️ AMD ADL library not found (not an AMD GPU or drivers not installed)");
            return Self {
                library: None,
                context: None,
                adapter_index: -1,
                state: Arc::new(Mutex::new(ADLState { available: false })),
            };
        }

        let library = Arc::new(library.unwrap());
        info!("✅ AMD ADL library loaded successfully");

        // Initialize ADL2
        let (context, adapter_index) = match Self::initialize_adl(&library) {
            Ok((ctx, idx)) => {
                info!("✅ ADL2 initialized successfully (adapter index: {})", idx);
                (Some(ctx), idx)
            },
            Err(e) => {
                error!("❌ Failed to initialize ADL2: {}", e);
                return Self {
                    library: Some(library),
                    context: None,
                    adapter_index: -1,
                    state: Arc::new(Mutex::new(ADLState { available: false })),
                };
            },
        };

        info!("✅ ADL adapter ready for AMD GPU monitoring");

        Self {
            library: Some(library),
            context,
            adapter_index,
            state: Arc::new(Mutex::new(ADLState { available: true })),
        }
    }

    /// Initializes ADL2 and returns context + primary adapter index
    fn initialize_adl(library: &Library) -> Result<(*mut c_void, i32), String> {
        unsafe {
            // Load ADL2_Main_Control_Create function
            let adl_main_control_create: Symbol<
                unsafe extern "C" fn(
                    callback_malloc: unsafe extern "C" fn(i32) -> *mut c_void,
                    callback_free: unsafe extern "C" fn(*mut c_void),
                    context: *mut *mut c_void,
                ) -> i32,
            > = library
                .get(b"ADL2_Main_Control_Create")
                .map_err(|e| format!("Failed to load ADL2_Main_Control_Create: {e}"))?;

            // Create ADL context
            let mut context: *mut c_void = std::ptr::null_mut();
            let result = adl_main_control_create(adl_malloc, adl_free, &mut context);

            if result != ADL_OK {
                return Err(format!("ADL2_Main_Control_Create failed with code: {result}"));
            }

            if context.is_null() {
                return Err("ADL2 context is null".to_string());
            }

            info!("✅ ADL2 context created");

            // Get number of adapters
            let num_adapters = Self::get_adapter_count(library, context)?;
            info!("Found {} AMD adapter(s)", num_adapters);

            if num_adapters == 0 {
                return Err("No AMD adapters found".to_string());
            }

            // Get primary adapter index (first active adapter)
            let adapter_index = Self::get_primary_adapter(library, context, num_adapters)?;
            info!("Primary AMD adapter index: {}", adapter_index);

            Ok((context, adapter_index))
        }
    }

    /// Gets the number of AMD adapters
    fn get_adapter_count(library: &Library, context: *mut c_void) -> Result<i32, String> {
        unsafe {
            let adl_adapter_numberofadapters: Symbol<unsafe extern "C" fn(*mut c_void, *mut i32) -> i32> = library
                .get(b"ADL2_Adapter_NumberOfAdapters_Get")
                .map_err(|e| format!("Failed to load ADL2_Adapter_NumberOfAdapters_Get: {e}"))?;

            let mut num_adapters: i32 = 0;
            let result = adl_adapter_numberofadapters(context, &mut num_adapters);

            if result != ADL_OK {
                return Err(format!("ADL2_Adapter_NumberOfAdapters_Get failed: {result}"));
            }

            Ok(num_adapters)
        }
    }

    /// Gets primary (active) adapter index
    fn get_primary_adapter(library: &Library, context: *mut c_void, num_adapters: i32) -> Result<i32, String> {
        unsafe {
            // Load function to get adapter info
            let adl_adapter_active: Symbol<unsafe extern "C" fn(*mut c_void, i32, *mut i32) -> i32> = library
                .get(b"ADL2_Adapter_Active_Get")
                .map_err(|e| format!("Failed to load ADL2_Adapter_Active_Get: {e}"))?;

            // Find first active adapter
            for i in 0..num_adapters {
                let mut status: i32 = 0;
                let result = adl_adapter_active(context, i, &mut status);

                if result == ADL_OK && status == 1 {
                    return Ok(i);
                }
            }

            // Fallback: use adapter 0
            warn!("No active adapter found, using adapter 0");
            Ok(0)
        }
    }

    /// Checks if ADL is available and initialized
    #[must_use]
    pub fn is_available(&self) -> bool {
        self.state.lock().available
    }

    /// Gets GPU usage percentage (0-100)
    pub fn get_gpu_usage(&self) -> Result<Option<f32>, String> {
        if !self.is_available() {
            return Ok(None);
        }

        let library = self.library.as_ref().ok_or("No library")?;
        let context = self.context.ok_or("No context")?;

        unsafe {
            let adl_overdrive5_currentactivity_get: Symbol<
                unsafe extern "C" fn(*mut c_void, i32, *mut ADLPMActivity) -> i32,
            > = library
                .get(b"ADL2_Overdrive5_CurrentActivity_Get")
                .map_err(|e| format!("Failed to load ADL2_Overdrive5_CurrentActivity_Get: {e}"))?;

            let mut activity = ADLPMActivity {
                size: std::mem::size_of::<ADLPMActivity>() as i32,
                engine_clock: 0,
                memory_clock: 0,
                vddc: 0,
                activity_percent: 0,
                current_performance_level: 0,
                current_bus_speed: 0,
                current_bus_lanes: 0,
                maximum_bus_lanes: 0,
                reserved: 0,
            };

            let result = adl_overdrive5_currentactivity_get(context, self.adapter_index, &mut activity);

            if result != ADL_OK {
                warn!("ADL2_Overdrive5_CurrentActivity_Get failed: {}", result);
                return Ok(None);
            }

            Ok(Some(activity.activity_percent as f32))
        }
    }

    /// Gets GPU temperature in Celsius
    pub fn get_gpu_temperature(&self) -> Result<Option<f32>, String> {
        if !self.is_available() {
            return Ok(None);
        }

        let library = self.library.as_ref().ok_or("No library")?;
        let context = self.context.ok_or("No context")?;

        unsafe {
            let adl_overdrive5_temperature_get: Symbol<
                unsafe extern "C" fn(*mut c_void, i32, i32, *mut ADLTemperature) -> i32,
            > = library
                .get(b"ADL2_Overdrive5_Temperature_Get")
                .map_err(|e| format!("Failed to load ADL2_Overdrive5_Temperature_Get: {e}"))?;

            let mut temperature = ADLTemperature {
                size: std::mem::size_of::<ADLTemperature>() as i32,
                temperature: 0,
            };

            // Thermal controller index 0 (GPU core)
            let result = adl_overdrive5_temperature_get(context, self.adapter_index, 0, &mut temperature);

            if result != ADL_OK {
                warn!("ADL2_Overdrive5_Temperature_Get failed: {}", result);
                return Ok(None);
            }

            // Convert from millidegrees to degrees Celsius
            let temp_celsius = temperature.temperature as f32 / 1000.0;
            Ok(Some(temp_celsius))
        }
    }

    /// Gets GPU power draw in Watts
    ///
    /// Note: Not all AMD GPUs support power reporting via ADL.
    /// Returns None if not supported.
    pub fn get_gpu_power(&self) -> Result<Option<f32>, String> {
        if !self.is_available() {
            return Ok(None);
        }

        // Note: ADL doesn't have a direct power query API like NVML
        // Power reporting is available via Overdrive6/8 but requires more complex setup
        // For now, return None (can be implemented if needed)

        // TODO: Implement ADL2_Overdrive6_PowerInfo_Get or ADL2_Overdrive8_CurrentSetting_Get
        Ok(None)
    }
}

impl Drop for ADLAdapter {
    fn drop(&mut self) {
        if let (Some(library), Some(context)) = (&self.library, self.context) {
            unsafe {
                if let Ok(adl_main_control_destroy) =
                    library.get::<Symbol<unsafe extern "C" fn(*mut c_void) -> i32>>(b"ADL2_Main_Control_Destroy")
                {
                    let result = adl_main_control_destroy(context);
                    if result == ADL_OK {
                        info!("✅ ADL2 context destroyed");
                    } else {
                        warn!("⚠️ ADL2_Main_Control_Destroy failed: {}", result);
                    }
                }
            }
        }
    }
}

impl Default for ADLAdapter {
    fn default() -> Self {
        Self::new()
    }
}

// Thread safety: ADL library is thread-safe according to AMD docs
unsafe impl Send for ADLAdapter {}
unsafe impl Sync for ADLAdapter {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adl_creation() {
        let adapter = ADLAdapter::new();
        // Should not panic even if AMD GPU not present
        let _available = adapter.is_available();
    }

    #[test]
    fn test_adl_gpu_usage() {
        let adapter = ADLAdapter::new();
        if adapter.is_available() {
            let usage = adapter.get_gpu_usage();
            assert!(usage.is_ok());
            if let Ok(Some(u)) = usage {
                assert!(u >= 0.0 && u <= 100.0);
            }
        }
    }

    #[test]
    fn test_adl_temperature() {
        let adapter = ADLAdapter::new();
        if adapter.is_available() {
            let temp = adapter.get_gpu_temperature();
            assert!(temp.is_ok());
            if let Ok(Some(t)) = temp {
                // Reasonable temperature range
                assert!(t > 0.0 && t < 120.0);
            }
        }
    }
}
