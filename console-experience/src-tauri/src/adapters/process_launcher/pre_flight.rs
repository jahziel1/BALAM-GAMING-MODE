// =============================================================================
// PRE-FLIGHT CHECKS (Performance Optimization)
// =============================================================================

use std::sync::{Mutex, OnceLock};
use sysinfo::System;
use tracing::info;
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

/// Global System instance for process checking (performance optimization)
/// Keeping the same instance is much faster than recreating it
#[allow(dead_code)]
static SYSTEM_INSTANCE: OnceLock<Mutex<System>> = OnceLock::new();

/// Check if a Steam game is already running via registry
///
/// Performance: <1ms (instantaneous registry read)
/// This prevents launching if game is already running, avoiding timeout wait
pub fn steam_game_is_running(app_id: &str) -> bool {
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
#[allow(dead_code)]
pub fn game_process_exists(exe_name: &str) -> bool {
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
pub fn pre_launch_check(id: &str, title: &str) -> Result<(), String> {
    if id.starts_with("steam_") {
        let app_id = id.replace("steam_", "");

        // Check registry (instantaneous)
        if steam_game_is_running(&app_id) {
            return Err(format!(
                "{title} ya está corriendo.\n\n💡 Verifica tu barra de tareas o cierra el juego desde Steam."
            ));
        }
    }

    // TODO: Add process checks for other launchers
    // if id.starts_with("epic_") {
    //     if game_process_exists("game.exe") { ... }
    // }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_steam_game_running_check_returns_false_for_nonexistent_game() {
        let result = steam_game_is_running("999999999");
        assert!(!result, "Non-existent Steam game should not be reported as running");
    }

    #[test]
    fn test_pre_launch_check_succeeds_for_non_steam_game() {
        let result = pre_launch_check("epic_123", "Test Game");
        assert!(result.is_ok(), "Non-Steam games should pass pre-launch check");
    }

    #[test]
    fn test_pre_launch_check_validates_steam_id_format() {
        let result = pre_launch_check("steam_12345", "Test Game");
        assert!(result.is_ok(), "Valid Steam ID should pass pre-launch check");
    }

    #[test]
    fn test_game_process_exists_handles_empty_string() {
        let result = game_process_exists("");
        assert!(!result, "Empty process name should return false");
    }

    #[test]
    fn test_game_process_exists_handles_nonexistent_process() {
        let result = game_process_exists("NonExistentGameProcess_12345.exe");
        assert!(!result, "Non-existent process should return false");
    }
}
