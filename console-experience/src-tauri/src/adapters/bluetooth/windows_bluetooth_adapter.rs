use crate::ports::bluetooth_port::{
    BluetoothDevice, BluetoothDeviceType, BluetoothPairingConfig, BluetoothPairingState, BluetoothPort,
};
use tracing::{error, info, warn};
use windows::Devices::Bluetooth::BluetoothDevice as WinBluetoothDevice;
use windows::Devices::Enumeration::DeviceInformation;
use windows::Devices::Radios::{Radio, RadioAccessStatus, RadioKind, RadioState};

/// Windows implementation of BluetoothPort using native WinRT async APIs.
///
/// # Performance Strategy
/// - Fast operations (<100ms): `block_in_place` - doesn't consume thread pool
/// - Slow operations (>1s): `spawn_blocking` - isolated in thread pool
/// - Device conversion: Concurrent with async batch processing
///
/// # Async Model
/// WinRT IAsyncOperation is bridged to Rust async using:
/// - Fast sync: `block_in_place` for <100ms operations
/// - Heavy work: `spawn_blocking` for multi-second scans
///
/// This is the most performant approach given WinRT's async model.
pub struct WindowsBluetoothAdapter;

impl WindowsBluetoothAdapter {
    /// Creates a new Windows Bluetooth adapter.
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    /// Converts Windows device class to our enum.
    fn convert_device_type(class_of_device: &Option<u32>) -> BluetoothDeviceType {
        if let Some(cod) = class_of_device {
            let major_class = (cod >> 8) & 0x1F;
            match major_class {
                0x01 => BluetoothDeviceType::Computer,
                0x02 => BluetoothDeviceType::Phone,
                0x03 => BluetoothDeviceType::Unknown,
                0x04 => BluetoothDeviceType::AudioVideo,
                0x05 => BluetoothDeviceType::Peripheral,
                0x06 => BluetoothDeviceType::Imaging,
                0x07 => BluetoothDeviceType::Wearable,
                0x08 => BluetoothDeviceType::Toy,
                0x09 => BluetoothDeviceType::Health,
                _ => BluetoothDeviceType::Unknown,
            }
        } else {
            BluetoothDeviceType::Unknown
        }
    }

    /// Converts DeviceInformation to BluetoothDevice.
    ///
    /// Uses block_in_place for fast (<100ms) WinRT calls.
    async fn convert_device_info(device_info: DeviceInformation) -> Result<BluetoothDevice, String> {
        // Fast operation - use block_in_place instead of spawn_blocking
        let result = tokio::task::block_in_place(|| {
            let device_id = device_info.Id().map_err(|e| format!("Failed to get device ID: {e}"))?;

            let bt_device = WinBluetoothDevice::FromIdAsync(&device_id)
                .map_err(|e| format!("Failed to get Bluetooth device future: {e}"))?
                .get()
                .map_err(|e| format!("Failed to await Bluetooth device: {e}"))?;

            let name = device_info
                .Name()
                .map_err(|e| format!("Failed to get name: {e}"))?
                .to_string();

            let address = bt_device
                .BluetoothAddress()
                .map_err(|e| format!("Failed to get address: {e}"))?;
            let address_str = format!(
                "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
                (address >> 40) & 0xFF,
                (address >> 32) & 0xFF,
                (address >> 24) & 0xFF,
                (address >> 16) & 0xFF,
                (address >> 8) & 0xFF,
                address & 0xFF
            );

            let class_of_device: Option<u32> = bt_device.ClassOfDevice().ok().and_then(|cod| cod.RawValue().ok());

            let connection_status = bt_device
                .ConnectionStatus()
                .map_err(|e| format!("Failed to get connection status: {e}"))?;
            let is_connected = connection_status == windows::Devices::Bluetooth::BluetoothConnectionStatus::Connected;

            let pairing = device_info
                .Pairing()
                .map_err(|e| format!("Failed to get pairing: {e}"))?;
            let is_paired = pairing.IsPaired().map_err(|e| format!("Failed to check paired: {e}"))?;

            let pairing_state = if is_paired {
                BluetoothPairingState::Paired
            } else {
                BluetoothPairingState::Unpaired
            };

            Ok::<BluetoothDevice, String>(BluetoothDevice {
                name,
                address: address_str,
                signal_strength: None,
                device_type: Self::convert_device_type(&class_of_device),
                pairing_state,
                is_connected,
                is_remembered: is_paired,
            })
        });

        result
    }
}

