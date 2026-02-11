// =============================================================================
// CENTRALIZED ERROR EMISSION
// =============================================================================

use tauri::{AppHandle, Emitter};
use tracing::error;

use crate::domain::GameLaunchError;

/// Emit game launch error event to frontend
///
/// Centralizes error emission logic following DRY principle.
/// All watchdogs use this helper to maintain consistency.
pub fn emit_launch_error(app_handle: &AppHandle, error: GameLaunchError) {
    error!(
        "Game launch failed: {} - {} (Reason: {:?})",
        error.game_title, error.store, error.reason
    );

    // Emit to frontend for UI notification
    if let Err(e) = app_handle.emit("game-launch-failed", &error) {
        error!("Failed to emit game-launch-failed event: {}", e);
    }
}
