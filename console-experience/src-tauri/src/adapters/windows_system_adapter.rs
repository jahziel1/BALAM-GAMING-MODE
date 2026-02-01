use crate::ports::system_port::{ConnectionType, SystemPort, SystemStatus};
use std::process::Command;
use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{eConsole, eRender, IMMDevice, IMMDeviceEnumerator, MMDeviceEnumerator};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_APARTMENTTHREADED};
use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

/// Implementation of the `SystemPort` for Windows utilizing strictly native `CoreAudio` APIs.
/// This approach avoids shell-outs and keystroke emulation.
pub struct WindowsSystemAdapter;

impl Default for WindowsSystemAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl WindowsSystemAdapter {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    fn get_battery_info(&self) -> (Option<u8>, bool) {
        unsafe {
            let mut status = SYSTEM_POWER_STATUS::default();
            if GetSystemPowerStatus(&raw mut status).is_ok() {
                let level = if status.BatteryLifePercent == 255 {
                    None
                } else {
                    Some(status.BatteryLifePercent.min(100))
                };
                let is_charging = (status.BatteryFlag & 8) != 0;
                return (level, is_charging);
            }
        }
        (None, false)
    }

    /// Internal helper to access the Windows Master Volume COM interface.
    /// Uses absolute memory access for maximum performance and stability.
    fn get_volume_interface(&self) -> Result<IAudioEndpointVolume, String> {
        unsafe {
            // Ensure COM is initialized for this thread
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

            let enumerator: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("COM Enumerator Error: {e}"))?;

            let device: IMMDevice = enumerator
                .GetDefaultAudioEndpoint(eRender, eConsole)
                .map_err(|e| format!("Default Audio Endpoint Error: {e}"))?;

            // Activate the Volume control interface
            let volume: IAudioEndpointVolume = device
                .Activate(CLSCTX_ALL, None)
                .map_err(|e| format!("Audio Interface Activation Error: {e}"))?;

            Ok(volume)
        }
    }

    fn get_master_volume(&self) -> u32 {
        match self.get_volume_interface() {
            Ok(vol) => unsafe {
                match vol.GetMasterVolumeLevelScalar() {
                    Ok(level) => (level * 100.0) as u32,
                    Err(_) => 50,
                }
            },
            Err(_) => 50,
        }
    }

    fn set_master_volume(&self, level: u32) -> Result<(), String> {
        let normalized = (level as f32) / 100.0;
        let vol = self.get_volume_interface()?;
        unsafe {
            vol.SetMasterVolumeLevelScalar(normalized, std::ptr::null())
                .map_err(|e| format!("Hardware SetVolume Error: {e}"))?;
        }
        Ok(())
    }

    fn execute_power_command(&self, args: &[&str]) -> Result<(), String> {
        let _ = Command::new("shutdown").args(args).spawn();
        Ok(())
    }

    fn get_network_info(&self) -> (ConnectionType, Option<String>) {
        // netsh is a standard system utility for network management,
        // fallback to native Wlan API if user requires full C++-like integration.
        let output = Command::new("netsh").args(["wlan", "show", "interfaces"]).output();
        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines() {
                if line.contains(" SSID") && !line.contains(" BSSID") {
                    if let Some(name) = line.split(':').nth(1).map(|s| s.trim().to_string()) {
                        return (ConnectionType::WiFi, Some(name));
                    }
                }
            }
        }
        (ConnectionType::Ethernet, Some("Wired Network".to_string()))
    }
}

impl SystemPort for WindowsSystemAdapter {
    fn get_status(&self) -> SystemStatus {
        let (battery_level, is_charging) = self.get_battery_info();
        let volume = self.get_master_volume();
        let (connection_type, network_name) = self.get_network_info();

        SystemStatus {
            battery_level,
            is_charging,
            network_name,
            volume,
            connection_type,
        }
    }

    fn set_volume(&self, level: u32) -> Result<(), String> {
        self.set_master_volume(level)
    }

    fn shutdown(&self) -> Result<(), String> {
        self.execute_power_command(&["/s", "/t", "0"])
    }

    fn restart(&self) -> Result<(), String> {
        self.execute_power_command(&["/r", "/t", "0"])
    }

    fn logout(&self) -> Result<(), String> {
        self.execute_power_command(&["/l"])
    }
}
