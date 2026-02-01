use serde::Serialize;

/// WiFi security protocol type.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum WiFiSecurity {
    Open,
    WEP,
    WPA,
    WPA2,
    WPA3,
    Unknown,
}

/// Domain entity representing a WiFi network.
#[derive(Debug, Clone, Serialize)]
pub struct WiFiNetwork {
    /// Network SSID (name)
    pub ssid: String,
    /// MAC address (BSSID)
    pub bssid: Option<String>,
    /// Signal strength in dBm (-100 to 0)
    pub signal_strength: i32,
    /// Frequency in MHz (2400 = 2.4GHz, 5000 = 5GHz)
    pub frequency: u32,
    /// Security protocol
    pub security: WiFiSecurity,
    /// Whether currently connected to this network
    pub is_connected: bool,
}

/// Connection configuration for WiFi networks.
#[derive(Debug, Clone)]
pub struct WiFiConfig {
    /// Network SSID
    pub ssid: String,
    /// WPA/WPA2 password (empty for open networks)
    pub password: String,
    /// Whether to auto-connect in the future
    pub auto_connect: bool,
}

/// Port defining WiFi management capabilities.
///
/// This trait provides a hardware abstraction layer for WiFi operations
/// including network scanning, connection management, and status monitoring.
///
/// # Thread Safety
/// All implementations must be `Send + Sync`.
///
/// # Platform Support
/// - Windows: Uses WLAN API via netsh commands
/// - Future: Direct WlanAPI integration for event-driven notifications
pub trait WiFiPort: Send + Sync {
    /// Gets the currently connected WiFi network.
    ///
    /// # Returns
    /// - `Ok(Some(network))` if connected to WiFi
    /// - `Ok(None)` if not connected or connected to Ethernet
    /// - `Err` if query failed
    fn get_current_network(&self) -> Result<Option<WiFiNetwork>, String>;

    /// Scans for available WiFi networks.
    ///
    /// # Performance
    /// Typically completes within 2-5 seconds (hardware dependent).
    ///
    /// # Returns
    /// List of discovered networks, sorted by signal strength (strongest first).
    fn scan_networks(&self) -> Result<Vec<WiFiNetwork>, String>;

    /// Connects to a WiFi network.
    ///
    /// # Errors
    /// - Network not found
    /// - Incorrect password
    /// - Hardware disabled
    /// - Already connected to another network
    fn connect_network(&self, config: WiFiConfig) -> Result<(), String>;

    /// Disconnects from the current WiFi network.
    fn disconnect(&self) -> Result<(), String>;

    /// Forgets a previously connected network (removes saved profile).
    ///
    /// # Errors
    /// - Network profile not found
    fn forget_network(&self, ssid: &str) -> Result<(), String>;

    /// Gets the list of saved network profiles (SSIDs).
    fn get_saved_networks(&self) -> Result<Vec<String>, String>;

    /// Gets signal strength of the currently connected network (0-100).
    ///
    /// # Returns
    /// - `Ok(Some(strength))` if connected and signal available
    /// - `Ok(None)` if not connected or signal unavailable
    fn get_signal_strength(&self) -> Result<Option<u32>, String>;
}
