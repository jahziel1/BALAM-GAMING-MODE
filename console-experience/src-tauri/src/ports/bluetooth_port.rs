use serde::Serialize;

/// Bluetooth device class/type.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum BluetoothDeviceType {
    AudioVideo,
    Computer,
    Phone,
    Peripheral,
    Imaging,
    Wearable,
    Toy,
    Health,
    Unknown,
}

/// Bluetooth device pairing state.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum BluetoothPairingState {
    Unpaired,
    Paired,
    PairingInProgress,
}

/// Domain entity representing a Bluetooth device.
#[derive(Debug, Clone, Serialize)]
pub struct BluetoothDevice {
    /// Device name
    pub name: String,
    /// MAC address (e.g., "00:11:22:33:44:55")
    pub address: String,
    /// Signal strength in dBm (-100 to 0)
    pub signal_strength: Option<i32>,
    /// Device type/class
    pub device_type: BluetoothDeviceType,
    /// Pairing state
    pub pairing_state: BluetoothPairingState,
    /// Whether currently connected
    pub is_connected: bool,
    /// Whether device is remembered (paired before)
    pub is_remembered: bool,
}

/// Pairing configuration for Bluetooth devices.
#[derive(Debug, Clone)]
pub struct BluetoothPairingConfig {
    /// Device address to pair with
    pub address: String,
    /// PIN/passkey (if required, empty for SSP - Simple Secure Pairing)
    pub pin: String,
}

/// Port defining Bluetooth management capabilities.
///
/// This trait provides a hardware abstraction layer for Bluetooth operations
/// including device discovery, pairing, connection management, and status monitoring.
///
/// # Thread Safety
/// All implementations must be `Send + Sync`.
///
/// # Async Operations
/// All methods are async to prevent blocking the main thread during long operations
/// such as device scanning (10+ seconds) or pairing.
///
/// # Platform Support
/// - Windows: Uses WinRT Bluetooth APIs asynchronously
/// - Future: Event-driven notifications via DeviceWatcher
#[async_trait::async_trait]
pub trait BluetoothPort: Send + Sync {
    /// Gets the list of paired (remembered) Bluetooth devices.
    ///
    /// # Performance
    /// Fast (<100ms), reads from system cache.
    ///
    /// # Returns
    /// List of devices that have been paired with this computer.
    async fn get_paired_devices(&self) -> Result<Vec<BluetoothDevice>, String>;

    /// Scans for available Bluetooth devices nearby.
    ///
    /// # Performance
    /// **Slow (2-10 seconds)** - Performs active Bluetooth discovery.
    /// Runs asynchronously to avoid blocking UI thread.
    ///
    /// # Returns
    /// List of discovered devices, including paired and unpaired.
    async fn scan_devices(&self) -> Result<Vec<BluetoothDevice>, String>;

    /// Pairs with a Bluetooth device.
    ///
    /// # Errors
    /// - Device not found
    /// - Incorrect PIN
    /// - Bluetooth adapter disabled
    /// - Device already paired
    async fn pair_device(&self, config: BluetoothPairingConfig) -> Result<(), String>;

    /// Removes pairing with a device (forgets device).
    ///
    /// # Errors
    /// - Device not found in paired devices
    async fn unpair_device(&self, address: &str) -> Result<(), String>;

    /// Connects to a paired Bluetooth device.
    ///
    /// # Errors
    /// - Device not paired
    /// - Device out of range
    /// - Connection failed
    async fn connect_device(&self, address: &str) -> Result<(), String>;

    /// Disconnects from a Bluetooth device.
    ///
    /// # Errors
    /// - Device not connected
    async fn disconnect_device(&self, address: &str) -> Result<(), String>;

    /// Gets the currently connected Bluetooth devices.
    ///
    /// # Returns
    /// List of devices currently connected to this computer.
    async fn get_connected_devices(&self) -> Result<Vec<BluetoothDevice>, String>;

    /// Checks if Bluetooth adapter is available and enabled.
    ///
    /// # Returns
    /// - `Ok(true)` if Bluetooth is available and enabled
    /// - `Ok(false)` if Bluetooth is disabled or no adapter
    async fn is_bluetooth_available(&self) -> Result<bool, String>;

    /// Enables or disables Bluetooth radio.
    ///
    /// # Parameters
    /// - `enabled`: true to enable, false to disable
    ///
    /// # Errors
    /// - No Bluetooth adapter available
    /// - Insufficient permissions
    async fn set_bluetooth_enabled(&self, enabled: bool) -> Result<(), String>;
}
