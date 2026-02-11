// =============================================================================
// GENERIC PID WATCHDOG
// =============================================================================

use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::{Pid, System};
use tauri::{AppHandle, Emitter};
use tracing::{error, info, warn};

use super::super::constants::QUICK_EXIT_THRESHOLD_SECONDS;
use super::super::error_handler::emit_launch_error;
use super::super::window_manager::restore_window;
use crate::application::ActiveGamesTracker;
use crate::domain::GameLaunchError;

/// Start generic PID-based watchdog
///
/// Monitors a process by PID. Works for native executables and some launchers.
pub fn start_watchdog(pid: u32, app_handle: AppHandle, tracker: Arc<ActiveGamesTracker>, game_id: String) {
    thread::spawn(move || {
        #[derive(serde::Serialize, Clone)]
        struct GameEndedPayload {
            game_id: String,
            play_time_seconds: u64,
        }

        let mut sys = System::new_all();
        let target_pid = Pid::from_u32(pid);
        let start_time = Instant::now();

        info!("PID Watchdog started for: {} (game: {})", pid, game_id);

        loop {
            // Check every 2 seconds
            thread::sleep(Duration::from_secs(2));

            // Refresh process list specifically
            sys.refresh_processes();

            // Check if process is still alive
            if sys.process(target_pid).is_none() {
                let runtime = start_time.elapsed().as_secs();
                info!("Process {} ended after {}s. Restoring window.", pid, runtime);

                // Check if it's a quick exit (< 5 seconds = likely a failure)
                if runtime < QUICK_EXIT_THRESHOLD_SECONDS {
                    warn!(
                        "Quick exit detected ({}s < {}s) - emitting error",
                        runtime, QUICK_EXIT_THRESHOLD_SECONDS
                    );

                    // Get game info before unregistering
                    let game_info = tracker.get(&game_id);
                    tracker.unregister(&game_id);

                    // Emit error to frontend
                    if let Some(info) = game_info {
                        let error = GameLaunchError::native_quick_exit(
                            game_id.clone(),
                            info.game.title,
                            runtime,
                            info.game.source.display_name().to_string(),
                        );
                        emit_launch_error(&app_handle, error);
                    }
                } else {
                    // Normal exit (game ran for more than 5 seconds)
                    tracker.unregister(&game_id);
                }

                // Emit event to frontend with play time
                let payload = GameEndedPayload {
                    game_id: game_id.clone(),
                    play_time_seconds: runtime,
                };

                if let Err(e) = app_handle.emit("game-ended", &payload) {
                    error!("Failed to emit game-ended event: {}", e);
                }

                restore_window(&app_handle);
                break; // Exit watchdog
            }
        }
    });
}
