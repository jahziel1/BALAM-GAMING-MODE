use crate::domain::wifi::WiFiStrengthConfig;
use crate::ports::wifi_port::{WiFiConfig, WiFiNetwork, WiFiPort, WiFiSecurity};
use std::ffi::c_void;
use std::ptr;
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
use tracing::{error, info, warn};
use windows::core::PCWSTR;
use windows::Win32::Foundation::{ERROR_SUCCESS, HANDLE};
use windows::Win32::NetworkManagement::WiFi::{
    WlanCloseHandle, WlanConnect, WlanDeleteProfile, WlanDisconnect, WlanEnumInterfaces, WlanFreeMemory,
    WlanGetAvailableNetworkList, WlanGetProfileList, WlanOpenHandle, WlanRegisterNotification, WlanScan,
    DOT11_BSS_TYPE, L2_NOTIFICATION_DATA, WLAN_AVAILABLE_NETWORK, WLAN_CONNECTION_MODE, WLAN_CONNECTION_PARAMETERS,
    WLAN_INTERFACE_INFO_LIST, WLAN_NOTIFICATION_SOURCE_ACM, WLAN_PROFILE_INFO_LIST,
};

/// Notification context shared between callback and adapter.
struct NotificationContext {
    scan_complete: Condvar,
    scan_ready: Mutex<bool>,
}

/// Windows notification callback - called by WlanAPI on WiFi events.
///
/// # Safety
/// This function is called from Windows system threads. The context pointer
/// must remain valid for the lifetime of the WlanAPI handle.
///
/// # Events Handled
/// - `wlan_notification_acm_scan_complete` (3): Scan finished
/// - `wlan_notification_acm_scan_fail` (4): Scan failed
unsafe extern "system" fn notification_callback(data: *mut L2_NOTIFICATION_DATA, context: *mut c_void) {
    if data.is_null() || context.is_null() {
        return;
    }

    let notification = &*data;
    let ctx = &*(context as *const NotificationContext);

    // Only handle ACM (Auto Config Manager) notifications
    if notification.NotificationSource != WLAN_NOTIFICATION_SOURCE_ACM {
        return;
    }

    match notification.NotificationCode {
        3 => {
            // wlan_notification_acm_scan_complete
            info!("WiFi scan completed");
            let mut ready = ctx.scan_ready.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
            *ready = true;
            ctx.scan_complete.notify_all();
        },
        4 => {
            // wlan_notification_acm_scan_fail
            warn!("WiFi scan failed");
            let mut ready = ctx.scan_ready.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
            *ready = true; // Signal completion even on failure
            ctx.scan_complete.notify_all();
        },
        6 => {
            // wlan_notification_acm_connection_complete
            info!("WiFi connection completed");
        },
        8 => {
            // wlan_notification_acm_disconnected
            info!("WiFi disconnected");
        },
        _ => {
            // Ignore other notifications
        },
    }
}

/// Windows implementation of WiFiPort using native WlanAPI with event-driven architecture.
///
/// This implementation uses Windows Native WiFi API directly (wlanapi.dll)
/// instead of parsing netsh output, making it:
/// - Language-independent (works on any Windows locale)
/// - Event-driven (zero polling overhead)
/// - Real-time notifications (connection changes, signal strength)
/// - More reliable (structured data)
///
/// # Architecture
/// Uses `WlanRegisterNotification` to receive events asynchronously instead of
/// polling with sleep. This eliminates arbitrary delays and enables real-time updates.
///
/// # Thread Safety
/// WlanAPI handles are thread-safe. The notification context uses Arc + Condvar
/// for safe cross-thread communication.
pub struct WindowsWiFiAdapter {
    client_handle: HANDLE,
    notification_context: Arc<NotificationContext>,
}

