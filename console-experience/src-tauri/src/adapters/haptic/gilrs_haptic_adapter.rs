/// Gilrs-based haptic feedback adapter
///
/// Implements force feedback using the Gilrs library for gamepad rumble.
/// Follows best practices from Gilrs documentation:
/// - Dual-motor patterns (strong + weak for texture)
/// - `EffectBuilder` API for robust cross-platform support
/// - Non-blocking async execution
use crate::domain::haptic::HapticFeedback;
use crate::ports::haptic_port::HapticPort;
use gilrs::{
    ff::{BaseEffect, BaseEffectType, EffectBuilder, Replay, Ticks},
    Gilrs,
};
use std::sync::{Arc, Mutex};
use tracing::{debug, error, warn};

/// Gilrs haptic adapter
///
/// Manages gamepad force feedback via Gilrs library.
/// Maintains Gilrs instance in Arc<Mutex<>> for thread-safe access.
pub struct GilrsHapticAdapter {
    /// Shared Gilrs instance for gamepad events
    gilrs: Arc<Mutex<Gilrs>>,
}

impl GilrsHapticAdapter {
    /// Create new Gilrs haptic adapter
    ///
    /// # Errors
    ///
    /// Returns an error if the Gilrs library fails to initialize.
    pub fn new() -> Result<Self, String> {
        match Gilrs::new() {
            Ok(gilrs) => {
                debug!("Gilrs haptic adapter initialized");
                Ok(Self {
                    gilrs: Arc::new(Mutex::new(gilrs)),
                })
            },
            Err(e) => {
                error!("Failed to initialize Gilrs: {}", e);
                Err(format!("Gilrs initialization failed: {e}"))
            },
        }
    }
}

#[async_trait::async_trait]
impl HapticPort for GilrsHapticAdapter {
    async fn trigger(&self, feedback: HapticFeedback) -> Result<(), String> {
        let gilrs = self.gilrs.clone();
        let magnitude = feedback.intensity.to_magnitude();
        let duration_ms = feedback.duration_ms;

        // Run on blocking thread pool to avoid blocking Tauri event loop
        tokio::task::spawn_blocking(move || {
            let mut gilrs = match gilrs.lock() {
                Ok(g) => g,
                Err(e) => {
                    error!("Failed to lock Gilrs mutex: {}", e);
                    return Err("Mutex lock failed".to_string());
                },
            };

            // Collect gamepad IDs that support force feedback
            // (Avoids borrow checker issue when calling builder.finish())
            let ff_gamepads: Vec<_> = gilrs
                .gamepads()
                .filter(|(_id, gp)| gp.is_ff_supported())
                .map(|(id, gp)| (id, gp.name().to_string()))
                .collect();

            if ff_gamepads.is_empty() {
                // No gamepads with force feedback available - graceful degradation
                debug!("No gamepads with force feedback connected");
                return Ok(()); // Not an error, just no haptic available
            }

            // Trigger haptic on all collected gamepads
            let mut triggered_count = 0;

            for (id, name) in ff_gamepads {
                // Convert magnitude (0.0-1.0) to u16 (0-65535)
                #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
                let strong_magnitude = (magnitude * 65535.0) as u16;
                #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
                let weak_magnitude = (magnitude * 0.7 * 65535.0) as u16; // 70% for texture

                // Clamp duration to u32 for Ticks API
                let duration = Ticks::from_ms(u32::try_from(duration_ms.min(u64::from(u32::MAX))).unwrap_or(u32::MAX));

                // Get gamepad reference for builder
                let gamepad = gilrs.gamepad(id);

                // Create dual-motor rumble effect
                // Strong motor: Low-frequency heavy rumble
                // Weak motor: High-frequency buzzy detail
                let mut builder = EffectBuilder::new();
                builder
                    .add_gamepad(&gamepad)
                    .add_effect(BaseEffect {
                        kind: BaseEffectType::Strong {
                            magnitude: strong_magnitude,
                        },
                        scheduling: Replay {
                            play_for: duration,
                            with_delay: Ticks::from_ms(0),
                            ..Default::default()
                        },
                        ..Default::default()
                    })
                    .add_effect(BaseEffect {
                        kind: BaseEffectType::Weak {
                            magnitude: weak_magnitude,
                        },
                        scheduling: Replay {
                            play_for: duration,
                            with_delay: Ticks::from_ms(0),
                            ..Default::default()
                        },
                        ..Default::default()
                    })
                    .repeat(gilrs::ff::Repeat::For(duration));

                // Finish building and play effect
                match builder.finish(&mut gilrs) {
                    Ok(effect) => match effect.play() {
                        Ok(()) => {
                            debug!(
                                "Haptic triggered on gamepad: {} (magnitude: {}, duration: {}ms)",
                                name, magnitude, duration_ms
                            );
                            triggered_count += 1;
                        },
                        Err(e) => {
                            warn!("Failed to play haptic on {}: {:?}", name, e);
                        },
                    },
                    Err(e) => {
                        warn!("Failed to build force feedback effect: {:?}", e);
                    },
                }
            }

            debug!("Haptic feedback triggered on {} gamepad(s)", triggered_count);
            Ok(())
        })
        .await
        .map_err(|e| format!("Task join error: {e}"))?
    }

    fn is_supported(&self) -> bool {
        match self.gilrs.lock() {
            Ok(gilrs) => {
                // Check if at least one connected gamepad supports force feedback
                gilrs.gamepads().any(|(_id, gamepad)| gamepad.is_ff_supported())
            },
            Err(e) => {
                error!("Failed to lock Gilrs mutex: {}", e);
                false
            },
        }
    }
}
