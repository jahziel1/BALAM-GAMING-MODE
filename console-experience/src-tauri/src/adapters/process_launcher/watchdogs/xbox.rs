// =============================================================================
// XBOX EXPLORER FALLBACK WATCHDOG
// =============================================================================

use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::System;
use tauri::{AppHandle, Emitter};
use tracing::{error, info, warn};

use super::super::constants::{POLLING_INTERVAL_MS, XBOX_EXPLORER_TIMEOUT_SECONDS};
use super::super::error_handler::emit_launch_error;
use super::super::window_manager::restore_window;
use crate::application::ActiveGamesTracker;
use crate::domain::GameLaunchError;

/// Xbox Explorer Fallback Watchdog
///
/// Monitors Xbox/UWP game launched via explorer.exe fallback.
/// Since we don't have a PID, we use a timeout-based approach with process scanning.
pub fn start_xbox_explorer_watchdog(
    app_user_model_id: String,
    app_handle: AppHandle,
    tracker: Arc<ActiveGamesTracker>,
    game_id: String,
) {
    thread::spawn(move || {
        #[derive(serde::Serialize, Clone)]
        struct GameEndedPayload {
            game_id: String,
            play_time_seconds: u64,
        }

        info!(
            ">>> Xbox Explorer Watchdog STARTED for: {} (timeout: {}s, polling: {}ms) <<<",
            app_user_model_id, XBOX_EXPLORER_TIMEOUT_SECONDS, POLLING_INTERVAL_MS
        );

        let mut attempts = 0;
        let mut game_detected = false;
        let mut start_time: Option<Instant> = None;
        let max_attempts = (XBOX_EXPLORER_TIMEOUT_SECONDS * 1000) / POLLING_INTERVAL_MS;

        // Extract package family name from AppUserModelId
        // Format: "Microsoft.MinecraftUWP_8wekyb3d8bbwe!App" -> "Microsoft.MinecraftUWP"
        let package_name = app_user_model_id
            .split('!')
            .next()
            .unwrap_or(&app_user_model_id)
            .split('_')
            .next()
            .unwrap_or(&app_user_model_id);

        loop {
            thread::sleep(Duration::from_millis(POLLING_INTERVAL_MS));

            // Scan for processes matching the package name
            let mut sys = System::new_all();
            sys.refresh_all();

            let found = sys.processes().values().any(|process| {
                if let Some(exe) = process.exe() {
                    let exe_str = exe.to_string_lossy().to_lowercase();
                    exe_str.contains(&package_name.to_lowercase())
                } else {
                    false
                }
            });

            if found {
                if !game_detected {
                    info!("Xbox game process detected! Monitoring...");
                    game_detected = true;
                    start_time = Some(Instant::now()); // Record start time
                }
            } else if game_detected {
                // Game was running, now stopped
                info!("Xbox game process ended. Restoring window.");

                // Calculate play time
                let play_time_seconds = if let Some(start) = start_time {
                    start.elapsed().as_secs()
                } else {
                    0
                };

                info!(
                    "⏱️ Xbox game session duration: {}s ({:.1}min)",
                    play_time_seconds,
                    play_time_seconds as f64 / 60.0
                );

                tracker.unregister(&game_id);

                // Emit event to frontend with play time
                let payload = GameEndedPayload {
                    game_id: game_id.clone(),
                    play_time_seconds,
                };

                if let Err(e) = app_handle.emit("game-ended", &payload) {
                    error!("Failed to emit game-ended event: {}", e);
                }

                restore_window(&app_handle);
                break;
            } else {
                // Game hasn't started yet - check timeout
                attempts += 1;
                if attempts >= max_attempts {
                    warn!(
                        "Xbox explorer fallback TIMEOUT after {}s - emitting error",
                        XBOX_EXPLORER_TIMEOUT_SECONDS
                    );

                    // Get game info before unregistering
                    let game_info = tracker.get(&game_id);
                    tracker.unregister(&game_id);

                    // Emit error to frontend
                    if let Some(info) = game_info {
                        let error = GameLaunchError::xbox_explorer_fallback(game_id.clone(), info.game.title);
                        emit_launch_error(&app_handle, error);
                    }

                    restore_window(&app_handle);
                    break;
                }
            }
        }
    });
}
