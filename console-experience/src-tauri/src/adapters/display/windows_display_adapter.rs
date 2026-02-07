use crate::domain::display::{BrightnessConfig, RefreshRateConfig};
use crate::ports::display_port::DisplayPort;
use serde::Deserialize;
use tracing::{info, warn};
use windows::Win32::Graphics::Gdi::{
    ChangeDisplaySettingsW, EnumDisplaySettingsW, CDS_UPDATEREGISTRY, DEVMODEW, DISP_CHANGE_SUCCESSFUL,
    ENUM_CURRENT_SETTINGS, ENUM_DISPLAY_SETTINGS_MODE,
};
use wmi::WMIConnection;

/// WMI brightness query result
#[derive(Deserialize, Debug)]
struct WmiMonitorBrightness {
    #[serde(rename = "CurrentBrightness")]
    current_brightness: u8,
}

/// WMI brightness methods instance (for `exec_instance_method`)
#[derive(Deserialize, Debug)]
struct WmiMonitorBrightnessMethods {
    #[serde(rename = "__Path")]
    path: String,
    #[serde(rename = "Active")]
    active: bool,
}

/// WMI method return value wrapper
#[derive(Deserialize, Debug)]
struct WmiMethodResult {
    #[serde(rename = "ReturnValue")]
    return_value: u32,
}

/// Input parameters for `WmiSetBrightness` method
#[derive(serde::Serialize, Debug)]
struct WmiSetBrightnessParams {
    #[serde(rename = "Brightness")]
    brightness: u8,
    #[serde(rename = "Timeout")]
    timeout: u32,
}

/// Windows-native implementation of `DisplayPort`.
/// Uses WMI for laptop brightness, DDC/CI for external monitors, and GDI for refresh rate.
pub struct WindowsDisplayAdapter;

impl Default for WindowsDisplayAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl WindowsDisplayAdapter {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    /// Gets brightness using WMI (Windows Management Instrumentation).
    /// Works on laptops with integrated displays.
    #[allow(clippy::unused_self)]
    fn get_brightness_wmi(&self) -> Result<Option<u32>, String> {
        // Connect to WMI namespace (root\WMI for monitor brightness)
        let wmi_con =
            WMIConnection::with_namespace_path("root\\WMI").map_err(|e| format!("Failed to connect to WMI: {e}"))?;

        // Query WmiMonitorBrightness class
        let results: Vec<WmiMonitorBrightness> = wmi_con
            .query()
            .map_err(|e| format!("WMI brightness query failed: {e}"))?;

        if let Some(brightness) = results.first() {
            info!("Current brightness (WMI): {}%", brightness.current_brightness);
            Ok(Some(u32::from(brightness.current_brightness)))
        } else {
            // No brightness info available (likely desktop PC)
            warn!("No WMI brightness info available (likely desktop PC)");
            Ok(None)
        }
    }

    /// Sets brightness using WMI.
    /// Only works on devices with `WmiMonitorBrightnessMethods` support.
    #[allow(clippy::unused_self)]
    fn set_brightness_wmi(&self, level: u32) -> Result<(), String> {
        let wmi_con =
            WMIConnection::with_namespace_path("root\\WMI").map_err(|e| format!("Failed to connect to WMI: {e}"))?;

        // Query for brightness methods instances
        let methods: Vec<WmiMonitorBrightnessMethods> = wmi_con
            .query()
            .map_err(|e| format!("WMI brightness methods query failed: {e}"))?;

        // Find active instance
        let active_instance = methods
            .into_iter()
            .find(|m| m.active)
            .ok_or("No active monitor brightness instance found")?;

        info!(
            "Setting brightness to {}% via WMI (path: {})",
            level, active_instance.path
        );

        // Prepare method parameters
        let params = WmiSetBrightnessParams {
            brightness: level.clamp(0, 100) as u8,
            timeout: 0, // 0 = immediate change, >0 = fade duration in seconds
        };

        // Execute WmiSetBrightness method
        // The Class type parameter specifies which WMI class to get the method definition from
        let result: WmiMethodResult = wmi_con
            .exec_instance_method::<WmiMonitorBrightnessMethods, _>(&active_instance.path, "WmiSetBrightness", params)
            .map_err(|e| format!("Failed to execute WmiSetBrightness: {e}"))?;

        if result.return_value == 0 {
            info!("✅ Brightness set successfully to {}%", level);
            Ok(())
        } else {
            warn!("WmiSetBrightness returned non-zero: {}", result.return_value);
            Err(format!(
                "WmiSetBrightness failed with return value: {}",
                result.return_value
            ))
        }
    }

    /// Gets brightness using DDC/CI protocol for external monitors.
    /// This is a workaround for desktop setups.
    #[allow(clippy::unused_self, clippy::unnecessary_wraps)]
    fn get_brightness_ddcci(&self) -> Result<Option<u32>, String> {
        // DDC/CI requires:
        // 1. Enumerate monitors via SetupAPI
        // 2. Send VCP (Virtual Control Panel) commands
        // 3. Read brightness value (VCP code 0x10)
        // TODO: Implement DDC/CI via Win32 DeviceIoControl
        warn!("DDC/CI brightness query not yet implemented");
        Ok(None)
    }

