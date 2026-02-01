use crate::domain::performance::TDPConfig;
use crate::ports::performance_port::{HardwareVendor, PerformancePort};
use std::sync::Mutex;
use tracing::{error, info, warn};

/// AMD `RyzenAdj` adapter using FFI to libryzenadj.dll.
/// This is a native implementation that directly interfaces with AMD hardware registers.
///
/// Safety justification: FFI with external library is inherently unsafe, but:
/// - We validate all inputs before passing to C library
/// - Library is widely used and maintained (ROG Ally, Legion Go rely on it)
/// - All unsafe blocks are minimal and documented
pub struct RyzenAdjAdapter {
    /// Mutex-protected handle to prevent concurrent TDP changes
    library_handle: Mutex<Option<RyzenAdjHandle>>,
}

/// RAII wrapper for libryzenadj.dll handle
struct RyzenAdjHandle {
    _lib: libloading::Library,
    _init_fn: libloading::Symbol<'static, unsafe extern "C" fn() -> *mut std::ffi::c_void>,
    cleanup_fn: libloading::Symbol<'static, unsafe extern "C" fn(*mut std::ffi::c_void)>,
    set_stapm_fn: libloading::Symbol<'static, unsafe extern "C" fn(*mut std::ffi::c_void, u32) -> i32>,
    set_fast_fn: libloading::Symbol<'static, unsafe extern "C" fn(*mut std::ffi::c_void, u32) -> i32>,
    set_slow_fn: libloading::Symbol<'static, unsafe extern "C" fn(*mut std::ffi::c_void, u32) -> i32>,
    ryzen_handle: *mut std::ffi::c_void,
}

impl RyzenAdjAdapter {
    /// Creates a new `RyzenAdj` adapter.
    /// Does not load library until first use (lazy initialization).
    #[must_use]
    pub fn new() -> Self {
        Self {
            library_handle: Mutex::new(None),
        }
    }

    /// Attempts to load libryzenadj.dll and initialize.
    /// Returns Ok if successful, Err if library not found or initialization failed.
    fn ensure_initialized(&self) -> Result<(), String> {
        let mut handle = self
            .library_handle
            .lock()
            .map_err(|e| format!("Mutex lock failed: {e}"))?;

        if handle.is_none() {
            info!("Initializing RyzenAdj library...");

            // Try loading from multiple locations
            let lib_paths = [
                "libryzenadj.dll",           // Current directory (dev mode)
                "bin/libryzenadj.dll",       // Relative to binary
                "resources/libryzenadj.dll", // Tauri resources folder
                "../libryzenadj.dll",        // Tauri bundled resources (one level up from exe)
            ];

            let lib = lib_paths
                .iter()
                .find_map(|path| unsafe { libloading::Library::new(path).ok() })
                .ok_or_else(|| {
                    "libryzenadj.dll not found. Please ensure it's in the application directory".to_string()
                })?;

            // Load function symbols
            unsafe {
                let init_fn: libloading::Symbol<unsafe extern "C" fn() -> *mut std::ffi::c_void> = lib
                    .get(b"init_ryzenadj")
                    .map_err(|e| format!("Failed to load init_ryzenadj: {e}"))?;

                let cleanup_fn: libloading::Symbol<unsafe extern "C" fn(*mut std::ffi::c_void)> = lib
                    .get(b"cleanup_ryzenadj")
                    .map_err(|e| format!("Failed to load cleanup_ryzenadj: {e}"))?;

                let set_stapm_fn: libloading::Symbol<unsafe extern "C" fn(*mut std::ffi::c_void, u32) -> i32> = lib
                    .get(b"set_stapm_limit")
                    .map_err(|e| format!("Failed to load set_stapm_limit: {e}"))?;

                let set_fast_fn: libloading::Symbol<unsafe extern "C" fn(*mut std::ffi::c_void, u32) -> i32> = lib
                    .get(b"set_fast_limit")
                    .map_err(|e| format!("Failed to load set_fast_limit: {e}"))?;

                let set_slow_fn: libloading::Symbol<unsafe extern "C" fn(*mut std::ffi::c_void, u32) -> i32> = lib
                    .get(b"set_slow_limit")
                    .map_err(|e| format!("Failed to load set_slow_limit: {e}"))?;

                // Initialize RyzenAdj
                let ryzen_handle = init_fn();
                if ryzen_handle.is_null() {
                    warn!("RyzenAdj initialization failed. This CPU model may not be supported for TDP control.");
                    warn!("Desktop Ryzen CPUs (like 3900X) are not supported by RyzenAdj.");
                    warn!("TDP control is only available on Ryzen Mobile/APU chips (handhelds/laptops).");
                    return Err("TDP control not supported on this CPU model. Only Ryzen Mobile/APU chips are supported (ROG Ally, Legion Go, etc.)".to_string());
                }

                info!("RyzenAdj initialized successfully");

                // Leak symbols to 'static lifetime (they live as long as the library)
                let init_fn = std::mem::transmute(init_fn);
                let cleanup_fn = std::mem::transmute(cleanup_fn);
                let set_stapm_fn = std::mem::transmute(set_stapm_fn);
                let set_fast_fn = std::mem::transmute(set_fast_fn);
                let set_slow_fn = std::mem::transmute(set_slow_fn);

                *handle = Some(RyzenAdjHandle {
                    _lib: lib,
                    _init_fn: init_fn,
                    cleanup_fn,
                    set_stapm_fn,
                    set_fast_fn,
                    set_slow_fn,
                    ryzen_handle,
                });
            }
        }

        Ok(())
    }