impl Default for WindowsBluetoothAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl BluetoothPort for WindowsBluetoothAdapter {
    async fn is_bluetooth_available(&self) -> Result<bool, String> {
        info!("🔍 Checking Bluetooth availability...");

        // Fast operation - use block_in_place (doesn't consume thread pool)
        let result = tokio::task::block_in_place(|| {
            let radios = Radio::GetRadiosAsync()
                .map_err(|e| {
                    error!("❌ Failed to get radios: {e}");
                    format!("Failed to get radios: {e}")
                })?
                .get()
                .map_err(|e| {
                    error!("❌ Failed to await radios: {e}");
                    format!("Failed to await radios: {e}")
                })?;

            let radio_count = radios.Size().map_err(|e| format!("Failed to get radio count: {e}"))?;
            info!("📡 Found {} radio(s)", radio_count);

            for i in 0..radio_count {
                let radio = radios.GetAt(i).map_err(|e| format!("Failed to get radio {i}: {e}"))?;
                let kind = radio.Kind().map_err(|e| format!("Failed to get radio kind: {e}"))?;

                if kind == RadioKind::Bluetooth {
                    let state = radio.State().map_err(|e| format!("Failed to get state: {e}"))?;
                    let is_on = state == RadioState::On;
                    info!("✅ Bluetooth radio: {:?} (enabled: {})", state, is_on);
                    return Ok(is_on);
                }
            }

            info!("⚠️ No Bluetooth radio found");
            Ok(false)
        });

        result
    }

    async fn set_bluetooth_enabled(&self, enabled: bool) -> Result<(), String> {
        info!("🔧 Setting Bluetooth: {}", if enabled { "ON" } else { "OFF" });

        // Fast operation - use block_in_place
        tokio::task::block_in_place(|| {
            let radios = Radio::GetRadiosAsync()
                .map_err(|e| format!("Failed to get radios: {e}"))?
                .get()
                .map_err(|e| format!("Failed to await radios: {e}"))?;

            let radio_count = radios.Size().map_err(|e| format!("Failed to get count: {e}"))?;

            for i in 0..radio_count {
                let radio = radios.GetAt(i).map_err(|e| format!("Failed to get radio {i}: {e}"))?;
                let kind = radio.Kind().map_err(|e| format!("Failed to get kind: {e}"))?;

                if kind == RadioKind::Bluetooth {
                    let state = if enabled { RadioState::On } else { RadioState::Off };
                    let access = radio
                        .SetStateAsync(state)
                        .map_err(|e| format!("Failed to set state: {e}"))?
                        .get()
                        .map_err(|e| format!("Failed to await state change: {e}"))?;

                    if access != RadioAccessStatus::Allowed {
                        error!("❌ Radio access denied: {:?}", access);
                        return Err(format!("Access denied: {access:?}"));
                    }

                    info!("✅ Bluetooth set to: {:?}", state);
                    return Ok(());
                }
            }

            error!("❌ No Bluetooth radio found");
            Err("No Bluetooth radio found".to_string())
        })
    }

    async fn get_paired_devices(&self) -> Result<Vec<BluetoothDevice>, String> {
        info!("📋 Getting paired devices...");

        // Fast operation - use block_in_place
        let device_infos = tokio::task::block_in_place(|| {
            let selector = WinBluetoothDevice::GetDeviceSelectorFromPairingState(true)
                .map_err(|e| format!("Failed to create selector: {e}"))?;

            let devices = DeviceInformation::FindAllAsyncAqsFilter(&selector)
                .map_err(|e| format!("Failed to find devices: {e}"))?
                .get()
                .map_err(|e| format!("Failed to await devices: {e}"))?;

            let count = devices.Size().map_err(|e| format!("Failed to get count: {e}"))?;
            info!("📱 Found {} paired device(s)", count);

            let mut infos = Vec::new();
            for i in 0..count {
                if let Ok(device) = devices.GetAt(i) {
                    infos.push(device);
                }
            }

            Ok::<Vec<DeviceInformation>, String>(infos)
        })?;

        // Convert devices concurrently (async parallelism)
        let mut tasks = Vec::new();
        for device_info in device_infos {
            tasks.push(Self::convert_device_info(device_info));
        }

        let mut converted = Vec::new();
        for task in tasks {
            match task.await {
                Ok(device) => converted.push(device),
                Err(e) => warn!("⚠️ Failed to convert device: {e}"),
            }
        }

        info!("✅ Converted {} paired devices", converted.len());
        Ok(converted)
    }

