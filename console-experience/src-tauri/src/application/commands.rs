use tauri::Manager;
use crate::adapters::steam_scanner::SteamScanner;
use crate::adapters::epic_scanner::EpicScanner;
use crate::adapters::xbox_scanner::XboxScanner;
use crate::domain::Game;
use std::fs;
use std::path::{Path, PathBuf};
use crate::adapters;
use crate::ports::system_port::{SystemPort, SystemStatus};
use crate::adapters::windows_system_adapter::WindowsSystemAdapter;
use tracing::{info, error, warn};

// Helper to get cache path
fn get_cache_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    app_handle.path().app_data_dir().ok().map(|p| p.join("games_cache.json"))
}

fn scan_all_games() -> Vec<Game> {
    info!("Starting full game scan...");
    let mut all_games = Vec::new();
    all_games.extend(SteamScanner::scan());
    all_games.extend(EpicScanner::scan());
    all_games.extend(XboxScanner::scan());
    info!("Scan complete. Found {} games.", all_games.len());
    all_games
}

#[tauri::command]
pub fn get_games(app_handle: tauri::AppHandle) -> Vec<Game> {
    // 1. Try Load Cache First (Fast Path)
    if let Some(cache_path) = get_cache_path(&app_handle) {
        if cache_path.exists() {
            if let Ok(content) = fs::read_to_string(&cache_path) {
                if let Ok(cached_games) = serde_json::from_str::<Vec<Game>>(&content) {
                    info!("Loaded {} games from cache", cached_games.len());
                    return cached_games;
                }
            }
        }
    }

    // 2. If no cache, Scan (Slow Path)
    let games = scan_all_games();
    
    // 3. Save Cache
    if let Some(cache_path) = get_cache_path(&app_handle) {
        if let Some(parent) = cache_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string(&games) {
            if let Err(e) = fs::write(&cache_path, json) {
                error!("Failed to save games cache: {}", e);
            }
        }
    }
    
    games
}

#[tauri::command]
pub fn scan_games(app_handle: tauri::AppHandle) -> Vec<Game> {
    let games = scan_all_games();
    
    if let Some(cache_path) = get_cache_path(&app_handle) {
        if let Some(parent) = cache_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string(&games) {
            if let Err(e) = fs::write(&cache_path, json) {
                error!("Failed to save games cache after scan: {}", e);
            }
        }
    }
    
    games
}

#[tauri::command]
pub fn launch_game(id: String, path: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    info!("Request to launch game: {} with path: {}", id, path);
    // Security: Basic path validation
    let p = Path::new(&path);
    if !p.exists() && !path.contains('!') { // ! is for UWP
        error!("Launch failed: Invalid path {}", path);
        return Err("Invalid path".to_string());
    }
    adapters::process_launcher::launch_game_process(&id, &path, &app_handle)
}

#[tauri::command]
pub fn kill_game(path: String) -> Result<(), String> {
    info!("Request to kill game at path: {}", path);
    let path_obj = Path::new(&path);
    
    // Strategy 1: UWP Kill Strategy (Detected by "!" in ID)
    if path.contains('!') {
        info!("Target looks like UWP App. Terminating via PowerShell.");
        let family_name = path.split('!').next().ok_or("Invalid AppID")?;
        let _ = std::process::Command::new("powershell")
            .args(["-Command", &format!("Get-AppxPackage -Name *{}* | Stop-Process -ErrorAction SilentlyContinue", family_name)])
            .output();
        return Ok(());
    }

    // Strategy 2: If path is a file (e.g. Native Game), kill by filename
    if path_obj.is_file() {
        if let Some(file_name) = path_obj.file_name().and_then(|s| s.to_str()) {
             info!("Target is a FILE. Killing by Image Name: {}", file_name);
             let _ = std::process::Command::new("taskkill")
                .args(["/F", "/IM", file_name])
                .output();
             return Ok(());
        }
    }
    
    // Strategy 3: If path is a directory (e.g. Steam Game), kill processes running from there
    if path_obj.is_dir() {
        info!("Target is a DIRECTORY. Scanning processes running from: {}", path);
        let mut sys = sysinfo::System::new_all();
        sys.refresh_processes();
        
        let mut found = false;
        for (pid, process) in sys.processes() {
            if let Some(exe_path) = process.exe() {
                if exe_path.starts_with(path_obj) {
                    info!("Found process in game dir: {} (PID: {})", process.name(), pid);
                    found = true;
                    if !process.kill() {
                        warn!("Failed to kill process {} (PID: {}) smoothly, using taskkill", process.name(), pid);
                        let _ = std::process::Command::new("taskkill")
                            .args(["/F", "/PID", &pid.to_string()])
                            .output();
                    }
                }
            }
        }
        if !found {
            warn!("No processes found running from directory: {}", path);
        }
        return Ok(());
    }
    
    error!("Kill failed: Invalid path {}", path);
    Err("Invalid path".to_string())
}


#[tauri::command]
pub fn get_system_status() -> SystemStatus {
    let adapter = WindowsSystemAdapter::new();
    adapter.get_status()
}

#[tauri::command]
pub fn set_volume(level: u32) -> Result<(), String> {
    let adapter = WindowsSystemAdapter::new();
    adapter.set_volume(level)
}

#[tauri::command]
pub fn shutdown_pc() -> Result<(), String> {
    let adapter = WindowsSystemAdapter::new();
    adapter.shutdown()
}

#[tauri::command]
pub fn restart_pc() -> Result<(), String> {
    let adapter = WindowsSystemAdapter::new();
    adapter.restart()
}

#[tauri::command]
pub fn logout_pc() -> Result<(), String> {
    let adapter = WindowsSystemAdapter::new();
    adapter.logout()
}
