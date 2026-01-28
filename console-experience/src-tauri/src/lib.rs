// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub mod domain;
pub mod ports;
pub mod adapters;
pub mod application;

use tauri::Manager;
use crate::adapters::steam_scanner::SteamScanner;
use crate::adapters::epic_scanner::EpicScanner;
use crate::adapters::xbox_scanner::XboxScanner;
use crate::domain::Game;
use std::fs;
use std::path::PathBuf;

// Helper to get cache path
fn get_cache_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    app_handle.path().app_data_dir().ok().map(|p| p.join("games_cache.json"))
}

// Command to get games (Cached + Scan)
#[tauri::command]
fn get_games(app_handle: tauri::AppHandle) -> Vec<Game> {
    // 1. Try Load Cache First (Fast Path)
    if let Some(cache_path) = get_cache_path(&app_handle) {
        if cache_path.exists() {
            if let Ok(content) = fs::read_to_string(&cache_path) {
                if let Ok(cached_games) = serde_json::from_str::<Vec<Game>>(&content) {
                    println!("Loaded {} games from cache", cached_games.len());
                    return cached_games;
                }
            }
        }
    }

    // 2. If no cache, Scan (Slow Path)
    let games = scan_all_games();
    
    // 3. Save Cache
    if let Some(cache_path) = get_cache_path(&app_handle) {
        // Ensure dir exists
        if let Some(parent) = cache_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string(&games) {
            let _ = fs::write(cache_path, json);
        }
    }
    
    games
}

#[tauri::command]
fn scan_games(app_handle: tauri::AppHandle) -> Vec<Game> {
    let games = scan_all_games();
    println!(">>> SENDING {} GAMES TO FRONTEND AT SCAN <<<", games.len());
    for g in &games { println!(" - GAME: {} (ID: {})", g.title, g.id); }
    
    // Save Cache
    if let Some(cache_path) = get_cache_path(&app_handle) {
        if let Some(parent) = cache_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string(&games) {
            let _ = fs::write(cache_path, json);
        }
    }
    
    games
}

fn scan_all_games() -> Vec<Game> {
    let mut all_games = Vec::new();
    all_games.extend(SteamScanner::scan());
    all_games.extend(EpicScanner::scan());
    all_games.extend(XboxScanner::scan());
    all_games
}

// 1. Definir el estado global de la aplicación (Dependency Container)
pub struct AppState {
    // Future repositories can go here
}

// Command to launch a game
#[tauri::command]
fn launch_game(id: String, path: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    adapters::process_launcher::launch_game_process(&id, &path, &app_handle)
}

/// Command to terminate a running game.
#[tauri::command]
fn kill_game(path: String) -> Result<(), String> {
    println!(">>> Kill Request for path: {}", path);
    let path_obj = std::path::Path::new(&path);
    
    // Strategy 1: UWP Kill Strategy (Detected by "!" in ID)
    if path.contains('!') {
        println!("Target looks like UWP App. Terminating via PowerShell.");
        let family_name = path.split('!').next().ok_or("Invalid AppID")?;
        let _ = std::process::Command::new("powershell")
            .args(["-Command", &format!("Get-AppxPackage -Name *{}* | Stop-Process -ErrorAction SilentlyContinue", family_name)])
            .output();
        return Ok(());
    }

    // Strategy 2: If path is a file (e.g. Native Game), kill by filename
    if path_obj.is_file() {
        if let Some(file_name) = path_obj.file_name().and_then(|s| s.to_str()) {
             println!("Target is a FILE. Killing by Image Name: {}", file_name);
             let _ = std::process::Command::new("taskkill")
                .args(["/F", "/IM", file_name])
                .output();
             return Ok(());
        }
    }
    
    // Strategy 3: If path is a directory (e.g. Steam Game), kill processes running from there
    if path_obj.is_dir() {
        println!("Target is a DIRECTORY. Scanning processes running from: {}", path);
        let mut sys = sysinfo::System::new_all();
        sys.refresh_processes();
        
        for (pid, process) in sys.processes() {
            if let Some(exe_path) = process.exe() {
                if exe_path.starts_with(path_obj) {
                    println!("Found process in game dir: {} (PID: {})", process.name(), pid);
                    if !process.kill() {
                        let _ = std::process::Command::new("taskkill")
                            .args(["/F", "/PID", &pid.to_string()])
                            .output();
                    }
                }
            }
        }
        return Ok(());
    }
    
    Err("Invalid path".to_string())
}

#[tauri::command]
fn get_system_status() -> crate::ports::system_port::SystemStatus {
    use crate::ports::system_port::SystemPort;
    let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
    adapter.get_status()
}

#[tauri::command]
fn set_volume(level: u32) -> Result<(), String> {
    use crate::ports::system_port::SystemPort;
    let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
    adapter.set_volume(level)
}

#[tauri::command]
fn shutdown_pc() -> Result<(), String> {
    use crate::ports::system_port::SystemPort;
    let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
    adapter.shutdown()
}

#[tauri::command]
fn restart_pc() -> Result<(), String> {
    use crate::ports::system_port::SystemPort;
    let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
    adapter.restart()
}

#[tauri::command]
fn logout_pc() -> Result<(), String> {
    use crate::ports::system_port::SystemPort;
    let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
    adapter.logout()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState { };

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(move |app, _shortcut, event| {
             if event.state == ShortcutState::Pressed {
                 if let Some(window) = app.get_webview_window("main") {
                     let is_visible = window.is_visible().unwrap_or(false);
                     if is_visible {
                         let _ = window.set_always_on_top(false);
                         let _ = window.hide();
                     } else {
                         let _ = window.show();
                         let _ = window.set_always_on_top(true);
                         let _ = window.set_focus();
                     }
                 }
             }
        }).build())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                app.global_shortcut().register(Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyQ))?;
            }

            // Native Gamepad: Windows.Gaming.Input Engine
            crate::adapters::gamepad_adapter::start_gamepad_listener(app.handle().clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_games,
            scan_games,
            launch_game,
            kill_game,
            get_system_status,
            set_volume,
            shutdown_pc,
            restart_pc,
            logout_pc
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
