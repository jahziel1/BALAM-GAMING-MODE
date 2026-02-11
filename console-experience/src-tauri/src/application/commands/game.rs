use crate::adapters;
use crate::adapters::game::WindowsGameAdapter;
use crate::adapters::identity_engine::IdentityEngine;
use crate::adapters::metadata_adapter::MetadataAdapter;
use crate::application::{ActiveGame, ActiveGameInfo, DIContainer};
use crate::domain::game_process::GameProcess;
use crate::domain::{Game, GameSource};
use crate::ports::game_management_port::GameManagementPort;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{Emitter, Manager, State};
use tracing::{error, info, warn};

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
}

#[must_use]
pub fn get_cache_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    app_handle
        .path()
        .app_local_data_dir()
        .ok()
        .map(|p| p.join("games_cache.json"))
}

/// The core discovery engine with robust de-duplication.
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

#[tauri::command]
pub async fn scan_games(app_handle: tauri::AppHandle, container: State<'_, DIContainer>) -> Result<Vec<Game>, String> {
    let start_time = std::time::Instant::now();

    info!("🔍 Starting async game scan...");

    // Emit progress: Starting
    let _ = app_handle.emit(
        "scan-progress",
        serde_json::json!({
            "step": "Initializing scan...",
            "current": 0,
            "total": 100
        }),
    );

    // Clone necessary data for blocking task
    let container_clone = container.inner().clone();
    let app_handle_clone = app_handle.clone();

    // Run heavy I/O operations in blocking thread pool
    let games = tokio::task::spawn_blocking(move || {
        // Emit progress: Discovering
        let _ = app_handle_clone.emit(
            "scan-progress",
            serde_json::json!({
                "step": "Discovering games...",
                "current": 25,
                "total": 100
            }),
        );

        // 1. Scan all games (heavy I/O: Steam, Epic, Xbox, Registry)
        let mut games = scan_all_games(&container_clone);

        // Emit progress: Deduplicating
        let _ = app_handle_clone.emit(
            "scan-progress",
            serde_json::json!({
                "step": "Deduplicating...",
                "current": 50,
                "total": 100
            }),
        );

        // 2. Merge with Manual games from cache
        if let Some(cache_path) = get_cache_path(&app_handle_clone) {
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

        // Emit progress: Metadata
        let _ = app_handle_clone.emit(
            "scan-progress",
            serde_json::json!({
                "step": "Extracting metadata...",
                "current": 75,
                "total": 100
            }),
        );

        // 3. Enrich metadata
        MetadataAdapter::ensure_metadata_cached(&mut games, &app_handle_clone);

        // 4. Save cache
        if let Some(cache_path) = get_cache_path(&app_handle_clone) {
            if let Some(parent) = cache_path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            let _ = fs::write(&cache_path, serde_json::to_string(&games).unwrap_or_default());
        }

        games
    })
    .await
    .map_err(|e| format!("Scan task failed: {e}"))?;

    let duration_ms = start_time.elapsed().as_millis();

    info!("✅ Async scan complete: {} games in {}ms", games.len(), duration_ms);

    // Emit completion event
    let _ = app_handle.emit(
        "scan-complete",
        serde_json::json!({
            "count": games.len(),
            "duration_ms": duration_ms
        }),
    );

    Ok(games)
}

#[tauri::command]
pub fn add_game_manually(
    path: String,
    title: String,
    app_handle: tauri::AppHandle,
    container: State<DIContainer>,
) -> Result<Game, String> {
    let mut current_games = get_games(app_handle.clone(), container.clone());

    let identity = IdentityEngine::get_identity(&path);
    let canonical_path = &identity.canonical_path;
    let identity_key = identity
        .internal_name
        .as_ref()
        .map_or_else(|| format!("PATH_{canonical_path}"), |n| format!("BIN_{n}"));

    if current_games.iter().any(|g| {
        let gid = IdentityEngine::get_identity(&g.path);
        let gid_canonical_path = &gid.canonical_path;
        let gkey = gid
            .internal_name
            .as_ref()
            .map_or_else(|| format!("PATH_{gid_canonical_path}"), |n| format!("BIN_{n}"));
        gkey == identity_key
    }) {
        return Err("Game already exists in library".to_string());
    }

    let uuid = uuid::Uuid::new_v4();
    let game_id = format!("manual_{uuid}");
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
        .ok_or_else(|| format!("Game not found: {game_id}"))?;

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
        None, // executable_name removed from Game struct
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

    // Return ActiveGame to frontend
    Ok(ActiveGame::from(active_info))
}

#[tauri::command]
pub fn kill_game(pid: u32, container: State<DIContainer>) -> Result<(), String> {
    info!("🎯 Kill request for PID: {}", pid);

    // Special case: PID 0 means Steam or Xbox fallback (no real PID)
    if pid == 0 {
        info!("PID is 0 (Steam/Xbox fallback) - searching active games tracker");

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
        return Ok(());
    }

    let active_games = container.active_games_tracker.list_active();
    for game_id in active_games {
        if let Some(info) = container.active_games_tracker.get(&game_id) {
            if info.pid == Some(pid) {
                info!("Found game in tracker: {} - killing by path and PID", game_id);

                let killed = kill_by_pid(pid).is_ok() || kill_by_path(&info.path).is_ok();

                if killed {
                    container.active_games_tracker.unregister(&game_id);
                    info!("✅ Game killed successfully: {}", game_id);
                    return Ok(());
                }
            }
        }
    }

    warn!("Game not found in tracker - attempting kill by PID alone");
    kill_by_pid(pid)?;

    Ok(())
}

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
        Err(format!("Process not found: {pid}"))
    }
}

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

    let target_path_buf = PathBuf::from(path);
    let target_path_str = target_path_buf.to_string_lossy().to_lowercase();
    let mut found_and_killed = false;

    for (pid, process) in sys.processes() {
        if let Some(exe_path) = process.exe() {
            let exe_path_str = exe_path.to_string_lossy().to_lowercase();

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
        Ok(())
    }
}

#[tauri::command]
pub fn get_running_game() -> Result<Option<GameProcess>, String> {
    let adapter = WindowsGameAdapter::new();
    adapter.get_current_game()
}

#[tauri::command]
pub fn close_current_game(pid: u32) -> Result<bool, String> {
    info!("🔴 CLOSE_CURRENT_GAME COMMAND CALLED - PID: {}", pid);
    let adapter = WindowsGameAdapter::new();
    let result = adapter.close_game(pid);
    match &result {
        Ok(graceful) => {
            info!("✅ close_game returned: graceful={}", graceful);
        },
        Err(e) => {
            error!("❌ close_game FAILED: {}", e);
        },
    }
    result
}