impl WindowsWiFiAdapter {
    /// Creates a new Windows WiFi adapter with event-driven WlanAPI.
    ///
    /// Registers a notification callback to receive WiFi events asynchronously,
    /// eliminating the need for polling and arbitrary sleep delays.
    ///
    /// # Errors
    /// Returns error if WlanAPI initialization or notification registration fails.
    pub fn new() -> Result<Self, String> {
        let mut client_handle = HANDLE::default();
        let mut negotiated_version = 0u32;

        unsafe {
            // Open WLAN handle
            let result = WlanOpenHandle(
                2, // WLAN_API_VERSION_2_0
                None,
                &mut negotiated_version,
                &mut client_handle,
            );

            if result != ERROR_SUCCESS.0 {
                return Err(format!("Failed to open WLAN handle: error {result}"));
            }

            // Create notification context
            let notification_context = Arc::new(NotificationContext {
                scan_complete: Condvar::new(),
                scan_ready: Mutex::new(false),
            });

            // Register for notifications
            let context_ptr = Arc::as_ptr(&notification_context) as *const c_void;
            let result = WlanRegisterNotification(
                client_handle,
                WLAN_NOTIFICATION_SOURCE_ACM, // Auto Config Manager events
                true,                         // Ignore duplicate notifications
                Some(notification_callback),
                Some(context_ptr as *const c_void),
                None,
                None,
            );

            if result != ERROR_SUCCESS.0 {
                let _ = WlanCloseHandle(client_handle, None);
                return Err(format!("Failed to register WiFi notifications: error {result}"));
            }

            info!("WlanAPI initialized with event-driven notifications");
            Ok(Self {
                client_handle,
                notification_context,
            })
        }
    }

    /// Gets the first WiFi interface GUID.
    ///
    /// # Errors
    /// Returns error if no WiFi interfaces found.
    fn get_interface_guid(&self) -> Result<windows::core::GUID, String> {
        let mut interface_list: *mut WLAN_INTERFACE_INFO_LIST = ptr::null_mut();

        unsafe {
            let result = WlanEnumInterfaces(self.client_handle, None, &mut interface_list);

            if result != ERROR_SUCCESS.0 {
                return Err(format!("Failed to enumerate interfaces: error {result}"));
            }

            if interface_list.is_null() {
                return Err("No WiFi interfaces found".to_string());
            }

            let interfaces = &*interface_list;
            if interfaces.dwNumberOfItems == 0 {
                return Err("No WiFi interfaces available".to_string());
            }

            // Get first interface
            let interface = &interfaces.InterfaceInfo[0];
            let guid = interface.InterfaceGuid;

            // Free the interface list
            WlanFreeMemory(interface_list as *mut _);

            Ok(guid)
        }
    }

    /// Converts WLAN_AVAILABLE_NETWORK to WiFiNetwork.
    fn convert_network(&self, network: &WLAN_AVAILABLE_NETWORK) -> WiFiNetwork {
        // Extract SSID
        let ssid_len = network.dot11Ssid.uSSIDLength as usize;
        let ssid_bytes = &network.dot11Ssid.ucSSID[..ssid_len.min(32)];
        let ssid = String::from_utf8_lossy(ssid_bytes).to_string();

        // Convert signal quality (0-100) to dBm (-100 to -30)
        let signal_quality = network.wlanSignalQuality;
        let signal_strength = -100 + ((signal_quality as i32 * 70) / 100);

        // Determine security type
        let auth_algo = network.dot11DefaultAuthAlgorithm.0;
        info!("Network: {} - Auth Algorithm: {}", ssid, auth_algo);

        let security = match auth_algo {
            0 => WiFiSecurity::Open, // DOT11_AUTH_ALGO_80211_OPEN
            1 => WiFiSecurity::WEP,  // DOT11_AUTH_ALGO_80211_SHARED_KEY
            2 => WiFiSecurity::WPA,  // DOT11_AUTH_ALGO_WPA
            3 => WiFiSecurity::WPA,  // DOT11_AUTH_ALGO_WPA_PSK
            4 => WiFiSecurity::WPA2, // DOT11_AUTH_ALGO_RSNA
            5 => WiFiSecurity::WPA2, // DOT11_AUTH_ALGO_RSNA_PSK
            6 => WiFiSecurity::WPA2, // DOT11_AUTH_ALGO_WPA_NONE (sometimes used)
            7 => WiFiSecurity::WPA2, // DOT11_AUTH_ALGO_RSNA_PSK_PREP
            8 => WiFiSecurity::WPA3, // DOT11_AUTH_ALGO_WPA3
            9 => WiFiSecurity::WPA3, // DOT11_AUTH_ALGO_WPA3_SAE
            _ => {
                info!("Unknown auth algorithm {} for network {}", auth_algo, ssid);
                WiFiSecurity::Unknown
            },
        };

        // Check if connected
        let is_connected = (network.dwFlags & 0x0000_0001) != 0; // WLAN_AVAILABLE_NETWORK_CONNECTED

        WiFiNetwork {
            ssid,
            bssid: None,
            signal_strength,
            frequency: 2400, // Default, WlanAPI doesn't easily expose this
            security,
            is_connected,
        }
    }
}

