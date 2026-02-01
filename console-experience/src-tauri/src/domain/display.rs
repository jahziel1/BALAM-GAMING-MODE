use serde::{Deserialize, Serialize};

/// Domain entity representing display brightness configuration.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct BrightnessConfig {
    /// Current brightness level (0-100)
    pub level: u32,
}

impl BrightnessConfig {
    /// Creates a new brightness configuration with validation.
    pub fn new(level: u32) -> Result<Self, String> {
        if level > 100 {
            return Err(format!("Brightness {level} exceeds maximum 100"));
        }
        Ok(Self { level })
    }

    /// Clamps brightness to valid range.
    #[must_use]
    pub fn clamp(level: u32) -> u32 {
        level.min(100)
    }
}

/// Domain entity representing refresh rate configuration.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct RefreshRateConfig {
    /// Current refresh rate in Hz
    pub hz: u32,
}

impl RefreshRateConfig {
    /// Common refresh rates for gaming handhelds and monitors.
    pub const COMMON_RATES: &'static [u32] = &[40, 60, 90, 120, 144, 165, 240];

    /// Creates a new refresh rate configuration.
    pub fn new(hz: u32) -> Result<Self, String> {
        if hz == 0 {
            return Err("Refresh rate cannot be zero".to_string());
        }
        Ok(Self { hz })
    }

    /// Checks if refresh rate is a common gaming rate.
    #[must_use]
    pub fn is_common_rate(&self) -> bool {
        Self::COMMON_RATES.contains(&self.hz)
    }

    /// Gets the nearest common refresh rate.
    #[must_use]
    pub fn nearest_common_rate(&self) -> u32 {
        Self::COMMON_RATES
            .iter()
            .min_by_key(|&&rate| rate.abs_diff(self.hz))
            .copied()
            .unwrap_or(60)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_brightness_validation() {
        let valid = BrightnessConfig::new(50);
        assert!(valid.is_ok());
        assert_eq!(valid.unwrap().level, 50);

        let invalid = BrightnessConfig::new(150);
        assert!(invalid.is_err());
    }

    #[test]
    fn test_brightness_clamp() {
        assert_eq!(BrightnessConfig::clamp(50), 50);
        assert_eq!(BrightnessConfig::clamp(0), 0);
        assert_eq!(BrightnessConfig::clamp(150), 100);
    }

    #[test]
    fn test_refresh_rate_common() {
        let rate = RefreshRateConfig::new(60).unwrap();
        assert!(rate.is_common_rate());

        let rate = RefreshRateConfig::new(75).unwrap();
        assert!(!rate.is_common_rate());
    }

    #[test]
    fn test_nearest_common_rate() {
        let rate = RefreshRateConfig::new(75).unwrap();
        assert_eq!(rate.nearest_common_rate(), 60);

        let rate = RefreshRateConfig::new(100).unwrap();
        assert_eq!(rate.nearest_common_rate(), 90);
    }
}
