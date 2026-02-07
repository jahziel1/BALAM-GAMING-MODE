use serde::Serialize;

/// Domain entity representing the current system status.
#[derive(Debug, Serialize, Clone)]
pub struct SystemStatus {
    /// Battery level percentage (0-100). `None` if no battery or desktop.
    pub battery_level: Option<u8>,
    /// Whether the device is currently charging.
    pub is_charging: bool,
    /// Name of the current Wi-Fi network. `None` if not connected or Ethernet.
    pub network_name: Option<String>,
    /// Current master volume (0-100).
    pub volume: u32,
    /// Type of connection (Wi-Fi, Ethernet, `None`).
    pub connection_type: ConnectionType,
}

/// Type of network connection.
#[derive(Debug, Serialize, Clone, PartialEq)]
pub enum ConnectionType {
    WiFi,
    Ethernet,
    None,
}

/// Audio device type classification based on device properties.
#[derive(Debug, Serialize, Clone, PartialEq)]
pub enum AudioDeviceType {
    /// Desktop speakers or laptop built-in speakers
    Speakers,
    /// Headphones or headset
    Headphones,
    /// HDMI audio output (monitor/TV)
    HDMI,
    /// DisplayPort audio output
    DisplayPort,
    /// USB audio device
    USB,
    /// Bluetooth audio device
    Bluetooth,
    /// Virtual audio device (e.g., VoiceMeeter, VB-Audio)
    Virtual,
    /// Unknown or unclassified device
    Generic,
}

/// Represents an audio output device.
#[derive(Debug, Serialize, Clone)]
pub struct AudioDevice {
    /// Unique device identifier (Windows: device ID string)
    pub id: String,
    /// Human-readable device name
    pub name: String,
    /// Device type classification
    pub device_type: AudioDeviceType,
    /// Whether this is the current default device
    pub is_default: bool,
}

/// Port defining the system information acquisition and control capabilities.
///
/// This trait provides a hardware abstraction layer for system-level operations
/// including battery monitoring, network status, audio control, and power management.
///
/// # Thread Safety
/// All implementations must be `Send + Sync` to allow concurrent access.
///
/// # Examples
/// ```rust
/// use console_experience::ports::system_port::{SystemPort, ConnectionType};
/// use console_experience::adapters::windows_system_adapter::WindowsSystemAdapter;
///
/// let adapter = WindowsSystemAdapter::new();
/// let status = adapter.get_status();
/// println!("Battery: {:?}%, Volume: {}%", status.battery_level, status.volume);
/// ```
pub trait SystemPort {
    /// Gets the current status of the platform (Battery, Network, Sound).
    ///
    /// # Returns
    /// A `SystemStatus` struct containing:
    /// - **`battery_level`**: Battery percentage (0-100) or `None` for desktop PCs
    /// - **`is_charging`**: Whether device is plugged in
    /// - **`network_name`**: Current `WiFi` SSID or `None`
    /// - **volume**: Master system volume (0-100)
    /// - **`connection_type`**: `WiFi`, Ethernet, or `None`
    ///
    /// # Performance
    /// Should complete within 50ms. Called frequently by UI (250ms polling).
    fn get_status(&self) -> SystemStatus;

    /// Sets the master volume (0-100).
    ///
    /// # Arguments
    /// * `level` - Volume percentage (0 = mute, 100 = maximum)
    ///
    /// # Errors
    /// Returns `Err` if audio device access fails or platform API errors.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::system_port::SystemPort;
    /// # use console_experience::adapters::windows_system_adapter::WindowsSystemAdapter;
    /// let adapter = WindowsSystemAdapter::new();
    /// adapter.set_volume(75)?; // Set to 75%
    /// # Ok::<(), String>(())
    /// ```
    fn set_volume(&self, level: u32) -> Result<(), String>;

    /// Initiates a system shutdown.
    ///
    /// # Errors
    /// Returns `Err` if insufficient privileges or platform API fails.
    ///
    /// # Platform Notes
    /// - **Windows**: Uses `ExitWindowsEx` with `EWX_SHUTDOWN` flag
    /// - **Linux**: Calls `systemctl poweroff`
    /// - **macOS**: Calls `shutdown -h now`
    ///
    /// # Security
    /// Requires administrator/root privileges on most platforms.
    fn shutdown(&self) -> Result<(), String>;

    /// Initiates a system restart.
    ///
    /// # Errors
    /// Returns `Err` if insufficient privileges or platform API fails.
    ///
    /// # Platform Notes
    /// - **Windows**: Uses `ExitWindowsEx` with `EWX_REBOOT` flag
    /// - **Linux**: Calls `systemctl reboot`
    /// - **macOS**: Calls `shutdown -r now`
    fn restart(&self) -> Result<(), String>;

    /// Logs out the current user.
    ///
    /// # Errors
    /// Returns `Err` if platform API fails.
    ///
    /// # Platform Notes
    /// - **Windows**: Uses `ExitWindowsEx` with `EWX_LOGOFF` flag
    /// - **Linux**: Calls `loginctl terminate-user`
    /// - **macOS**: Calls `osascript` with logout command
    fn logout(&self) -> Result<(), String>;

    /// Lists all available audio output devices.
    ///
    /// # Returns
    /// Vector of `AudioDevice` structs containing device information.
    /// Devices are sorted with the default device first.
    ///
    /// # Errors
    /// Returns `Err` if COM initialization fails or device enumeration errors.
    ///
    /// # Performance
    /// Typically completes within 100ms. Caches device list internally.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::system_port::SystemPort;
    /// # use console_experience::adapters::windows_system_adapter::WindowsSystemAdapter;
    /// let adapter = WindowsSystemAdapter::new();
    /// let devices = adapter.list_audio_devices()?;
    /// for device in devices {
    ///     println!("{}: {} (default: {})", device.name, device.device_type, device.is_default);
    /// }
    /// # Ok::<(), String>(())
    /// ```
    fn list_audio_devices(&self) -> Result<Vec<AudioDevice>, String>;

    /// Sets the default audio output device.
    ///
    /// # Arguments
    /// * `device_id` - Unique device identifier from `list_audio_devices()`
    ///
    /// # Errors
    /// Returns `Err` if:
    /// - Device ID not found
    /// - Insufficient permissions
    /// - COM interface access fails
    ///
    /// # Platform Notes
    /// - **Windows**: Uses `IPolicyConfig::SetDefaultEndpoint()` (undocumented API)
    /// - **Linux**: Uses PulseAudio `pactl set-default-sink`
    /// - **macOS**: Uses `AudioDeviceSetProperty`
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::system_port::SystemPort;
    /// # use console_experience::adapters::windows_system_adapter::WindowsSystemAdapter;
    /// let adapter = WindowsSystemAdapter::new();
    /// let devices = adapter.list_audio_devices()?;
    /// if let `Some`(headphones) = devices.iter().find(|d| d.device_type == AudioDeviceType::Headphones) {
    ///     adapter.set_default_audio_device(&headphones.id)?;
    /// }
    /// # Ok::<(), String>(())
    /// ```
    fn set_default_audio_device(&self, device_id: &str) -> Result<(), String>;
}
