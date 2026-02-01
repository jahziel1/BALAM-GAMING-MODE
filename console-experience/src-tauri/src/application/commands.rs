use crate::adapters;
use crate::adapters::display::WindowsDisplayAdapter;
use crate::adapters::identity_engine::IdentityEngine;
use crate::adapters::metadata_adapter::MetadataAdapter;
use crate::adapters::performance::RyzenAdjAdapter;
use crate::adapters::windows_system_adapter::WindowsSystemAdapter;
use crate::application::{ActiveGame, ActiveGameInfo, DIContainer};
use crate::domain::{BrightnessConfig, Game, GameSource, PerformanceProfile, RefreshRateConfig, TDPConfig};
use crate::ports::display_port::DisplayPort;
use crate::ports::performance_port::PerformancePort;
use crate::ports::system_port::{SystemPort, SystemStatus};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{Manager, State};
use tracing::{info, warn};

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
}

fn get_cache_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    app_handle
        .path()
        .app_local_data_dir()
        .ok()
        .map(|p| p.join("games_cache.json"))
}

/// The core discovery engine with robust de-duplication.
///
/// Uses DI container services for scanning and deduplication, ensuring
/// all scanners are orchestrated correctly and duplicates are removed.
///
/// # Process
/// 1. **Discovery**: Runs all registered scanners (Steam, Epic, Xbox, Registry)
///    via `GameDiscoveryService`, which handles individual scanner failures
/// 2. **Deduplication**: Removes duplicates via `GameDeduplicationService`,
///    which uses `IdentityEngine` for PE binary identity matching
///
/// # Returns
/// Vector of unique games sorted by scanner priority (Steam first, Registry last).
///
/// # Performance
/// Typical scan time: **1-3 seconds** for 200-500 games across all platforms.
fn scan_all_games(container: &DIContainer) -> Vec<Game> {
    info!("CRITICAL: Starting fresh de-duplicated scan...");

    // 1. Discover games using GameDiscoveryService (handles all scanners)
    let raw_games = match container.game_discovery_service.discover() {
        Ok(games) => games,
        Err(e) => {
            warn!("Game discovery failed: {}", e);
            return Vec::new();
        },
    };

    // 2. Deduplicate using GameDeduplicationService
    let unique_games = container.game_deduplication_service.deduplicate(raw_games);

    info!("Scan complete. Found {} unique games.", unique_games.len());
    unique_games
}

/// Gets all games from all sources with caching.
///
/// This is the main command used by the frontend to populate the game library.
/// It orchestrates scanning, deduplication, cache merging, and metadata enrichment.
///
/// # Process
/// 1. **Scan**: Discovers games via `scan_all_games()` (uses DI container services)
/// 2. **Merge Cache**: Adds manually-added games from persistent cache
/// 3. **Enrich Metadata**: Extracts PE metadata (icon, version) if missing
/// 4. **Save Cache**: Persists final list to `games_cache.json`
///
/// # Returns
/// Vector of unique games with complete metadata.
///
/// # Performance
/// - **First run**: ~2-4 seconds (full scan + metadata extraction)
/// - **Subsequent runs**: ~1-2 seconds (cached metadata)
///
/// # Examples (Frontend)
/// ```typescript
/// const games = await invoke<Game[]>('get_games');
/// console.log(`Loaded ${games.length} games`);
/// ```
#[tauri::command]
#[must_use]
pub fn get_games(app_handle: tauri::AppHandle, container: State<DIContainer>) -> Vec<Game> {
    let mut games = scan_all_games(&container);

    // Merge with Manual games from cache
    if let Some(cache_path) = get_cache_path(&app_handle) {
        if let Ok(content) = fs::read_to_string(&cache_path) {
            if let Ok(cached_games) = serde_json::from_str::<Vec<Game>>(&content) {
                for cg in cached_games {
                    if cg.source == GameSource::Manual && !games.iter().any(|g| g.path == cg.path) {
                        games.push(cg);
                    }
                }
            }
        }
    }

    MetadataAdapter::ensure_metadata_cached(&mut games, &app_handle);

    // Save clean list to cache
    if let Some(cache_path) = get_cache_path(&app_handle) {
        if let Some(parent) = cache_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(&cache_path, serde_json::to_string(&games).unwrap_or_default());
    }

    games
}

