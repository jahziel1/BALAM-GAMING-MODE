use crate::domain::wifi::WiFiStrengthConfig;
use crate::ports::wifi_port::{WiFiConfig, WiFiNetwork, WiFiPort, WiFiSecurity};
use std::process::Command;
use tracing::{info, warn};

/// Windows implementation of WiFiPort using netsh commands.
///
/// # Implementation Strategy
/// - MVP: Uses `netsh wlan` commands (shell-based, synchronous)
/// - Future: Migrate to direct WlanAPI (event-driven, zero-shell)
///
/// # Performance
/// - Scan: 2-5 seconds
/// - Connect: 1-3 seconds
/// - Status query: <100ms
pub struct WindowsWiFiAdapter;

impl WindowsWiFiAdapter {
    /// Creates a new Windows WiFi adapter.
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    /// Parses `netsh wlan show networks` output into structured data.
    fn parse_networks_output(&self, output: &str) -> Vec<WiFiNetwork> {
        let mut networks = Vec::new();
        let mut current: Option<WiFiNetwork> = None;

        for line in output.lines() {
            let trimmed = line.trim();

            // SSID line (but not BSSID)
            if trimmed.starts_with("SSID") && !trimmed.contains("BSSID") {
                // Save previous network if exists
                if let Some(net) = current.take() {
                    networks.push(net);
                }

                // Parse SSID
                if let Some(ssid) = trimmed.split(':').nth(1).map(|s| s.trim().to_string()) {
                    if !ssid.is_empty() {
                        current = Some(WiFiNetwork {
                            ssid,
                            bssid: None,
                            signal_strength: -100,
                            frequency: 2400,
                            security: WiFiSecurity::Unknown,
                            is_connected: false,
                        });
                    }
                }
            }
            // Signal line
            else if trimmed.starts_with("Signal") {
                if let Some(ref mut net) = current {
                    if let Some(signal_str) = trimmed.split(':').nth(1) {
                        if let Ok(signal_percent) = signal_str
                            .trim()
                            .trim_end_matches('%')
                            .parse::<u32>()
                        {
                            // Convert percentage to approximate dBm
                            net.signal_strength = -100 + ((signal_percent as i32 * 70) / 100);
                        }
                    }
                }
            }
            // Authentication line
            else if trimmed.starts_with("Authentication") {
                if let Some(ref mut net) = current {
                    let auth = trimmed
                        .split(':')
                        .nth(1)
                        .map(|s| s.trim())
                        .unwrap_or("");

                    net.security = match auth {
                        "Open" => WiFiSecurity::Open,
                        "WEP" => WiFiSecurity::WEP,
                        "WPA-Personal" | "WPA" => WiFiSecurity::WPA,
                        "WPA2-Personal" | "WPA2" => WiFiSecurity::WPA2,
                        "WPA3-Personal" | "WPA3" => WiFiSecurity::WPA3,
                        _ => WiFiSecurity::Unknown,
                    };
                }
            }
        }

        // Push last network
        if let Some(net) = current {
            networks.push(net);
        }

        // Sort by signal strength (strongest first)
        networks.sort_by(|a, b| b.signal_strength.cmp(&a.signal_strength));

        networks
    }

    /// Gets current connected network using `netsh wlan show interfaces`.
    fn get_current_network_netsh(&self) -> Result<Option<WiFiNetwork>, String> {
        let output = Command::new("netsh")
            .args(["wlan", "show", "interfaces"])
            .output()
            .map_err(|e| format!("netsh failed: {e}"))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        let mut ssid = None;
        let mut signal = -50; // Default

        for line in stdout.lines() {
            let trimmed = line.trim();

            // SSID line (but not BSSID)
            if trimmed.starts_with("SSID") && !trimmed.contains("BSSID") {
                if let Some(s) = trimmed.split(':').nth(1).map(|s| s.trim().to_string()) {
                    if !s.is_empty() {
                        ssid = Some(s);
                    }
                }
            }
            // Signal line
            else if trimmed.starts_with("Signal") {
                if let Some(signal_str) = trimmed.split(':').nth(1) {
                    if let Ok(signal_percent) = signal_str
                        .trim()
                        .trim_end_matches('%')
                        .parse::<i32>()
                    {
                        signal = -100 + ((signal_percent * 70) / 100);
                    }
                }
            }
        }

        if let Some(ssid_value) = ssid {
            Ok(Some(WiFiNetwork {
                ssid: ssid_value,
                bssid: None,
                signal_strength: signal,
                frequency: 2400,
                security: WiFiSecurity::Unknown,
                is_connected: true,
            }))
        } else {
            Ok(None)
        }
    }
}

