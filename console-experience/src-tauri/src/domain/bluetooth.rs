use serde::{Deserialize, Serialize};

/// Domain entity representing Bluetooth signal strength configuration.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct BluetoothSignalConfig {
    /// Signal strength percentage (0-100)
    pub strength: u32,
}

impl BluetoothSignalConfig {
    /// Creates a new signal strength configuration with validation.
    ///
    /// # Errors
    /// Returns error if strength > 100.
    pub fn new(strength: u32) -> Result<Self, String> {
        if strength > 100 {
            return Err(format!("Signal strength {strength} exceeds maximum 100"));
        }
        Ok(Self { strength })
    }

    /// Clamps strength to valid range (0-100).
    #[must_use]
    pub fn clamp(strength: u32) -> u32 {
        strength.min(100)
    }

    /// Converts RSSI (Received Signal Strength Indicator) to percentage.
    ///
    /// Typical Bluetooth range: -100 dBm (0%) to -30 dBm (100%).
    #[must_use]
    pub fn from_rssi(rssi: i32) -> u32 {
        let normalized = ((rssi + 100) * 100) / 70;
        normalized.clamp(0, 100).cast_unsigned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strength_validation() {
        assert!(BluetoothSignalConfig::new(50).is_ok());
        assert!(BluetoothSignalConfig::new(150).is_err());
    }

    #[test]
    fn test_strength_clamp() {
        assert_eq!(BluetoothSignalConfig::clamp(50), 50);
        assert_eq!(BluetoothSignalConfig::clamp(150), 100);
    }

    #[test]
    fn test_rssi_conversion() {
        assert_eq!(BluetoothSignalConfig::from_rssi(-100), 0);
        assert_eq!(BluetoothSignalConfig::from_rssi(-65), 50);
        assert_eq!(BluetoothSignalConfig::from_rssi(-30), 100);
    }
}