/// Force re-scans all game sources.
///
/// Alias for `get_games()` - triggers a fresh scan of all platforms.
///
/// # Use Case
/// Called by frontend when user clicks "Refresh Library" button.
///
/// # Performance
/// Same as `get_games()`: ~1-4 seconds depending on cache state.
#[tauri::command]
#[must_use]
pub fn scan_games(app_handle: tauri::AppHandle, container: State<DIContainer>) -> Vec<Game> {
    get_games(app_handle, container)
}

#[tauri::command]
pub fn add_game_manually(
    path: String,
    title: String,
    app_handle: tauri::AppHandle,
    container: State<DIContainer>,
) -> Result<Game, String> {
    let mut current_games = get_games(app_handle.clone(), container);

    let identity = IdentityEngine::get_identity(&path);
    let identity_key = identity
        .internal_name
        .as_ref()
        .map_or_else(|| format!("PATH_{}", identity.canonical_path), |n| format!("BIN_{n}"));

    if current_games.iter().any(|g| {
        let gid = IdentityEngine::get_identity(&g.path);
        let gkey = gid
            .internal_name
            .as_ref()
            .map_or_else(|| format!("PATH_{}", gid.canonical_path), |n| format!("BIN_{n}"));
        gkey == identity_key
    }) {
        return Err("Game already exists in library".to_string());
    }

    let game_id = format!("manual_{}", uuid::Uuid::new_v4());
    let mut game = Game {
        id: game_id,
        raw_id: path.clone(),
        title,
        path: path.clone(),
        image: None,
        hero_image: None,
        logo: None,
        last_played: None,
        source: GameSource::Manual,
    };

    let mut temp = vec![game.clone()];
    MetadataAdapter::ensure_metadata_cached(&mut temp, &app_handle);
    game = temp[0].clone();

    current_games.push(game.clone());
    if let Some(cache_path) = get_cache_path(&app_handle) {
        let _ = fs::write(&cache_path, serde_json::to_string(&current_games).unwrap_or_default());
    }

    Ok(game)
}

#[tauri::command]
pub fn remove_game(id: String, app_handle: tauri::AppHandle, container: State<DIContainer>) -> Result<(), String> {
    let mut current_games = get_games(app_handle.clone(), container);
    let initial_len = current_games.len();
    current_games.retain(|g| g.id != id);

    if current_games.len() == initial_len {
        return Err("Game not found".to_string());
    }

    if let Some(cache_path) = get_cache_path(&app_handle) {
        let _ = fs::write(&cache_path, serde_json::to_string(&current_games).unwrap_or_default());
    }
    Ok(())
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let path_buf = PathBuf::from(&path);
    let mut entries = Vec::new();
    if let Ok(dir_entries) = fs::read_dir(path_buf) {
        for entry in dir_entries.flatten() {
            let metadata = entry.metadata();
            let is_dir = metadata.as_ref().map(std::fs::Metadata::is_dir).unwrap_or(false);
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') || name.starts_with('$') {
                continue;
            }
            entries.push(FileEntry {
                name,
                path: entry.path().to_string_lossy().to_string(),
                is_dir,
                extension: entry.path().extension().map(|e| e.to_string_lossy().to_string()),
            });
        }
    }
    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else {
            b.is_dir.cmp(&a.is_dir)
        }
    });
    Ok(entries)
}

#[tauri::command]
#[must_use]
pub fn get_system_drives() -> Vec<String> {
    let mut drives = Vec::new();
    unsafe {
        let mask = windows::Win32::Storage::FileSystem::GetLogicalDrives();
        for i in 0..26 {
            if (mask & (1 << i)) != 0 {
                let drive_letter = (b'A' + i) as char;
                drives.push(format!("{drive_letter}:\\"));
            }
        }
    }
    drives
}

