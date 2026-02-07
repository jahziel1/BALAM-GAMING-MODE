use serde::{Deserialize, Serialize};

/// FPS statistics collected from performance monitoring.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FPSStats {
    /// Current FPS (frames per second)
    pub current_fps: f32,
    /// Average FPS over last 1 second
    pub avg_fps_1s: f32,
    /// 1% low FPS (worst 1% of frames)
    pub fps_1_percent_low: f32,
    /// Frame time in milliseconds (1000/fps)
    pub frame_time_ms: f32,
}

impl FPSStats {
    /// Creates FPS stats with just current FPS (other values default to current).
    #[must_use]
    pub fn new(current_fps: f32) -> Self {
        Self {
            current_fps,
            avg_fps_1s: current_fps,
            fps_1_percent_low: current_fps,
            frame_time_ms: if current_fps > 0.0 { 1000.0 / current_fps } else { 0.0 },
        }
    }
}

/// Complete performance metrics (CPU, GPU, RAM, Temps, FPS).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PerformanceMetrics {
    /// CPU usage percentage (0-100, average across all cores)
    pub cpu_usage: f32,
    /// GPU usage percentage (0-100)
    pub gpu_usage: f32,
    /// RAM usage in GB
    pub ram_used_gb: f32,
    /// Total RAM in GB
    pub ram_total_gb: f32,
    /// GPU temperature in Celsius
    pub gpu_temp_c: Option<f32>,
    /// CPU temperature in Celsius (if available)
    pub cpu_temp_c: Option<f32>,
    /// GPU power draw in Watts
    pub gpu_power_w: Option<f32>,
    /// FPS stats (if monitoring a game)
    pub fps: Option<FPSStats>,
}

impl Default for PerformanceMetrics {
    fn default() -> Self {
        Self {
            cpu_usage: 0.0,
            gpu_usage: 0.0,
            ram_used_gb: 0.0,
            ram_total_gb: 0.0,
            gpu_temp_c: None,
            cpu_temp_c: None,
            gpu_power_w: None,
            fps: None,
        }
    }
}

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
