// =============================================================================
// STEAM REGISTRY WATCHDOG
// =============================================================================

use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tracing::{error, info, warn};
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

use super::super::constants::{POLLING_INTERVAL_MS, STEAM_TIMEOUT_SECONDS};
use super::super::error_handler::emit_launch_error;
use super::super::window_manager::restore_window;
use crate::application::ActiveGamesTracker;
use crate::domain::GameLaunchError;

/// Start Steam registry-based watchdog
///
/// Monitors the Steam registry key to detect game start/stop.
/// More reliable than PID tracking for Steam games.
///
/// # Events
/// - Emits `game-process-started` when game starts (with executable_name if available)
/// - Emits `game-ended` when game stops
pub fn start_steam_registry_watchdog(
    app_id: String,
    app_handle: AppHandle,
    tracker: Arc<ActiveGamesTracker>,
    game_id: String,
    executable_name: Option<String>,
) {
    thread::spawn(move || {
        #[derive(serde::Serialize, Clone)]
        struct GameStartedPayload {
            game_id: String,
            executable_name: Option<String>,
        }

        #[derive(serde::Serialize, Clone)]
        struct GameEndedPayload {
            game_id: String,
            play_time_seconds: u64,
        }

        info!(
            ">>> Steam Registry Watchdog STARTED for AppID: {} (timeout: {}s, polling: {}ms) <<<",
            app_id, STEAM_TIMEOUT_SECONDS, POLLING_INTERVAL_MS
        );

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let key_path = format!("Software\\Valve\\Steam\\Apps\\{app_id}");

        let mut game_has_started = false;
        let mut start_time: Option<Instant> = None;
        let mut attempts = 0;
        let max_attempts = (STEAM_TIMEOUT_SECONDS * 1000) / POLLING_INTERVAL_MS;

        loop {
            thread::sleep(Duration::from_millis(POLLING_INTERVAL_MS));

            let mut is_running = false;

            if let Ok(key) = hkcu.open_subkey(&key_path) {
                if let Ok(running_val) = key.get_value::<u32, _>("Running") {
                    if running_val == 1 {
                        is_running = true;
                    }
                }
            }

            if is_running {
                if !game_has_started {
                    info!("Steam reported game running! Monitoring...");
                    game_has_started = true;
                    start_time = Some(Instant::now()); // Record start time

                    // Emit event for overlay auto-injector (separation of concerns)
                    let payload = GameStartedPayload {
                        game_id: game_id.clone(),
                        executable_name: executable_name.clone(),
                    };

                    if let Err(e) = app_handle.emit("game-process-started", &payload) {
                        error!("Failed to emit game-process-started event: {}", e);
                    }
                }
            } else if game_has_started {
                // Game closed normally
                info!("Steam reported game stopped. Restoring window.");

                // Calculate play time
                let play_time_seconds = if let Some(start) = start_time {
                    start.elapsed().as_secs()
                } else {
                    0
                };

                info!(
                    "⏱️ Game session duration: {}s ({:.1}min)",
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
                        "Steam game startup TIMEOUT after {}s - emitting error",
                        STEAM_TIMEOUT_SECONDS
                    );

                    // Get game info from tracker before unregistering
                    let game_info = tracker.get(&game_id);
                    tracker.unregister(&game_id);

                    // Emit error to frontend
                    if let Some(info) = game_info {
                        let error =
                            GameLaunchError::steam_timeout(game_id.clone(), info.game.title, STEAM_TIMEOUT_SECONDS);
                        emit_launch_error(&app_handle, error);
                    }

                    restore_window(&app_handle);
                    break;
                }
            }
        }
    });
}