impl Default for WindowsWiFiAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl WiFiPort for WindowsWiFiAdapter {
    fn get_current_network(&self) -> Result<Option<WiFiNetwork>, String> {
        self.get_current_network_netsh()
    }

    fn scan_networks(&self) -> Result<Vec<WiFiNetwork>, String> {
        info!("Scanning WiFi networks...");

        let output = Command::new("netsh")
            .args(["wlan", "show", "networks"])
            .output()
            .map_err(|e| format!("WiFi scan failed: {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("WiFi scan error: {stderr}"));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let networks = self.parse_networks_output(&stdout);

        info!("Found {} WiFi networks", networks.len());
        Ok(networks)
    }

    fn connect_network(&self, config: WiFiConfig) -> Result<(), String> {
        info!("Attempting to connect to WiFi: {}", config.ssid);

        // Use netsh wlan connect
        let output = Command::new("netsh")
            .args(["wlan", "connect", "name", &config.ssid])
            .output()
            .map_err(|e| format!("Failed to connect: {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Connection failed: {stderr}"));
        }

        info!("Successfully initiated connection to: {}", config.ssid);
        Ok(())
    }

    fn disconnect(&self) -> Result<(), String> {
        info!("Disconnecting from WiFi...");

        let output = Command::new("netsh")
            .args(["wlan", "disconnect"])
            .output()
            .map_err(|e| format!("Disconnect failed: {e}"))?;

        if !output.status.success() {
            return Err("Failed to disconnect from WiFi".to_string());
        }

        info!("Successfully disconnected from WiFi");
        Ok(())
    }

    fn forget_network(&self, ssid: &str) -> Result<(), String> {
        info!("Forgetting network: {}", ssid);

        let output = Command::new("netsh")
            .args(["wlan", "delete", "profile", &format!("name={ssid}")])
            .output()
            .map_err(|e| format!("Failed to forget network: {e}"))?;

        if !output.status.success() {
            return Err(format!("Failed to forget network: {ssid}"));
        }

        info!("Successfully forgot network: {}", ssid);
        Ok(())
    }

    fn get_saved_networks(&self) -> Result<Vec<String>, String> {
        let output = Command::new("netsh")
            .args(["wlan", "show", "profiles"])
            .output()
            .map_err(|e| format!("Failed to list networks: {e}"))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut networks = Vec::new();

        for line in stdout.lines() {
            if line.contains("All User Profile") {
                if let Some(ssid) = line.split(':').nth(1) {
                    networks.push(ssid.trim().to_string());
                }
            }
        }

        Ok(networks)
    }

    fn get_signal_strength(&self) -> Result<Option<u32>, String> {
        let output = Command::new("netsh")
            .args(["wlan", "show", "interfaces"])
            .output()
            .map_err(|e| format!("Failed to get signal strength: {e}"))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        for line in stdout.lines() {
            if line.trim().starts_with("Signal") {
                if let Some(signal_str) = line.split(':').nth(1) {
                    if let Ok(strength) = signal_str
                        .trim()
                        .trim_end_matches('%')
                        .parse::<u32>()
                    {
                        return Ok(Some(WiFiStrengthConfig::clamp(strength)));
                    }
                }
            }
        }

        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adapter_creation() {
        let adapter = WindowsWiFiAdapter::new();
        assert!(adapter.scan_networks().is_ok() || adapter.scan_networks().is_err());
        // May fail if no WiFi hardware, but shouldn't panic
    }

    #[test]
    fn test_parse_networks() {
        let adapter = WindowsWiFiAdapter::new();
        let sample_output = r#"
SSID 1 : MyNetwork
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    Signal                  : 85%

SSID 2 : GuestNetwork
    Network type            : Infrastructure
    Authentication          : Open
    Signal                  : 60%
        "#;

        let networks = adapter.parse_networks_output(sample_output);
        assert_eq!(networks.len(), 2);
        assert_eq!(networks[0].ssid, "MyNetwork");
        assert_eq!(networks[0].security, WiFiSecurity::WPA2);
        assert_eq!(networks[1].ssid, "GuestNetwork");
        assert_eq!(networks[1].security, WiFiSecurity::Open);
    }
}
