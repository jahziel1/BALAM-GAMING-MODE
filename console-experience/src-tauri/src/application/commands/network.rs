use crate::adapters::bluetooth::WindowsBluetoothAdapter;
use crate::adapters::wifi::WindowsWiFiAdapter;
use crate::ports::bluetooth_port::{BluetoothDevice, BluetoothPairingConfig, BluetoothPort};
use crate::ports::wifi_port::{WiFiConfig, WiFiNetwork, WiFiPort};

// ============================================================================
// WiFi Management Commands
// ============================================================================

#[tauri::command]
pub fn scan_wifi_networks() -> Result<Vec<WiFiNetwork>, String> {
    let adapter = WindowsWiFiAdapter::new()?;
    WiFiPort::scan_networks(&adapter)
}

#[tauri::command]
pub fn get_current_wifi() -> Result<Option<WiFiNetwork>, String> {
    let adapter = WindowsWiFiAdapter::new()?;
    WiFiPort::get_current_network(&adapter)
}

#[tauri::command]
pub fn connect_wifi(ssid: String, password: String) -> Result<(), String> {
    let adapter = WindowsWiFiAdapter::new()?;
    WiFiPort::connect_network(
        &adapter,
        WiFiConfig {
            ssid,
            password,
            auto_connect: true,
        },
    )
}

#[tauri::command]
pub fn disconnect_wifi() -> Result<(), String> {
    let adapter = WindowsWiFiAdapter::new()?;
    WiFiPort::disconnect(&adapter)
}

#[tauri::command]
pub fn forget_wifi(ssid: String) -> Result<(), String> {
    let adapter = WindowsWiFiAdapter::new()?;
    WiFiPort::forget_network(&adapter, &ssid)
}

#[tauri::command]
pub fn get_saved_networks() -> Result<Vec<String>, String> {
    let adapter = WindowsWiFiAdapter::new()?;
    WiFiPort::get_saved_networks(&adapter)
}

#[tauri::command]
pub fn get_wifi_signal_strength() -> Result<Option<u32>, String> {
    let adapter = WindowsWiFiAdapter::new()?;
    WiFiPort::get_signal_strength(&adapter)
}

// ============================================================================
// Bluetooth Management Commands
// ============================================================================

#[tauri::command]
pub async fn is_bluetooth_available() -> bool {
    BluetoothPort::is_bluetooth_available(&WindowsBluetoothAdapter::new())
        .await
        .unwrap_or(false)
}

#[tauri::command]
pub async fn set_bluetooth_enabled(enabled: bool) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    BluetoothPort::set_bluetooth_enabled(&adapter, enabled).await
}

#[tauri::command]
pub async fn get_paired_bluetooth_devices() -> Result<Vec<BluetoothDevice>, String> {
    let adapter = WindowsBluetoothAdapter::new();
    BluetoothPort::get_paired_devices(&adapter).await
}

#[tauri::command]
pub async fn scan_bluetooth_devices() -> Result<Vec<BluetoothDevice>, String> {
    let adapter = WindowsBluetoothAdapter::new();
    BluetoothPort::scan_devices(&adapter).await
}

#[tauri::command]
pub async fn get_connected_bluetooth_devices() -> Result<Vec<BluetoothDevice>, String> {
    let adapter = WindowsBluetoothAdapter::new();
    BluetoothPort::get_connected_devices(&adapter).await
}

#[tauri::command]
pub async fn pair_bluetooth_device(address: String, pin: Option<String>) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    BluetoothPort::pair_device(
        &adapter,
        BluetoothPairingConfig {
            address,
            pin: pin.unwrap_or_default(),
        },
    )
    .await
}

#[tauri::command]
pub async fn unpair_bluetooth_device(address: String) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    BluetoothPort::unpair_device(&adapter, &address).await
}

#[tauri::command]
pub async fn connect_bluetooth_device(address: String) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    BluetoothPort::connect_device(&adapter, &address).await
}

#[tauri::command]
pub async fn disconnect_bluetooth_device(address: String) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    BluetoothPort::disconnect_device(&adapter, &address).await
}
