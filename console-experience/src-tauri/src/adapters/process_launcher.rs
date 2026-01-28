use std::process::Command;
use tauri::{AppHandle, Manager};
use std::thread;
use std::time::Duration;
use sysinfo::{Pid, System};
use winreg::enums::*;
use winreg::RegKey;

// Windows Native Imports
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_LOCAL_SERVER, COINIT_APARTMENTTHREADED};
use windows::Win32::UI::Shell::{IApplicationActivationManager, ApplicationActivationManager};

// Lanza el juego y opcionalmente activa el Watchdog
/// Launch a game and monitor its lifecycle.
///
/// This function handles different launch strategies based on the game ID:
/// - Steam: Uses the `steam://` protocol.
/// - Xbox/UWP: Uses native Windows COM activation to get a real PID.
/// - Native: Standard executable launch.
pub fn launch_game_process(id: &str, path: &str, app_handle: &AppHandle) -> Result<(), String> {
    println!("Launching game: {} ({})", id, path);
    let app_handle_clone = app_handle.clone();

    if id.starts_with("steam_") {
        // Steam Game Strategy
        let app_id = id.replace("steam_", "");
        let steam_url = format!("steam://run/{}", app_id);
        
        println!("Executing Steam Command: cmd /C start {}", steam_url);

        let status = Command::new("cmd")
            .args(["/C", "start", &steam_url])
            .status()
            .map_err(|e| format!("Failed to launch Steam command: {}", e))?;
            
        println!("Steam launch command status: {}", status);
            
        // Use Registry Watchdog for Steam (Robust & Efficient)
        minimize_window(&app_handle_clone);
        start_steam_registry_watchdog(app_id, app_handle_clone);

    } else if id.starts_with("xbox_") {
        // Xbox / UWP Strategy (Native Activation)
        println!("Attempting native UWP activation for: {}", path);
        
        match launch_uwp_app(path) {
            Ok(pid) => {
                println!("Xbox game launched natively with PID: {}", pid);
                minimize_window(&app_handle_clone);
                start_watchdog(pid, app_handle_clone);
            }
            Err(e) => {
                println!("Failed native Xbox launch: {}. Falling back to explorer...", e);
                // Fallback to Shell launch (Less robust, no PID)
                let _ = Command::new("explorer")
                    .arg(format!("shell:AppsFolder\\{}", path))
                    .spawn()
                    .map_err(|e| format!("Extreme failure: Explorer fallback failed: {}", e))?;
                
                minimize_window(&app_handle_clone);
            }
        }
        
    } else {
        // Standard Executable Strategy
        let exe_path = std::path::Path::new(path);
        let working_dir = exe_path.parent().ok_or_else(|| "Invalid game path".to_string())?;

        let child = Command::new(path)
            .current_dir(working_dir)
            .spawn()
            .map_err(|e| format!("Failed to launch game executable: {}", e))?;
        
        let pid = child.id();
        println!("Game launched with PID: {}", pid);
        
        minimize_window(&app_handle_clone);
        start_watchdog(pid, app_handle_clone);
    }

    Ok(())
}

fn minimize_window(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn start_steam_registry_watchdog(app_id: String, app_handle: AppHandle) {
    thread::spawn(move || {
        println!(">>> Steam Registry Watchdog STARTED for AppID: {} <<<", app_id);
        
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let key_path = format!("Software\\Valve\\Steam\\Apps\\{}", app_id);
        
        let mut game_has_started = false;
        let mut attempts = 0;
        let max_startup_attempts = 60; // 60s timeout

        loop {
            thread::sleep(Duration::from_secs(1));
            
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
                    println!("Steam reported game running! Monitoring...");
                    game_has_started = true;
                }
            } else {
                if game_has_started {
                    println!("Steam reported game stopped. Restoring window.");
                    restore_window(&app_handle);
                    break;
                } else {
                    attempts += 1;
                    if attempts >= max_startup_attempts {
                         println!("Steam game startup timeout. Restoring window.");
                         restore_window(&app_handle);
                         break;
                    }
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

fn start_watchdog(pid: u32, app_handle: AppHandle) {
    thread::spawn(move || {
        let mut sys = System::new_all();
        let target_pid = Pid::from_u32(pid);
        
        println!("PID Watchdog started for: {}", pid);

        loop {
            // Check every 2 seconds
            thread::sleep(Duration::from_secs(2));
            
            // Refresh process list specifically
            sys.refresh_processes();
            
            // Check if process is still alive
            if sys.process(target_pid).is_none() {
                println!("Process {} ended. Restoring window.", pid);
                restore_window(&app_handle);
                break; // Exit watchdog
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
        let manager: IApplicationActivationManager = CoCreateInstance(
            &ApplicationActivationManager, 
            None, 
            CLSCTX_LOCAL_SERVER
        ).map_err(|e| format!("Failed to create ApplicationActivationManager: {}", e))?;

        let app_id_hstring = windows::core::HSTRING::from(app_user_model_id);

        // ActivateApplication returns the PID
        let pid = manager.ActivateApplication(
            &app_id_hstring,
            None, // Arguments
            windows::Win32::UI::Shell::AO_NONE
        ).map_err(|e| format!("Failed to ActivateApplication: {}", e))?;

        Ok(pid)
    }
}