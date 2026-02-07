/// Haptic feedback port interface
///
/// Defines the contract for haptic feedback implementations.
/// Follows hexagonal architecture pattern to decouple domain logic from hardware specifics.
use crate::domain::haptic::HapticFeedback;

/// Port trait for haptic feedback operations
///
/// Implementations handle platform-specific rumble/vibration hardware.
/// Currently targets gamepad controllers via Gilrs library.
#[async_trait::async_trait]
pub trait HapticPort: Send + Sync {
    /// Trigger haptic feedback on available devices
    ///
    /// # Arguments
    /// * `feedback` - Haptic pattern with intensity and duration
    ///
    /// # Returns
    /// * `Ok(())` - Feedback triggered successfully
    /// * `Err(String)` - Hardware error or no connected devices
    ///
    /// # Notes
    /// - Non-blocking: Returns immediately, rumble runs in background
    /// - Multi-device: Triggers on all connected gamepads
    /// - Fails silently if no gamepads connected (graceful degradation)
    async fn trigger(&self, feedback: HapticFeedback) -> Result<(), String>;

    /// Check if haptic feedback is supported
    ///
    /// # Returns
    /// * `true` - At least one gamepad with force feedback connected
    /// * `false` - No compatible devices or hardware unsupported
    ///
    /// # Usage
    /// Use this to conditionally enable haptic features in UI settings.
    fn is_supported(&self) -> bool;
}
