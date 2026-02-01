use std::process::Command;
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::{Pid, System};
use tauri::{AppHandle, Emitter, Manager};
use tracing::{error, info, warn};
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

use crate::application::ActiveGamesTracker;
use crate::domain::GameLaunchError;

// Windows Native Imports
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_LOCAL_SERVER, COINIT_APARTMENTTHREADED};
use windows::Win32::UI::Shell::{ApplicationActivationManager, IApplicationActivationManager};

// =============================================================================
// CONSTANTS
// =============================================================================

/// Steam registry watchdog timeout (reduced for better UX)
/// Changed from 30s to 3s - pre-flight checks detect most issues immediately
const STEAM_TIMEOUT_SECONDS: u64 = 3;

/// Xbox explorer fallback timeout
const XBOX_EXPLORER_TIMEOUT_SECONDS: u64 = 5;

/// Threshold to consider a game exit as "quick exit" (failure)
const QUICK_EXIT_THRESHOLD_SECONDS: u64 = 5;

/// Polling interval for registry monitoring (more responsive)
const POLLING_INTERVAL_MS: u64 = 250;

// =============================================================================
// HELPER: CENTRALIZED ERROR EMISSION
// =============================================================================

/// Emit game launch error event to frontend
///
/// Centralizes error emission logic following DRY principle.
/// All watchdogs use this helper to maintain consistency.
fn emit_launch_error(app_handle: &AppHandle, error: GameLaunchError) {
    error!(
        "Game launch failed: {} - {} (Reason: {:?})",
        error.game_title, error.store, error.reason
    );

    // Emit to frontend for UI notification
    if let Err(e) = app_handle.emit("game-launch-failed", &error) {
        error!("Failed to emit game-launch-failed event: {}", e);
    }
}

// =============================================================================
// PRE-FLIGHT CHECKS (Performance Optimization)
// =============================================================================

/// Global System instance for process checking (performance optimization)
/// Keeping the same instance is much faster than recreating it
static SYSTEM_INSTANCE: OnceLock<Mutex<System>> = OnceLock::new();

/// Check if a Steam game is already running via registry
///
/// Performance: <1ms (instantaneous registry read)
/// This prevents launching if game is already running, avoiding timeout wait
fn steam_game_is_running(app_id: &str) -> bool {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key_path = format!("Software\\Valve\\Steam\\Apps\\{app_id}");

    if let Ok(key) = hkcu.open_subkey(&key_path) {
        if let Ok(running) = key.get_value::<u32, _>("Running") {
            if running == 1 {
                info!("Pre-flight check: Steam game {} already running (Registry=1)", app_id);
                return true;
            }
        }
    }
    false
}

/// Check if a game process is already running
///
/// Performance: 50-200ms (process scan)
/// Uses cached System instance for better performance
fn game_process_exists(exe_name: &str) -> bool {
    let sys = SYSTEM_INSTANCE.get_or_init(|| Mutex::new(System::new_all()));

    let mut sys = sys.lock().unwrap_or_else(|e| e.into_inner());
    sys.refresh_processes();

    let exists = sys
        .processes()
        .values()
        .any(|p| p.name().eq_ignore_ascii_case(exe_name));

    if exists {
        info!("Pre-flight check: Process {} already running", exe_name);
    }

    exists
}

/// Pre-flight check before launching game
///
/// Detects if game is already running BEFORE attempting launch.
/// Provides instant feedback instead of waiting for timeout.
fn pre_launch_check(id: &str, title: &str) -> Result<(), String> {
    if id.starts_with("steam_") {
        let app_id = id.replace("steam_", "");

        // Check registry (instantaneous)
        if steam_game_is_running(&app_id) {
            return Err(format!(
                "{} ya está corriendo.\n\n💡 Verifica tu barra de tareas o cierra el juego desde Steam.",
                title
            ));
        }
    }

    // TODO: Add process checks for other launchers
    // if id.starts_with("epic_") {
    //     if game_process_exists("game.exe") { ... }
    // }

    Ok(())
}

// =============================================================================
// GAME LAUNCH LOGIC
// =============================================================================