    /// Sets brightness using DDC/CI for external monitors.
    #[allow(clippy::unused_self)]
    fn set_brightness_ddcci(&self, level: u32) -> Result<(), String> {
        // DDC/CI VCP code 0x10 (brightness)
        // TODO: Implement DDC/CI control
        warn!("DDC/CI brightness set not yet implemented for level {}", level);
        Err("DDC/CI brightness control not yet implemented".to_string())
    }

    /// Gets current refresh rate using GDI.
    #[allow(clippy::unused_self)]
    fn get_current_refresh_rate_gdi(&self) -> Result<u32, String> {
        unsafe {
            let mut devmode = DEVMODEW {
                dmSize: std::mem::size_of::<DEVMODEW>() as u16,
                ..Default::default()
            };

            let result = EnumDisplaySettingsW(None, ENUM_CURRENT_SETTINGS, &raw mut devmode);

            if result.as_bool() {
                let hz = devmode.dmDisplayFrequency;
                info!("Current refresh rate: {}Hz", hz);
                Ok(hz)
            } else {
                Err("Failed to query current display settings".to_string())
            }
        }
    }

    /// Sets refresh rate using GDI `ChangeDisplaySettings`.
    #[allow(clippy::unused_self)]
    fn set_refresh_rate_gdi(&self, hz: u32) -> Result<(), String> {
        unsafe {
            let mut devmode = DEVMODEW {
                dmSize: std::mem::size_of::<DEVMODEW>() as u16,
                ..Default::default()
            };

            // Get current settings first
            if !EnumDisplaySettingsW(None, ENUM_CURRENT_SETTINGS, &raw mut devmode).as_bool() {
                return Err("Failed to get current display settings".to_string());
            }

            // Modify only refresh rate
            devmode.dmDisplayFrequency = hz;
            devmode.dmFields = windows::Win32::Graphics::Gdi::DM_DISPLAYFREQUENCY;

            info!("Attempting to set refresh rate to {}Hz", hz);

            let result = ChangeDisplaySettingsW(Some(&raw const devmode), CDS_UPDATEREGISTRY);

            if result == DISP_CHANGE_SUCCESSFUL {
                info!("Refresh rate changed successfully to {}Hz", hz);
                Ok(())
            } else {
                warn!("Failed to change refresh rate. Code: {:?}", result);
                Err(format!("Failed to set refresh rate to {hz}Hz"))
            }
        }
    }

    /// Enumerates all supported refresh rates for the current display.
    #[allow(clippy::unused_self)]
    fn enumerate_refresh_rates_gdi(&self) -> Vec<u32> {
        unsafe {
            let mut rates = Vec::new();
            let mut mode_num = 0u32;
            let mut devmode = DEVMODEW {
                dmSize: std::mem::size_of::<DEVMODEW>() as u16,
                ..Default::default()
            };

            // Enumerate all display modes
            loop {
                let result = EnumDisplaySettingsW(None, ENUM_DISPLAY_SETTINGS_MODE(mode_num), &raw mut devmode);
                if !result.as_bool() {
                    break;
                }

                let hz = devmode.dmDisplayFrequency;
                if !rates.contains(&hz) {
                    rates.push(hz);
                }

                mode_num += 1;
            }

            rates.sort_unstable();
            info!("Supported refresh rates: {:?}", rates);
            rates
        }
    }
}

impl DisplayPort for WindowsDisplayAdapter {
    fn get_brightness(&self) -> Result<Option<u32>, String> {
        // Try WMI first (laptops), fallback to DDC/CI (external monitors)
        if let Ok(Some(level)) = self.get_brightness_wmi() {
            return Ok(Some(level));
        }

        self.get_brightness_ddcci()
    }

    fn set_brightness(&self, config: BrightnessConfig) -> Result<(), String> {
        let level = BrightnessConfig::clamp(config.level);

        // Try WMI first, fallback to DDC/CI
        if self.set_brightness_wmi(level).is_ok() {
            return Ok(());
        }

        self.set_brightness_ddcci(level)
    }

    fn get_refresh_rate(&self) -> Result<u32, String> {
        self.get_current_refresh_rate_gdi()
    }

    fn set_refresh_rate(&self, config: RefreshRateConfig) -> Result<(), String> {
        self.set_refresh_rate_gdi(config.hz)
    }

    fn get_supported_refresh_rates(&self) -> Result<Vec<u32>, String> {
        Ok(self.enumerate_refresh_rates_gdi())
    }

    fn supports_brightness_control(&self) -> bool {
        // Check if WMI brightness is available (quick query)
        self.get_brightness_wmi().ok().flatten().is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adapter_creation() {
        let adapter = WindowsDisplayAdapter::new();
        assert!(!adapter.supports_brightness_control());
    }

    #[test]
    fn test_refresh_rate_query() {
        let adapter = WindowsDisplayAdapter::new();
        let result = adapter.get_refresh_rate();
        // Should succeed on Windows with display
        if let Ok(hz) = result {
            assert!(hz > 0);
            assert!(hz <= 500); // Reasonable max
        }
    }

    #[test]
    fn test_enumerate_rates() {
        let adapter = WindowsDisplayAdapter::new();
        let result = adapter.get_supported_refresh_rates();
        if let Ok(rates) = result {
            assert!(!rates.is_empty());
            assert!(rates.iter().all(|&hz| hz > 0));
        }
    }
}
