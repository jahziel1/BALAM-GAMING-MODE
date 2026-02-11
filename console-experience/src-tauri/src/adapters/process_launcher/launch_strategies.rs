// =============================================================================
// GAME LAUNCH STRATEGIES
// =============================================================================

use std::process::Command;
use std::sync::Arc;
use tauri::AppHandle;
use tracing::{info, warn};

use crate::application::ActiveGamesTracker;

use super::pre_flight::pre_launch_check;
use super::uwp::launch_uwp_app;
use super::watchdogs::{start_steam_registry_watchdog, start_watchdog, start_xbox_explorer_watchdog};
use super::window_manager::minimize_window;

/// Launch a game and monitor its lifecycle.
///
/// This function handles different launch strategies based on the game ID:
/// - Steam: Uses the `steam://` protocol (returns `None` for PID).
/// - Xbox/UWP: Uses native Windows COM activation to get a real PID (returns `Some(pid)` or `None`).
/// - Native: Standard executable launch (returns `Some(pid)`).
///
/// # Arguments
/// * `executable_name` - Optional executable name for overlay injection (e.g., "SkyrimSE.exe")
///
/// # Returns
/// - `Ok(Some(pid))` - Game launched successfully with a real PID
/// - `Ok(None)` - Game launched successfully but no PID available (Steam, Xbox fallback)
/// - `Err(...)` - Launch failed
pub fn launch_game_process(
    id: &str,
    path: &str,
    app_handle: &AppHandle,
    tracker: Arc<ActiveGamesTracker>,
    executable_name: Option<String>,
) -> Result<Option<u32>, String> {
    info!("Launching game: {} ({})", id, path);

    // ========================================================================
    // PRE-FLIGHT CHECK: Detect if game already running (INSTANT feedback)
    // ========================================================================
    // Performance: <1ms for Steam (registry), 50-200ms for others (process scan)
    // Avoids waiting for timeout if game is already running
    pre_launch_check(id, "El juego")?;

    let app_handle_clone = app_handle.clone();
    let game_id = id.to_string();

    if id.starts_with("steam_") {
        launch_steam_game(id, app_handle_clone, tracker, game_id, executable_name)
    } else if id.starts_with("xbox_") {
        launch_xbox_game(path, app_handle_clone, tracker, game_id)
    } else {
        launch_native_game(path, app_handle_clone, tracker, game_id)
    }
}

/// Launch Steam game via steam:// protocol
fn launch_steam_game(
    id: &str,
    app_handle: AppHandle,
    tracker: Arc<ActiveGamesTracker>,
    game_id: String,
    executable_name: Option<String>,
) -> Result<Option<u32>, String> {
    let app_id = id.replace("steam_", "");
    let steam_url = format!("steam://run/{app_id}");

    info!("Executing Steam Command: cmd /C start {}", steam_url);

    let status = Command::new("cmd")
        .args(["/C", "start", &steam_url])
        .status()
        .map_err(|e| format!("Failed to launch Steam command: {e}"))?;

    info!("Steam launch command status: {}", status);

    // Use Registry Watchdog for Steam (Robust & Efficient)
    minimize_window(&app_handle);

    // Executable name comes from auto-detection during scan
    if executable_name.is_some() {
        info!("🎯 Overlay will inject into: {:?}", executable_name);
    }

    start_steam_registry_watchdog(app_id, app_handle, tracker, game_id, executable_name);

    Ok(None) // Steam doesn't provide real PID
}

/// Launch Xbox/UWP game via native COM activation
fn launch_xbox_game(
    path: &str,
    app_handle: AppHandle,
    tracker: Arc<ActiveGamesTracker>,
    game_id: String,
) -> Result<Option<u32>, String> {
    info!("Attempting native UWP activation for: {}", path);

    match launch_uwp_app(path) {
        Ok(pid) => {
            info!("Xbox game launched natively with PID: {}", pid);
            minimize_window(&app_handle);

            start_watchdog(pid, app_handle, tracker, game_id);
            Ok(Some(pid))
        },
        Err(e) => {
            warn!("Failed native Xbox launch: {}. Falling back to explorer...", e);
            // Fallback to Shell launch (Less robust, no PID)
            Command::new("explorer")
                .arg(format!("shell:AppsFolder\\{path}"))
                .spawn()
                .map_err(|e| format!("Extreme failure: Explorer fallback failed: {e}"))?;

            minimize_window(&app_handle);

            // CRITICAL FIX: Add watchdog for explorer fallback
            // Can't monitor PID, but can timeout if game doesn't start
            start_xbox_explorer_watchdog(path.to_string(), app_handle, tracker, game_id);

            // NOTE: Can't inject overlay for explorer fallback (no PID)
            warn!("⚠️ Xbox explorer fallback: overlay injection not possible (no PID)");

            Ok(None)
        },
    }
}

/// Launch native executable
fn launch_native_game(
    path: &str,
    app_handle: AppHandle,
    tracker: Arc<ActiveGamesTracker>,
    game_id: String,
) -> Result<Option<u32>, String> {
    let exe_path = std::path::Path::new(path);
    let working_dir = exe_path.parent().ok_or_else(|| "Invalid game path".to_string())?;

    let child = Command::new(path)
        .current_dir(working_dir)
        .spawn()
        .map_err(|e| format!("Failed to launch game executable: {e}"))?;

    let pid = child.id();
    info!("Game launched with PID: {}", pid);

    minimize_window(&app_handle);

    start_watchdog(pid, app_handle, tracker, game_id);

    Ok(Some(pid))
}
