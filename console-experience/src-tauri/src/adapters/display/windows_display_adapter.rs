use crate::domain::display::{BrightnessConfig, RefreshRateConfig};
use crate::ports::display_port::DisplayPort;
use tracing::{info, warn};
use windows::Win32::Graphics::Gdi::{
    ChangeDisplaySettingsW, EnumDisplaySettingsW, CDS_UPDATEREGISTRY, DEVMODEW, DISP_CHANGE_SUCCESSFUL,
    ENUM_CURRENT_SETTINGS, ENUM_DISPLAY_SETTINGS_MODE,
};

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
    #[allow(clippy::unused_self, clippy::unnecessary_wraps)]
    fn get_brightness_wmi(&self) -> Result<Option<u32>, String> {
        // WMI query: root\WMI\WmiMonitorBrightness
        // For MVP: Return None if not laptop (requires wmi-rs crate or COM)
        // TODO: Implement full WMI integration
        warn!("WMI brightness query not yet implemented");
        Ok(None)
    }

    /// Sets brightness using WMI.
    /// Only works on devices with `WmiMonitorBrightnessMethods` support.
    #[allow(clippy::unused_self)]
    fn set_brightness_wmi(&self, level: u32) -> Result<(), String> {
        // WMI method: WmiSetBrightness(level, timeout)
        // TODO: Implement full WMI integration
        warn!("WMI brightness set not yet implemented for level {}", level);
        Err("WMI brightness control not yet implemented".to_string())
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
    fn get_current_refresh_rate_gdi(&self) -> Result<u32, String> {
        unsafe {
            let mut devmode = DEVMODEW::default();
            devmode.dmSize = std::mem::size_of::<DEVMODEW>() as u16;

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
    fn set_refresh_rate_gdi(&self, hz: u32) -> Result<(), String> {
        unsafe {
            let mut devmode = DEVMODEW::default();
            devmode.dmSize = std::mem::size_of::<DEVMODEW>() as u16;

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
    fn enumerate_refresh_rates_gdi(&self) -> Result<Vec<u32>, String> {
        unsafe {
            let mut rates = Vec::new();
            let mut mode_num = 0u32;
            let mut devmode = DEVMODEW::default();
            devmode.dmSize = std::mem::size_of::<DEVMODEW>() as u16;

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
            Ok(rates)
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
        self.enumerate_refresh_rates_gdi()
    }

    fn supports_brightness_control(&self) -> bool {
        // Check if WMI or DDC/CI is available
        // For MVP: Return false, will be true after WMI/DDC implementation
        false
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
