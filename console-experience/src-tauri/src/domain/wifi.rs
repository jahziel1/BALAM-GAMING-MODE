use serde::{Deserialize, Serialize};

/// Domain entity representing `WiFi` signal strength configuration.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct WiFiStrengthConfig {
    /// Signal strength percentage (0-100)
    pub strength: u32,
}

impl WiFiStrengthConfig {
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

    /// Converts dBm (-100 to 0) to percentage (0-100).
    ///
    /// Typical `WiFi` range: -100 dBm (0%) to -30 dBm (100%).
    #[must_use]
    pub fn from_dbm(dbm: i32) -> u32 {
        let normalized = ((dbm + 100) * 100) / 70;
        normalized.clamp(0, 100) as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strength_validation() {
        assert!(WiFiStrengthConfig::new(50).is_ok());
        assert!(WiFiStrengthConfig::new(150).is_err());
    }

    #[test]
    fn test_strength_clamp() {
        assert_eq!(WiFiStrengthConfig::clamp(50), 50);
        assert_eq!(WiFiStrengthConfig::clamp(150), 100);
    }

    #[test]
    fn test_dbm_conversion() {
        assert_eq!(WiFiStrengthConfig::from_dbm(-100), 0);
        assert_eq!(WiFiStrengthConfig::from_dbm(-65), 50);
        assert_eq!(WiFiStrengthConfig::from_dbm(-30), 100);
    }
}