    /// Detects AMD CPU using CPUID instruction.
    fn detect_amd_cpu() -> bool {
        // CPUID leaf 0: Vendor ID
        // AMD returns "AuthenticAMD"
        #[cfg(target_arch = "x86_64")]
        {
            use std::arch::x86_64::__cpuid;
            unsafe {
                let cpuid = __cpuid(0);
                let vendor = [cpuid.ebx, cpuid.edx, cpuid.ecx];
                let vendor_bytes: [u8; 12] = std::mem::transmute(vendor);
                let vendor_str = std::str::from_utf8(&vendor_bytes).unwrap_or("");

                vendor_str == "AuthenticAMD"
            }
        }
        #[cfg(not(target_arch = "x86_64"))]
        {
            false
        }
    }

    /// Detects if system has battery (laptop/handheld) or not (desktop).
    /// Uses Windows `GetSystemPowerStatus` API.
    fn is_battery_powered() -> bool {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

            unsafe {
                let mut status: SYSTEM_POWER_STATUS = std::mem::zeroed();
                if GetSystemPowerStatus(&raw mut status).is_ok() {
                    // BatteryFlag: 128 = No system battery
                    // BatteryFlag: 255 = Unknown status
                    // Any other value = Battery present
                    status.BatteryFlag != 128 && status.BatteryFlag != 255
                } else {
                    // If API fails, assume desktop (safer default)
                    false
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            // Non-Windows: assume handheld (conservative)
            true
        }
    }

    /// Gets hardware TDP limits based on detected system type.
    /// Laptop/Handheld (with battery): 5-30W
    /// Desktop (no battery): 65-142W (Ryzen 3900X range)
    fn get_hardware_limits() -> (u32, u32) {
        if Self::is_battery_powered() {
            info!("Battery detected: Using handheld TDP limits (5-30W)");
            (5, 30)
        } else {
            info!("No battery detected: Using desktop TDP limits (65-142W)");
            (65, 142)
        }
    }

    /// Sets TDP using `RyzenAdj` FFI.
    /// Applies to STAPM, FAST, and SLOW limits simultaneously for consistency.
    fn set_tdp_ffi(&self, watts: u32) -> Result<(), String> {
        let handle_guard = self
            .library_handle
            .lock()
            .map_err(|e| format!("Mutex lock failed: {e}"))?;

        let handle = handle_guard
            .as_ref()
            .ok_or_else(|| "RyzenAdj not initialized".to_string())?;

        let milliwatts = watts * 1000;

        info!("Setting TDP to {}W ({}mW)", watts, milliwatts);

        unsafe {
            // Set all three power limits (STAPM, FAST, SLOW) to ensure consistency
            let stapm_result = (handle.set_stapm_fn)(handle.ryzen_handle, milliwatts);
            let fast_result = (handle.set_fast_fn)(handle.ryzen_handle, milliwatts);
            let slow_result = (handle.set_slow_fn)(handle.ryzen_handle, milliwatts);

            if stapm_result != 0 || fast_result != 0 || slow_result != 0 {
                error!(
                    "RyzenAdj set_limits failed: stapm={}, fast={}, slow={}",
                    stapm_result, fast_result, slow_result
                );
                return Err(format!("Failed to set TDP to {watts}W"));
            }
        }

        info!("TDP set successfully to {}W", watts);
        Ok(())
    }
}

impl Drop for RyzenAdjHandle {
    fn drop(&mut self) {
        if !self.ryzen_handle.is_null() {
            unsafe {
                (self.cleanup_fn)(self.ryzen_handle);
            }
            info!("RyzenAdj cleaned up");
        }
    }
}

impl PerformancePort for RyzenAdjAdapter {
    fn detect_hardware(&self) -> Result<HardwareVendor, String> {
        if Self::detect_amd_cpu() {
            info!("Detected AMD CPU");
            Ok(HardwareVendor::AMD)
        } else {
            warn!("Non-AMD CPU detected");
            Ok(HardwareVendor::Unknown)
        }
    }