// Lanza el juego y opcionalmente activa el Watchdog
/// Launch a game and monitor its lifecycle.
///
/// This function handles different launch strategies based on the game ID:
/// - Steam: Uses the `steam://` protocol (returns None for PID).
/// - Xbox/UWP: Uses native Windows COM activation to get a real PID (returns Some(pid) or None).
/// - Native: Standard executable launch (returns Some(pid)).
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
        // Steam Game Strategy - No PID available
        let app_id = id.replace("steam_", "");
        let steam_url = format!("steam://run/{app_id}");

        info!("Executing Steam Command: cmd /C start {}", steam_url);

        let status = Command::new("cmd")
            .args(["/C", "start", &steam_url])
            .status()
            .map_err(|e| format!("Failed to launch Steam command: {e}"))?;

        info!("Steam launch command status: {}", status);

        // Use Registry Watchdog for Steam (Robust & Efficient)
        minimize_window(&app_handle_clone);
        start_steam_registry_watchdog(app_id, app_handle_clone, tracker, game_id);

        Ok(None) // Steam doesn't provide real PID
    } else if id.starts_with("xbox_") {
        // Xbox / UWP Strategy (Native Activation)
        info!("Attempting native UWP activation for: {}", path);

        match launch_uwp_app(path) {
            Ok(pid) => {
                info!("Xbox game launched natively with PID: {}", pid);
                minimize_window(&app_handle_clone);
                start_watchdog(pid, app_handle_clone, tracker, game_id);
                Ok(Some(pid))
            },
            Err(e) => {
                warn!("Failed native Xbox launch: {}. Falling back to explorer...", e);
                // Fallback to Shell launch (Less robust, no PID)
                Command::new("explorer")
                    .arg(format!("shell:AppsFolder\\{path}"))
                    .spawn()
                    .map_err(|e| format!("Extreme failure: Explorer fallback failed: {e}"))?;

                minimize_window(&app_handle_clone);

                // CRITICAL FIX: Add watchdog for explorer fallback
                // Can't monitor PID, but can timeout if game doesn't start
                start_xbox_explorer_watchdog(path.to_string(), app_handle_clone, tracker, game_id);

                Ok(None)
            },
        }
    } else {
        // Standard Executable Strategy
        let exe_path = std::path::Path::new(path);
        let working_dir = exe_path.parent().ok_or_else(|| "Invalid game path".to_string())?;

        let child = Command::new(path)
            .current_dir(working_dir)
            .spawn()
            .map_err(|e| format!("Failed to launch game executable: {e}"))?;

        let pid = child.id();
        info!("Game launched with PID: {}", pid);

        minimize_window(&app_handle_clone);
        start_watchdog(pid, app_handle_clone, tracker, game_id);

        Ok(Some(pid))
    }
}

fn minimize_window(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn start_steam_registry_watchdog(
    app_id: String,
    app_handle: AppHandle,
    tracker: Arc<ActiveGamesTracker>,
    game_id: String,
) {
    thread::spawn(move || {
        info!(
            ">>> Steam Registry Watchdog STARTED for AppID: {} (timeout: {}s, polling: {}ms) <<<",
            app_id, STEAM_TIMEOUT_SECONDS, POLLING_INTERVAL_MS
        );

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let key_path = format!("Software\\Valve\\Steam\\Apps\\{app_id}");

        let mut game_has_started = false;
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
                }
            } else if game_has_started {
                // Game closed normally
                info!("Steam reported game stopped. Restoring window.");
                tracker.unregister(&game_id);
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

fn restore_window(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn start_watchdog(pid: u32, app_handle: AppHandle, tracker: Arc<ActiveGamesTracker>, game_id: String) {
    thread::spawn(move || {
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

                restore_window(&app_handle);
                break; // Exit watchdog
            }
        }
    });
}

/// Xbox Explorer Fallback Watchdog
///
/// Monitors Xbox/UWP game launched via explorer.exe fallback.
/// Since we don't have a PID, we use a timeout-based approach with process scanning.
fn start_xbox_explorer_watchdog(
    app_user_model_id: String,
    app_handle: AppHandle,
    tracker: Arc<ActiveGamesTracker>,
    game_id: String,
) {
    thread::spawn(move || {
        info!(
            ">>> Xbox Explorer Watchdog STARTED for: {} (timeout: {}s, polling: {}ms) <<<",
            app_user_model_id, XBOX_EXPLORER_TIMEOUT_SECONDS, POLLING_INTERVAL_MS
        );

        let mut attempts = 0;
        let mut game_detected = false;
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
                }
            } else if game_detected {
                // Game was running, now stopped
                info!("Xbox game process ended. Restoring window.");
                tracker.unregister(&game_id);
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

/// Activates a UWP application natively using COM interfaces.
///
/// SAFETY: This function uses `unsafe` because it interacts directly with the
/// Windows COM API (`IApplicationActivationManager`).
/// Justification: There is no safe wrapper in Rust for UWP activation that returns
/// the process PID, which is required for our watchdog system.
fn launch_uwp_app(app_user_model_id: &str) -> Result<u32, String> {
    unsafe {
        // Initialize COM (Important for UWP activation)
        // We ignore the error because it likely means COM is already initialized
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        // Create Instance of ApplicationActivationManager
        let manager: IApplicationActivationManager =
            CoCreateInstance(&ApplicationActivationManager, None, CLSCTX_LOCAL_SERVER)
                .map_err(|e| format!("Failed to create ApplicationActivationManager: {e}"))?;

        let app_id_hstring = windows::core::HSTRING::from(app_user_model_id);

        // ActivateApplication returns the PID
        let pid = manager
            .ActivateApplication(
                &app_id_hstring,
                None, // Arguments
                windows::Win32::UI::Shell::AO_NONE,
            )
            .map_err(|e| format!("Failed to ActivateApplication: {e}"))?;

        Ok(pid)
    }
}