/// Launches a game process.
///
/// Supports both native executables (.exe) and UWP apps (Xbox/Microsoft Store).
///
/// # Arguments
/// * `id` - Unique game identifier
/// * `path` - Game executable path or UWP `AppID` (format: `FamilyName!AppID`)
/// * `app_handle` - Tauri app handle for process management
///
/// # UWP Support
/// UWP apps are detected by the `!` separator in the path:
/// - Example: `Microsoft.MinecraftUWP_8wekyb3d8bbwe!App`
/// - Launched via `explorer.exe shell:AppsFolder\<AppID>`
///
/// # Process Management
/// - Implements single-instance protocol (kills existing instance before launch)
/// - Shows confirmation modal if game is already running
/// - Hides main window after launch (console mode)
///
/// # Errors
/// - `Err("Invalid path")` - File doesn't exist (native games only)
/// - `Err(...)` - Process spawn failed or UWP launch failed
///
/// # Examples (Frontend)
/// ```typescript
/// // Launch by game ID only (backend looks up path)
/// const activeGame = await invoke<ActiveGame>('launch_game', { gameId: 'steam_123' });
/// console.log(`Launched ${activeGame.game.title} with PID ${activeGame.pid}`);
/// ```
#[tauri::command]
pub fn launch_game(
    game_id: String,
    app_handle: tauri::AppHandle,
    container: State<DIContainer>,
) -> Result<ActiveGame, String> {
    info!("🎮 Launch request for game: {}", game_id);

    // 1. Get all games to find the requested one
    let games = get_games(app_handle.clone(), container.clone());
    let game = games
        .into_iter()
        .find(|g| g.id == game_id)
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    info!("Found game: {} at path: {}", game.title, game.path);

    // 2. Validate path (skip for UWP apps with '!')
    let p = Path::new(&game.path);
    if !p.exists() && !game.path.contains('!') {
        return Err("Invalid path".to_string());
    }

    // 3. Launch the game and get PID (if available)
    let pid = adapters::process_launcher::launch_game_process(
        &game.id,
        &game.path,
        &app_handle,
        container.active_games_tracker.clone(),
    )?;

    // 4. Register in active games tracker
    let active_info = ActiveGameInfo {
        game: game.clone(),
        pid,
        path: game.path.clone(),
    };

    container
        .active_games_tracker
        .register(game_id.clone(), active_info.clone());

    info!("✅ Game launched successfully: {} (PID: {:?})", game.title, pid);

    // 5. Return ActiveGame to frontend
    Ok(ActiveGame::from(active_info))
}

/// Terminates a running game process.
///
/// Ultra-robust kill implementation with multiple fallback strategies.
///
/// # Arguments
/// * `path` - Game executable path or UWP `AppID`
///
/// # Kill Strategies
/// 1. **UWP Apps**: Uses `PowerShell` `Get-AppxPackage` + `Stop-Process`
/// 2. **Native (Path Match)**: Scans all processes via `sysinfo`, kills if exe path matches
/// 3. **Fallback**: Uses `taskkill /F /IM <filename>` if path search fails
///
/// # Process Matching
/// - **Case-insensitive** path comparison
/// - Kills all processes matching the path (handles launchers + child processes)
/// - Safe to call even if process already closed (returns Ok anyway)
///
/// # Examples (Frontend)
/// ```typescript
/// // Kill by PID (frontend uses activeRunningGame.pid)
/// await invoke('kill_game', { pid: 12345 });
/// ```
#[tauri::command]
pub fn kill_game(pid: u32, container: State<DIContainer>) -> Result<(), String> {
    info!("🎯 Kill request for PID: {}", pid);

    // Special case: PID 0 means Steam or Xbox fallback (no real PID)
    // In this case, we need to find the game by searching active games
    if pid == 0 {
        info!("PID is 0 (Steam/Xbox fallback) - searching active games tracker");

        // Find the active game in tracker (should only be one with PID 0)
        let active_games = container.active_games_tracker.list_active();
        for game_id in active_games {
            if let Some(info) = container.active_games_tracker.get(&game_id) {
                if info.pid.is_none() || info.pid == Some(0) {
                    info!("Found active game without PID: {} - killing by path", game_id);
                    kill_by_path(&info.path)?;
                    container.active_games_tracker.unregister(&game_id);
                    return Ok(());
                }
            }
        }

        warn!("No active game found with PID 0");
        return Ok(()); // Don't block UI
    }

    // Normal case: Kill by PID and path (hybrid approach for robustness)
    // First try to find in active games tracker to get the path
    let active_games = container.active_games_tracker.list_active();
    for game_id in active_games {
        if let Some(info) = container.active_games_tracker.get(&game_id) {
            if info.pid == Some(pid) {
                info!("Found game in tracker: {} - killing by path and PID", game_id);

                // Try PID first (fast), then fallback to path (robust)
                let killed = kill_by_pid(pid).is_ok() || kill_by_path(&info.path).is_ok();

                if killed {
                    container.active_games_tracker.unregister(&game_id);
                    info!("✅ Game killed successfully: {}", game_id);
                    return Ok(());
                }
            }
        }
    }

    // Fallback: Try to kill by PID alone (game not in tracker)
    warn!("Game not found in tracker - attempting kill by PID alone");
    kill_by_pid(pid)?;

    Ok(())
}