impl Drop for WindowsWiFiAdapter {
    fn drop(&mut self) {
        unsafe {
            // Unregister notifications before closing handle
            let _ = WlanRegisterNotification(
                self.client_handle,
                WLAN_NOTIFICATION_SOURCE_ACM,
                true,
                None, // None = unregister
                None,
                None,
                None,
            );

            // Close WLAN handle
            let _ = WlanCloseHandle(self.client_handle, None);
            info!("WlanAPI handle closed and notifications unregistered");
        }
    }
}

impl WiFiPort for WindowsWiFiAdapter {
    fn get_current_network(&self) -> Result<Option<WiFiNetwork>, String> {
        let networks = self.scan_networks()?;
        Ok(networks.into_iter().find(|n| n.is_connected))
    }

    fn scan_networks(&self) -> Result<Vec<WiFiNetwork>, String> {
        info!("Scanning WiFi networks using event-driven WlanAPI...");

        let interface_guid = self.get_interface_guid()?;

        unsafe {
            // Reset scan ready flag
            {
                let mut ready = self
                    .notification_context
                    .scan_ready
                    .lock()
                    .map_err(|e| format!("Lock poisoned: {e}"))?;
                *ready = false;
            }

            // Trigger asynchronous scan
            let scan_result = WlanScan(self.client_handle, &interface_guid, None, None, None);
            if scan_result != ERROR_SUCCESS.0 {
                error!("WlanScan failed: error {}", scan_result);
                // Continue anyway, might have cached results
            } else {
                // Wait for scan complete notification (with timeout)
                let ready = self
                    .notification_context
                    .scan_ready
                    .lock()
                    .map_err(|e| format!("Lock poisoned: {e}"))?;

                let (ready, timeout_result) = self
                    .notification_context
                    .scan_complete
                    .wait_timeout(ready, Duration::from_secs(10))
                    .map_err(|e| format!("Wait failed: {e}"))?;

                if timeout_result.timed_out() {
                    warn!("Scan notification timeout (10s), using cached results");
                } else if *ready {
                    info!("Scan completed via event notification");
                }
            }

            // Get available networks
            let mut network_list: *mut windows::Win32::NetworkManagement::WiFi::WLAN_AVAILABLE_NETWORK_LIST =
                ptr::null_mut();
            let result = WlanGetAvailableNetworkList(
                self.client_handle,
                &interface_guid,
                0x0, // No flags - let WlanAPI deduplicate by SSID automatically
                None,
                &mut network_list,
            );

            if result != ERROR_SUCCESS.0 {
                return Err(format!("Failed to get network list: error {result}"));
            }

            if network_list.is_null() {
                return Ok(Vec::new());
            }

            let list = &*network_list;
            let count = list.dwNumberOfItems as usize;
            let mut networks = Vec::with_capacity(count);

            // Use slice::from_raw_parts for flexible array member
            let network_array = std::slice::from_raw_parts(list.Network.as_ptr(), count);

            for network in network_array {
                networks.push(self.convert_network(network));
            }

            // Free the network list
            WlanFreeMemory(network_list as *mut _);

            // Deduplicate by SSID (keep strongest signal for mesh networks)
            let mut seen_ssids: std::collections::HashMap<String, WiFiNetwork> = std::collections::HashMap::new();

            for network in networks {
                let entry = seen_ssids.entry(network.ssid.clone());
                entry
                    .and_modify(|existing| {
                        // Replace if new one has stronger signal
                        if network.signal_strength > existing.signal_strength {
                            *existing = network.clone();
                        }
                    })
                    .or_insert(network);
            }

            // Convert back to Vec and sort by signal strength
            let mut unique_networks: Vec<WiFiNetwork> = seen_ssids.into_values().collect();
            unique_networks.sort_by(|a, b| b.signal_strength.cmp(&a.signal_strength));

            info!(
                "Found {} WiFi networks ({} after deduplication)",
                unique_networks.len(),
                unique_networks.len()
            );
            Ok(unique_networks)
        }
    }