    fn get_tdp_config(&self) -> Result<TDPConfig, String> {
        // Ensure hardware is supported
        if self.detect_hardware()? != HardwareVendor::AMD {
            return Err("TDP control only supported on AMD CPUs".to_string());
        }

        let (min, max) = Self::get_hardware_limits();

        // Default to balanced TDP
        let current = u32::midpoint(min, max);

        TDPConfig::new(current, min, max)
    }

    fn set_tdp(&self, watts: u32) -> Result<(), String> {
        // Validate hardware
        if self.detect_hardware()? != HardwareVendor::AMD {
            return Err("TDP control only supported on AMD CPUs".to_string());
        }

        // Validate and clamp TDP
        let config = self.get_tdp_config()?;
        let clamped_watts = config.clamp(watts);

        if clamped_watts != watts {
            warn!("TDP {} out of range, clamped to {}", watts, clamped_watts);
        }

        // Ensure library is loaded
        self.ensure_initialized()?;

        // Apply TDP
        self.set_tdp_ffi(clamped_watts)
    }

    fn supports_tdp_control(&self) -> bool {
        // Check if AMD CPU
        let is_amd = self
            .detect_hardware()
            .map(|vendor| vendor == HardwareVendor::AMD)
            .unwrap_or(false);

        if !is_amd {
            return false;
        }

        // Try to initialize RyzenAdj
        // If it fails (e.g., desktop CPU not supported), return false gracefully
        match self.ensure_initialized() {
            Ok(()) => {
                info!("TDP control is supported on this hardware");
                true
            },
            Err(e) => {
                warn!("TDP control not supported: {}", e);
                false
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adapter_creation() {
        let adapter = RyzenAdjAdapter::new();
        // Should create without initializing
        assert!(adapter.library_handle.lock().unwrap().is_none());
    }

    #[test]
    fn test_hardware_detection() {
        let adapter = RyzenAdjAdapter::new();
        let vendor = adapter.detect_hardware();
        // Should detect AMD on supported hardware
        assert!(vendor.is_ok());
    }

    #[test]
    fn test_tdp_config() {
        let adapter = RyzenAdjAdapter::new();
        // May fail if not AMD hardware
        if let Ok(config) = adapter.get_tdp_config() {
            assert!(config.min_watts > 0);
            assert!(config.max_watts > config.min_watts);
            assert!(config.watts >= config.min_watts);
            assert!(config.watts <= config.max_watts);
        }
    }
}