/// Helper: Kill process by PID
fn kill_by_pid(pid: u32) -> Result<(), String> {
    use sysinfo::{Pid, System};

    let mut sys = System::new_all();
    sys.refresh_processes();

    let target_pid = Pid::from_u32(pid);
    if let Some(process) = sys.process(target_pid) {
        info!("Killing process by PID: {} ({})", pid, process.name());
        process.kill();
        Ok(())
    } else {
        Err(format!("Process not found: {}", pid))
    }
}

/// Helper: Kill process by path (ultra-robust, works for all game types)
fn kill_by_path(path: &str) -> Result<(), String> {
    info!("BALAM KILLER: Targeting path: {}", path);

    // 1. Handle UWP/Xbox (Microsoft Store)
    if path.contains('!') {
        let family_name = path.split('!').next().ok_or("Invalid AppID")?;
        info!("Killing UWP process family: {}", family_name);
        let _ = std::process::Command::new("powershell")
            .args([
                "-Command",
                &format!("Get-AppxPackage -Name *{family_name}* | Stop-Process -ErrorAction SilentlyContinue"),
            ])
            .output();
        return Ok(());
    }

    // 2. Ultra-Robust Kill: Search all processes by Path
    use sysinfo::System;
    let mut sys = System::new_all();
    sys.refresh_all();

    // Canonicalize target path for comparison
    let target_path_buf = PathBuf::from(path);
    let target_path_str = target_path_buf.to_string_lossy().to_lowercase();
    let mut found_and_killed = false;

    for (pid, process) in sys.processes() {
        if let Some(exe_path) = process.exe() {
            let exe_path_str = exe_path.to_string_lossy().to_lowercase();

            // Check if this process EXE is inside the game folder OR is the same file (Case-Insensitive)
            if exe_path_str.starts_with(&target_path_str) || exe_path_str == target_path_str {
                info!(
                    "BALAM KILLER: MATCH! Terminating process: {:?} (PID: {})",
                    process.name(),
                    pid
                );
                let _ = process.kill();
                found_and_killed = true;
            }
        }
    }

    // 3. Fallback: Standard taskkill if filename is known and path search failed
    if !found_and_killed {
        let path_obj = Path::new(path);
        if path_obj.is_file() {
            if let Some(file_name) = path_obj.file_name().and_then(|s| s.to_str()) {
                info!("BALAM KILLER: Fallback to taskkill for filename: {}", file_name);
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/IM", file_name])
                    .output();
                found_and_killed = true;
            }
        }
    }

    if found_and_killed {
        info!("BALAM KILLER: Success.");
        Ok(())
    } else {
        warn!(
            "BALAM KILLER: Failed to find process. Maybe already closed? Path: {}",
            path
        );
        // We return Ok anyway to not block the UI if the game is already closed
        Ok(())
    }
}

