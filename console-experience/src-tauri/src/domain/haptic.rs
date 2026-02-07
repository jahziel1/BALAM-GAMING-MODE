/// Haptic feedback domain entities
///
/// Represents haptic feedback intensity levels based on Gilrs dual-motor best practices:
/// - Weak: High-frequency motor for sharp, buzzy feedback (navigation)
/// - Medium: Balanced dual-motor for confirmations
/// - Strong: Low-frequency motor for heavy rumble (events)

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum HapticIntensity {
    /// Light feedback for navigation (0.3 magnitude)
    Weak,
    /// Medium feedback for actions (0.5 magnitude)
    Medium,
    /// Strong feedback for important events (0.8 magnitude)
    Strong,
}

impl HapticIntensity {
    #[must_use]
    pub fn to_magnitude(&self) -> f32 {
        match self {
            Self::Weak => 0.3,
            Self::Medium => 0.5,
            Self::Strong => 0.8,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct HapticFeedback {
    pub intensity: HapticIntensity,
    pub duration_ms: u64,
}

impl HapticFeedback {
    #[must_use]
    pub fn new(intensity: HapticIntensity, duration_ms: u64) -> Self {
        Self {
            intensity,
            duration_ms: duration_ms.clamp(50, 2000), // Safety limits
        }
    }

    // Preset patterns
    #[must_use]
    pub fn navigation() -> Self {
        Self::new(HapticIntensity::Weak, 200)
    }

    #[must_use]
    pub fn action() -> Self {
        Self::new(HapticIntensity::Medium, 300)
    }

    #[must_use]
    pub fn event() -> Self {
        Self::new(HapticIntensity::Strong, 500)
    }
}