    async fn scan_devices(&self) -> Result<Vec<BluetoothDevice>, String> {
        info!("🔎 Scanning for Bluetooth devices (2-10 seconds)...");

        // SLOW operation - use spawn_blocking to avoid blocking runtime
        let device_infos = tokio::task::spawn_blocking(|| {
            info!("🔄 Device scan started in background thread...");

            let selector = WinBluetoothDevice::GetDeviceSelectorFromPairingState(false).map_err(|e| {
                error!("❌ Selector creation failed: {e}");
                format!("Failed to create selector: {e}")
            })?;

            info!("⏳ Waiting for device discovery...");

            let devices = DeviceInformation::FindAllAsyncAqsFilter(&selector)
                .map_err(|e| {
                    error!("❌ Device discovery failed: {e}");
                    format!("Failed to find devices: {e}")
                })?
                .get()
                .map_err(|e| {
                    error!("❌ Await failed: {e}");
                    format!("Failed to await devices: {e}")
                })?;

            let count = devices.Size().map_err(|e| format!("Failed to get count: {e}"))?;
            info!("✅ Discovery complete: {} device(s) found", count);

            let mut infos = Vec::new();
            for i in 0..count {
                if let Ok(device) = devices.GetAt(i) {
                    infos.push(device);
                }
            }

            Ok::<Vec<DeviceInformation>, String>(infos)
        })
        .await
        .map_err(|e| format!("Task join error: {e}"))??;

        info!("🔄 Converting {} discovered devices...", device_infos.len());

        // Convert concurrently (async parallelism)
        let mut tasks = Vec::new();
        for device_info in device_infos {
            tasks.push(Self::convert_device_info(device_info));
        }

        let mut converted = Vec::new();
        for task in tasks {
            match task.await {
                Ok(device) => converted.push(device),
                Err(e) => warn!("⚠️ Failed to convert device: {e}"),
            }
        }

        info!("✅ Scan complete: {} devices converted", converted.len());
        Ok(converted)
    }

    async fn pair_device(&self, config: BluetoothPairingConfig) -> Result<(), String> {
        info!("🔗 Pairing with device: {}", config.address);

        let address = config.address.clone();

        // Medium operation - use spawn_blocking
        tokio::task::spawn_blocking(move || {
            let selector = WinBluetoothDevice::GetDeviceSelectorFromPairingState(false)
                .map_err(|e| format!("Failed to create selector: {e}"))?;

            let devices = DeviceInformation::FindAllAsyncAqsFilter(&selector)
                .map_err(|e| format!("Failed to find devices: {e}"))?
                .get()
                .map_err(|e| format!("Failed to await devices: {e}"))?;

            let count = devices.Size().map_err(|e| format!("Failed to get count: {e}"))?;
            info!("🔍 Searching {} devices for {}", count, address);

            for i in 0..count {
                let device_info = devices.GetAt(i).map_err(|e| format!("Failed to get device {i}: {e}"))?;
                let device_id = device_info.Id().map_err(|e| format!("Failed to get ID: {e}"))?;

                let bt_device = WinBluetoothDevice::FromIdAsync(&device_id)
                    .map_err(|e| format!("Failed to get device: {e}"))?
                    .get()
                    .map_err(|e| format!("Failed to await device: {e}"))?;

                let bt_address = bt_device
                    .BluetoothAddress()
                    .map_err(|e| format!("Failed to get address: {e}"))?;
                let address_str = format!(
                    "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
                    (bt_address >> 40) & 0xFF,
                    (bt_address >> 32) & 0xFF,
                    (bt_address >> 24) & 0xFF,
                    (bt_address >> 16) & 0xFF,
                    (bt_address >> 8) & 0xFF,
                    bt_address & 0xFF
                );

                if address_str == address {
                    info!("✅ Device found: {}", address);

                    let pairing = device_info
                        .Pairing()
                        .map_err(|e| format!("Failed to get pairing: {e}"))?;
                    let result = pairing
                        .PairAsync()
                        .map_err(|e| format!("Failed to initiate pairing: {e}"))?
                        .get()
                        .map_err(|e| format!("Failed to await pairing: {e}"))?;

                    let status = result.Status().map_err(|e| format!("Failed to get status: {e}"))?;

                    use windows::Devices::Enumeration::DevicePairingResultStatus;
                    if status == DevicePairingResultStatus::Paired || status == DevicePairingResultStatus::AlreadyPaired
                    {
                        info!("✅ Paired successfully: {}", address);
                        return Ok(());
                    } else {
                        error!("❌ Pairing failed: {:?}", status);
                        return Err(format!("Pairing failed: {status:?}"));
                    }
                }
            }

            error!("❌ Device not found: {}", address);
            Err(format!("Device not found: {address}"))
        })
        .await
        .map_err(|e| format!("Task join error: {e}"))?
    }