#[tauri::command]
pub fn log_message(message: String) {
    info!("[FRONTEND]: {}", message);
}

#[tauri::command]
#[must_use]
pub fn get_system_status() -> SystemStatus {
    WindowsSystemAdapter::new().get_status()
}
#[tauri::command]
pub fn set_volume(level: u32) -> Result<(), String> {
    WindowsSystemAdapter::new().set_volume(level)
}
#[tauri::command]
pub fn shutdown_pc() -> Result<(), String> {
    WindowsSystemAdapter::new().shutdown()
}
#[tauri::command]
pub fn restart_pc() -> Result<(), String> {
    WindowsSystemAdapter::new().restart()
}
#[tauri::command]
pub fn logout_pc() -> Result<(), String> {
    WindowsSystemAdapter::new().logout()
}

// ============================================================================
// DISPLAY COMMANDS (Brightness, Refresh Rate)
// ============================================================================

/// Gets the current brightness level (0-100).
/// Returns None if brightness control is not supported (e.g., desktop monitors).
#[tauri::command]
pub fn get_brightness() -> Result<Option<u32>, String> {
    WindowsDisplayAdapter::new().get_brightness()
}

/// Sets the brightness level (0-100).
/// Only works on devices with WMI or DDC/CI support.
#[tauri::command]
pub fn set_brightness(level: u32) -> Result<(), String> {
    let config = BrightnessConfig::new(level).map_err(|e| format!("Invalid brightness level: {e}"))?;
    WindowsDisplayAdapter::new().set_brightness(config)
}

/// Gets the current display refresh rate in Hz.
#[tauri::command]
pub fn get_refresh_rate() -> Result<u32, String> {
    WindowsDisplayAdapter::new().get_refresh_rate()
}

/// Sets the display refresh rate (e.g., 40, 60, 120, 144 Hz).
#[tauri::command]
pub fn set_refresh_rate(hz: u32) -> Result<(), String> {
    let config = RefreshRateConfig::new(hz).map_err(|e| format!("Invalid refresh rate: {e}"))?;
    WindowsDisplayAdapter::new().set_refresh_rate(config)
}

/// Lists all supported refresh rates for the current display.
#[tauri::command]
pub fn get_supported_refresh_rates() -> Result<Vec<u32>, String> {
    WindowsDisplayAdapter::new().get_supported_refresh_rates()
}

/// Checks if brightness control is available on this hardware.
#[tauri::command]
#[must_use]
pub fn supports_brightness_control() -> bool {
    WindowsDisplayAdapter::new().supports_brightness_control()
}

// ============================================================================
// PERFORMANCE COMMANDS (TDP Control)
// ============================================================================

/// Gets the current TDP configuration including hardware limits.
#[tauri::command]
pub fn get_tdp_config() -> Result<TDPConfig, String> {
    RyzenAdjAdapter::new().get_tdp_config()
}

/// Sets the TDP to a specific wattage.
/// Automatically clamped to hardware min/max limits.
#[tauri::command]
pub fn set_tdp(watts: u32) -> Result<(), String> {
    info!("Frontend requested TDP change to {}W", watts);
    RyzenAdjAdapter::new().set_tdp(watts)
}

/// Applies a predefined performance profile (Eco, Balanced, Performance).
#[tauri::command]
pub fn apply_performance_profile(profile: String) -> Result<(), String> {
    let profile_enum = match profile.as_str() {
        "eco" => PerformanceProfile::Eco,
        "balanced" => PerformanceProfile::Balanced,
        "performance" => PerformanceProfile::Performance,
        _ => return Err(format!("Unknown profile: {profile}")),
    };

    info!("Applying performance profile: {:?}", profile_enum);
    RyzenAdjAdapter::new().apply_profile(profile_enum)
}

/// Checks if TDP control is supported on this hardware (AMD CPUs only).
#[tauri::command]
#[must_use]
pub fn supports_tdp_control() -> bool {
    RyzenAdjAdapter::new().supports_tdp_control()
}
