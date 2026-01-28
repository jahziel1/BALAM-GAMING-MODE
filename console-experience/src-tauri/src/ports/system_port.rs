use serde::Serialize;

/// Domain entity representing the current system status.
#[derive(Debug, Serialize, Clone)]
pub struct SystemStatus {
    /// Battery level percentage (0-100). None if no battery or desktop.
    pub battery_level: Option<u8>,
    /// Whether the device is currently charging.
    pub is_charging: bool,
    /// Name of the current Wi-Fi network. None if not connected or Ethernet.
    pub network_name: Option<String>,
    /// Current master volume (0-100).
    pub volume: u32,
    /// Type of connection (Wi-Fi, Ethernet, None).
    pub connection_type: ConnectionType,
}

/// Type of network connection.
#[derive(Debug, Serialize, Clone, PartialEq)]
pub enum ConnectionType {
    WiFi,
    Ethernet,
    None,
}

/// Port defining the system information acquisition and control capabilities.
pub trait SystemPort {
    /// Gets the current status of the platform (Battery, Network, Sound).
    fn get_status(&self) -> SystemStatus;

    /// Sets the master volume (0-100).
    fn set_volume(&self, level: u32) -> Result<(), String>;

    /// Initiates a system shutdown.
    fn shutdown(&self) -> Result<(), String>;

    /// Initiates a system restart.
    fn restart(&self) -> Result<(), String>;

    /// Logs out the current user.
    fn logout(&self) -> Result<(), String>;
}