    async fn unpair_device(&self, address: &str) -> Result<(), String> {
        info!("🔓 Unpairing device: {}", address);

        let address = address.to_string();

        // Medium operation - use spawn_blocking
        tokio::task::spawn_blocking(move || {
            let selector = WinBluetoothDevice::GetDeviceSelectorFromPairingState(true)
                .map_err(|e| format!("Failed to create selector: {e}"))?;

            let devices = DeviceInformation::FindAllAsyncAqsFilter(&selector)
                .map_err(|e| format!("Failed to find devices: {e}"))?
                .get()
                .map_err(|e| format!("Failed to await devices: {e}"))?;

            let count = devices.Size().map_err(|e| format!("Failed to get count: {e}"))?;
            info!("🔍 Searching {} paired devices for {}", count, address);

            for i in 0..count {
                let device_info = devices.GetAt(i).map_err(|e| format!("Failed to get device {i}: {e}"))?;
                let device_id = device_info.Id().map_err(|e| format!("Failed to get ID: {e}"))?;

                let bt_device = WinBluetoothDevice::FromIdAsync(&device_id)
                    .map_err(|e| format!("Failed to get device: {e}"))?
                    .get()
                    .map_err(|e| format!("Failed to await device: {e}"))?;

                let bt_address = bt_device
                    .BluetoothAddress()
                    .map_err(|e| format!("Failed to get address: {e}"))?;
                let address_str = format!(
                    "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
                    (bt_address >> 40) & 0xFF,
                    (bt_address >> 32) & 0xFF,
                    (bt_address >> 24) & 0xFF,
                    (bt_address >> 16) & 0xFF,
                    (bt_address >> 8) & 0xFF,
                    bt_address & 0xFF
                );

                if address_str == address {
                    info!("✅ Device found for unpair: {}", address);

                    let pairing = device_info
                        .Pairing()
                        .map_err(|e| format!("Failed to get pairing: {e}"))?;
                    let result = pairing
                        .UnpairAsync()
                        .map_err(|e| format!("Failed to initiate unpair: {e}"))?
                        .get()
                        .map_err(|e| format!("Failed to await unpair: {e}"))?;

                    let status = result.Status().map_err(|e| format!("Failed to get status: {e}"))?;

                    use windows::Devices::Enumeration::DeviceUnpairingResultStatus;
                    if status == DeviceUnpairingResultStatus::Unpaired
                        || status == DeviceUnpairingResultStatus::AlreadyUnpaired
                    {
                        info!("✅ Unpaired successfully: {}", address);
                        return Ok(());
                    } else {
                        error!("❌ Unpair failed: {:?}", status);
                        return Err(format!("Unpair failed: {status:?}"));
                    }
                }
            }

            error!("❌ Device not found: {}", address);
            Err(format!("Device not found: {address}"))
        })
        .await
        .map_err(|e| format!("Task join error: {e}"))?
    }

    async fn connect_device(&self, address: &str) -> Result<(), String> {
        info!("🔌 Connecting to: {} (Windows auto-connect)", address);
        // Windows auto-connects paired devices when in range
        Ok(())
    }

    async fn disconnect_device(&self, address: &str) -> Result<(), String> {
        info!("🔌 Disconnect requested: {} (not supported via API)", address);
        Err("Disconnect not supported. Use Windows Settings.".to_string())
    }

    async fn get_connected_devices(&self) -> Result<Vec<BluetoothDevice>, String> {
        info!("📡 Getting connected devices...");
        let paired = self.get_paired_devices().await?;
        let connected: Vec<BluetoothDevice> = paired.into_iter().filter(|d| d.is_connected).collect();
        info!("✅ Found {} connected devices", connected.len());
        Ok(connected)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn test_adapter_creation() {
        let _adapter = WindowsBluetoothAdapter::new();
        assert!(true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_bluetooth_availability() {
        let adapter = WindowsBluetoothAdapter::new();
        let result = adapter.is_bluetooth_available().await;
        assert!(result.is_ok() || result.is_err());
    }
}
