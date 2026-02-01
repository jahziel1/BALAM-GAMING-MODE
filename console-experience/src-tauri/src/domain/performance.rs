use serde::{Deserialize, Serialize};

/// Domain entity representing TDP (Thermal Design Power) configuration.
/// Pure business logic, no infrastructure dependencies.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct TDPConfig {
    /// Current TDP in watts
    pub watts: u32,
    /// Minimum TDP supported by hardware
    pub min_watts: u32,
    /// Maximum TDP supported by hardware
    pub max_watts: u32,
}

impl TDPConfig {
    /// Creates a new TDP configuration with validation.
    pub fn new(watts: u32, min_watts: u32, max_watts: u32) -> Result<Self, String> {
        if watts < min_watts || watts > max_watts {
            return Err(format!("TDP {watts} out of range [{min_watts}-{max_watts}]"));
        }
        Ok(Self {
            watts,
            min_watts,
            max_watts,
        })
    }

    /// Validates and clamps a TDP value to hardware limits.
    #[must_use]
    pub fn clamp(&self, watts: u32) -> u32 {
        watts.clamp(self.min_watts, self.max_watts)
    }
}

/// Predefined performance profiles for common scenarios.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum PerformanceProfile {
    /// Battery saver mode (minimum TDP)
    Eco,
    /// Balanced performance and battery
    Balanced,
    /// Maximum performance
    Performance,
    /// User-defined custom TDP
    Custom(u32),
}

impl PerformanceProfile {
    /// Converts profile to TDP watts based on hardware capabilities.
    #[must_use]
    pub fn to_watts(&self, config: &TDPConfig) -> u32 {
        match self {
            Self::Eco => config.min_watts,
            Self::Balanced => u32::midpoint(config.min_watts, config.max_watts),
            Self::Performance => config.max_watts,
            Self::Custom(watts) => config.clamp(*watts),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tdp_config_validation() {
        let config = TDPConfig::new(15, 5, 30);
        assert!(config.is_ok());

        let invalid = TDPConfig::new(35, 5, 30);
        assert!(invalid.is_err());
    }

    #[test]
    fn test_tdp_clamp() {
        let config = TDPConfig::new(15, 5, 30).unwrap();
        assert_eq!(config.clamp(3), 5);
        assert_eq!(config.clamp(20), 20);
        assert_eq!(config.clamp(35), 30);
    }

    #[test]
    fn test_performance_profiles() {
        let config = TDPConfig::new(15, 5, 30).unwrap();

        assert_eq!(PerformanceProfile::Eco.to_watts(&config), 5);
        assert_eq!(PerformanceProfile::Balanced.to_watts(&config), 17);
        assert_eq!(PerformanceProfile::Performance.to_watts(&config), 30);
        assert_eq!(PerformanceProfile::Custom(20).to_watts(&config), 20);
        assert_eq!(PerformanceProfile::Custom(40).to_watts(&config), 30);
    }
}