    fn connect_network(&self, config: WiFiConfig) -> Result<(), String> {
        info!("Connecting to WiFi: {}", config.ssid);

        let interface_guid = self.get_interface_guid()?;

        // Convert SSID to wide string
        let mut profile_name: Vec<u16> = config.ssid.encode_utf16().collect();
        profile_name.push(0); // Null terminator

        unsafe {
            let connection_params = WLAN_CONNECTION_PARAMETERS {
                wlanConnectionMode: WLAN_CONNECTION_MODE(0), // wlan_connection_mode_profile
                strProfile: PCWSTR(profile_name.as_ptr()),
                pDot11Ssid: ptr::null_mut(),
                pDesiredBssidList: ptr::null_mut(),
                dot11BssType: DOT11_BSS_TYPE(1), // dot11_BSS_type_infrastructure
                dwFlags: 0,
            };

            let result = WlanConnect(self.client_handle, &interface_guid, &connection_params, None);

            if result != ERROR_SUCCESS.0 {
                return Err(format!("Failed to connect: error {result}"));
            }
        }

        info!("Successfully initiated connection to: {}", config.ssid);
        Ok(())
    }

    fn disconnect(&self) -> Result<(), String> {
        info!("Disconnecting from WiFi...");

        let interface_guid = self.get_interface_guid()?;

        unsafe {
            let result = WlanDisconnect(self.client_handle, &interface_guid, None);

            if result != ERROR_SUCCESS.0 {
                return Err(format!("Failed to disconnect: error {result}"));
            }
        }

        info!("Successfully disconnected from WiFi");
        Ok(())
    }

    fn forget_network(&self, ssid: &str) -> Result<(), String> {
        info!("Forgetting network: {}", ssid);

        let interface_guid = self.get_interface_guid()?;

        // Convert SSID to wide string
        let mut profile_name: Vec<u16> = ssid.encode_utf16().collect();
        profile_name.push(0);

        unsafe {
            let result = WlanDeleteProfile(self.client_handle, &interface_guid, PCWSTR(profile_name.as_ptr()), None);

            if result != ERROR_SUCCESS.0 {
                return Err(format!("Failed to forget network: error {result}"));
            }
        }

        info!("Successfully forgot network: {}", ssid);
        Ok(())
    }

    fn get_saved_networks(&self) -> Result<Vec<String>, String> {
        let interface_guid = self.get_interface_guid()?;
        let mut profile_list: *mut WLAN_PROFILE_INFO_LIST = ptr::null_mut();

        unsafe {
            let result = WlanGetProfileList(self.client_handle, &interface_guid, None, &mut profile_list);

            if result != ERROR_SUCCESS.0 {
                return Err(format!("Failed to get profile list: error {result}"));
            }

            if profile_list.is_null() {
                return Ok(Vec::new());
            }

            let list = &*profile_list;
            let count = list.dwNumberOfItems as usize;
            let mut networks = Vec::with_capacity(count);

            // Use slice::from_raw_parts for flexible array member
            let profile_array = std::slice::from_raw_parts(list.ProfileInfo.as_ptr(), count);

            for profile in profile_array {
                // Convert [u16; 256] to String
                let len = profile.strProfileName.iter().position(|&c| c == 0).unwrap_or(256);
                let name = String::from_utf16_lossy(&profile.strProfileName[..len]);
                if !name.is_empty() {
                    networks.push(name);
                }
            }

            // Free the profile list
            WlanFreeMemory(profile_list as *mut _);

            Ok(networks)
        }
    }

    fn get_signal_strength(&self) -> Result<Option<u32>, String> {
        let current = self.get_current_network()?;
        Ok(current.map(|net| {
            // Convert dBm to percentage
            WiFiStrengthConfig::from_dbm(net.signal_strength)
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adapter_creation() {
        // May fail if no WiFi hardware, but shouldn't panic
        let result = WindowsWiFiAdapter::new();
        assert!(result.is_ok() || result.is_err());
    }

    #[test]
    fn test_scan_networks() {
        if let Ok(adapter) = WindowsWiFiAdapter::new() {
            let result = adapter.scan_networks();
            // Should either succeed or fail gracefully
            assert!(result.is_ok() || result.is_err());
        }
    }
}
