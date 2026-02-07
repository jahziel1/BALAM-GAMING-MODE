use crate::adapters;
use crate::adapters::bluetooth::WindowsBluetoothAdapter;
use crate::adapters::display::WindowsDisplayAdapter;
use crate::adapters::game::WindowsGameAdapter;
use crate::adapters::haptic::GilrsHapticAdapter;
use crate::adapters::identity_engine::IdentityEngine;
use crate::adapters::metadata_adapter::MetadataAdapter;
use crate::adapters::performance::RyzenAdjAdapter;
use crate::adapters::performance_monitoring::{PresentMonDownloader, RTSSInstaller, WindowsPerfMonitor};
use crate::adapters::wifi::WindowsWiFiAdapter;
use crate::adapters::windows_system_adapter::WindowsSystemAdapter;
use crate::application::{ActiveGame, ActiveGameInfo, DIContainer};
use crate::domain::game_process::GameProcess;
use crate::domain::performance::{FPSStats, PerformanceMetrics};
use crate::domain::{
    BrightnessConfig, Game, GameSource, HapticFeedback, HapticIntensity, PerformanceProfile, RefreshRateConfig,
    TDPConfig,
};
use crate::ports::bluetooth_port::{BluetoothDevice, BluetoothPairingConfig, BluetoothPort};
use crate::ports::display_port::DisplayPort;
use crate::ports::game_management_port::GameManagementPort;
use crate::ports::haptic_port::HapticPort;
use crate::ports::performance_port::PerformancePort;
use crate::ports::system_port::{SystemPort, SystemStatus};
use crate::ports::wifi_port::{WiFiConfig, WiFiNetwork, WiFiPort};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use tauri::{Emitter, Manager, State};
use tracing::{error, info, warn};

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

/// Force re-scans all game sources (ASYNC - non-blocking).
///
/// Performs game discovery asynchronously using Tokio spawn_blocking.
/// Emits progress events during scanning for real-time UI updates.
///
/// # Performance
/// - **Non-blocking**: Runs in Tokio thread pool, UI stays responsive
/// - **Progress events**: Emits "scan-progress" events during discovery
/// - **Duration**: ~1-4 seconds (same as sync, but doesn't freeze UI)
///
/// # Events Emitted
/// - `scan-progress`: { step: string, current: number, total: number }
/// - `scan-complete`: { count: number, duration_ms: number }
///
/// # Use Case
/// Called by frontend when user clicks "Refresh Library" button.
///
/// # Frontend Example
/// ```typescript
/// // Listen for progress
/// await listen('scan-progress', (event) => {
///   console.log(`Scanning: ${event.payload.step} (${event.payload.current}/${event.payload.total})`);
/// });
///
/// // Start async scan
/// const games = await invoke('scan_games');
/// ```
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
    let mut current_games = get_games(app_handle.clone(), container);

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
        Err(format!("Process not found: {pid}"))
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

/// Lists all available audio output devices.
///
/// # Returns
/// Vector of audio devices with their properties (id, name, type, is_default).
///
/// # Errors
/// Returns error if COM initialization fails or device enumeration errors.
#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<crate::ports::system_port::AudioDevice>, String> {
    WindowsSystemAdapter::new().list_audio_devices()
}

/// Sets the default audio output device.
///
/// # Arguments
/// * `device_id` - Unique device identifier from `list_audio_devices()`
///
/// # Errors
/// Returns error if device not found or setting default fails.
#[tauri::command]
pub fn set_default_audio_device(device_id: String) -> Result<(), String> {
    WindowsSystemAdapter::new().set_default_audio_device(&device_id)
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
/// Returns `None` if brightness control is not supported (e.g., desktop monitors).
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

// ============================================================================
// WiFi Management Commands
// ============================================================================

/// Scans for available `WiFi` networks.
///
/// # Returns
/// List of networks sorted by signal strength (strongest first).
#[tauri::command]
pub fn scan_wifi_networks() -> Result<Vec<WiFiNetwork>, String> {
    let adapter = WindowsWiFiAdapter::new()?;
    adapter.scan_networks()
}

/// Gets the currently connected `WiFi` network.
///
/// # Returns
/// - `Ok(`Some`(network))` if connected to `WiFi`
/// - `Ok(`None`)` if not connected
#[tauri::command]
pub fn get_current_wifi() -> Result<Option<WiFiNetwork>, String> {
    let adapter = WindowsWiFiAdapter::new()?;
    adapter.get_current_network()
}

/// Connects to a `WiFi` network.
///
/// # Parameters
/// - `ssid`: Network name
/// - `password`: WPA/WPA2 password (empty string for open networks)
#[tauri::command]
pub fn connect_wifi(ssid: String, password: String) -> Result<(), String> {
    let adapter = WindowsWiFiAdapter::new()?;
    adapter.connect_network(WiFiConfig {
        ssid,
        password,
        auto_connect: true,
    })
}

/// Disconnects from the current `WiFi` network.
#[tauri::command]
pub fn disconnect_wifi() -> Result<(), String> {
    let adapter = WindowsWiFiAdapter::new()?;
    adapter.disconnect()
}

/// Forgets a saved `WiFi` network profile.
///
/// # Parameters
/// - `ssid`: Network name to forget
#[tauri::command]
pub fn forget_wifi(ssid: String) -> Result<(), String> {
    let adapter = WindowsWiFiAdapter::new()?;
    adapter.forget_network(&ssid)
}

/// Gets the list of saved `WiFi` network profiles.
///
/// # Returns
/// List of saved network SSIDs.
#[tauri::command]
pub fn get_saved_networks() -> Result<Vec<String>, String> {
    let adapter = WindowsWiFiAdapter::new()?;
    adapter.get_saved_networks()
}

/// Gets the signal strength of the currently connected network.
///
/// # Returns
/// - `Ok(`Some`(strength))` if connected (0-100%)
/// - `Ok(`None`)` if not connected
#[tauri::command]
pub fn get_wifi_signal_strength() -> Result<Option<u32>, String> {
    let adapter = WindowsWiFiAdapter::new()?;
    adapter.get_signal_strength()
}

// ============================================================================
// Bluetooth Management Commands
// ============================================================================

/// Checks if `Bluetooth` is available and enabled.
///
/// # Returns
/// - `Ok(true)` if Bluetooth is available and enabled
/// - `Ok(false)` if Bluetooth is disabled or no adapter
#[tauri::command]
pub async fn is_bluetooth_available() -> Result<bool, String> {
    let adapter = WindowsBluetoothAdapter::new();
    adapter.is_bluetooth_available().await
}

/// Enables or disables `Bluetooth` radio.
///
/// # Parameters
/// - `enabled`: true to enable, false to disable
#[tauri::command]
pub async fn set_bluetooth_enabled(enabled: bool) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    adapter.set_bluetooth_enabled(enabled).await
}

/// Gets the list of paired `Bluetooth` devices.
///
/// # Returns
/// List of devices that have been paired with this computer.
#[tauri::command]
pub async fn get_paired_bluetooth_devices() -> Result<Vec<BluetoothDevice>, String> {
    let adapter = WindowsBluetoothAdapter::new();
    adapter.get_paired_devices().await
}

/// Scans for available `Bluetooth` devices nearby.
///
/// # Returns
/// List of discovered devices, including paired and unpaired.
#[tauri::command]
pub async fn scan_bluetooth_devices() -> Result<Vec<BluetoothDevice>, String> {
    let adapter = WindowsBluetoothAdapter::new();
    adapter.scan_devices().await
}

/// Gets the currently connected `Bluetooth` devices.
///
/// # Returns
/// List of devices currently connected to this computer.
#[tauri::command]
pub async fn get_connected_bluetooth_devices() -> Result<Vec<BluetoothDevice>, String> {
    let adapter = WindowsBluetoothAdapter::new();
    adapter.get_connected_devices().await
}

/// Pairs with a `Bluetooth` device.
///
/// # Parameters
/// - `address`: Device MAC address
/// - `pin`: PIN/passkey (empty for SSP)
#[tauri::command]
pub async fn pair_bluetooth_device(address: String, pin: String) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    adapter.pair_device(BluetoothPairingConfig { address, pin }).await
}

/// Removes pairing with a `Bluetooth` device.
///
/// # Parameters
/// - `address`: Device MAC address to unpair
#[tauri::command]
pub async fn unpair_bluetooth_device(address: String) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    adapter.unpair_device(&address).await
}

/// Connects to a paired `Bluetooth` device.
///
/// # Parameters
/// - `address`: Device MAC address to connect
#[tauri::command]
pub async fn connect_bluetooth_device(address: String) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    adapter.connect_device(&address).await
}

/// Disconnects from a `Bluetooth` device.
///
/// # Parameters
/// - `address`: Device MAC address to disconnect
#[tauri::command]
pub async fn disconnect_bluetooth_device(address: String) -> Result<(), String> {
    let adapter = WindowsBluetoothAdapter::new();
    adapter.disconnect_device(&address).await
}

// ============================================================================
// Game Management Commands
// ============================================================================

/// Gets the currently running game process.
///
/// Returns information about the active game if one is running,
/// or `None` if no game is currently active.
///
/// # Examples (Frontend)
/// ```typescript
/// const game = await invoke<GameProcess | null>('get_running_game');
/// if (game) {
///     console.log(`Running: ${game.name} (PID: ${game.pid})`);
/// }
/// ```
#[tauri::command]
pub fn get_running_game() -> Result<Option<GameProcess>, String> {
    let adapter = WindowsGameAdapter::new();
    adapter.get_current_game()
}

/// Closes the currently running game gracefully.
///
/// Attempts graceful shutdown using WM_CLOSE first (allows save prompts),
/// then falls back to TerminateProcess if the game doesn't respond within 5 seconds.
///
/// # Arguments
/// * `pid` - Process ID of the game to close
///
/// # Returns
/// - `Ok(true)` - Game closed gracefully (WM_CLOSE succeeded)
/// - `Ok(false)` - Game was force-terminated (unresponsive)
/// - `Err(...)` - Close operation failed
///
/// # Examples (Frontend)
/// ```typescript
/// const wasGraceful = await invoke<boolean>('close_current_game', { pid: 12345 });
/// if (!wasGraceful) {
///     console.warn('Game did not respond to close request');
/// }
/// ```
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

// ============================================================================
// Performance Monitoring Commands
// ============================================================================

/// Global performance monitor instance (singleton).
static PERF_MONITOR: LazyLock<WindowsPerfMonitor> = LazyLock::new(WindowsPerfMonitor::new);

/// Gets current FPS statistics.
///
/// Returns FPS data if a game is running and FPS monitoring is active.
///
/// # Examples (Frontend)
/// ```typescript
/// const fps = await invoke<FPSStats | null>('get_fps_stats');
/// if (fps) {
///     console.log(`FPS: ${fps.current_fps.toFixed(0)}`);
/// }
/// ```
#[tauri::command]
pub fn get_fps_stats() -> Result<Option<FPSStats>, String> {
    let metrics = PERF_MONITOR.get_metrics();
    Ok(metrics.fps)
}

/// Gets complete system performance metrics (CPU, GPU, RAM, Temps, FPS).
///
/// # Returns
/// PerformanceMetrics containing:
/// - cpu_usage: CPU percentage (0-100)
/// - gpu_usage: GPU percentage (0-100, via `NVML` for NVIDIA)
/// - ram_used_gb / ram_total_gb: RAM usage in GB
/// - gpu_temp_c: GPU temperature (via NVML, `None` if not available)
/// - gpu_power_w: GPU power draw in Watts (via `NVML`)
/// - fps: FPS stats if monitoring active (via `PresentMon`)
///
/// # Examples (Frontend)
/// ```typescript
/// const metrics = await invoke<PerformanceMetrics>('get_performance_metrics');
/// console.log(`CPU: ${metrics.cpu_usage.toFixed(1)}%`);
/// console.log(`GPU: ${metrics.gpu_usage.toFixed(1)}%`);
/// console.log(`RAM: ${metrics.ram_used_gb.toFixed(1)}/${metrics.ram_total_gb.toFixed(0)} GB`);
/// if (metrics.fps) {
///     console.log(`FPS: ${metrics.fps.current_fps.toFixed(0)}`);
/// }
/// ```
#[tauri::command]
pub fn get_performance_metrics() -> Result<PerformanceMetrics, String> {
    Ok(PERF_MONITOR.get_metrics())
}

/// Starts FPS monitoring for a specific process.
///
/// Uses `PresentMon`/`ETW` to monitor frame timing in real-time.
///
/// # Arguments
/// * `pid` - Process ID to monitor (0 = all processes)
///
/// # Returns
/// - `Ok(())` - FPS monitoring started successfully
/// - `Err(...)` - Failed to start (PresentMon not found, spawn error, etc.)
///
/// # Examples (Frontend)
/// ```typescript
/// // Start monitoring current game
/// await invoke('start_fps_monitoring', { pid: game.pid });
///
/// // Start monitoring all processes (expensive)
/// await invoke('start_fps_monitoring', { pid: 0 });
/// ```
#[tauri::command]
pub fn start_fps_monitoring(pid: u32) -> Result<(), String> {
    PERF_MONITOR.start_fps_monitoring(pid)
}

/// Stops FPS monitoring.
///
/// Terminates `PresentMon` process and clears FPS stats.
///
/// # Examples (Frontend)
/// ```typescript
/// await invoke('stop_fps_monitoring');
/// ```
#[tauri::command]
pub fn stop_fps_monitoring() -> Result<(), String> {
    PERF_MONITOR.stop_fps_monitoring()
}

/// Checks if FPS monitoring is currently active.
///
/// # Examples (Frontend)
/// ```typescript
/// const isActive = await invoke<boolean>('is_fps_monitoring_active');
/// ```
#[tauri::command]
pub fn is_fps_monitoring_active() -> bool {
    PERF_MONITOR.is_fps_monitoring_active()
}

/// Checks if `NVML` (NVIDIA GPU monitoring) is available.
///
/// # Examples (Frontend)
/// ```typescript
/// const hasNVIDIA = await invoke<boolean>('is_nvml_available');
/// if (!hasNVIDIA) {
///     console.log('NVIDIA GPU not detected');
/// }
/// ```
#[tauri::command]
pub fn is_nvml_available() -> bool {
    PERF_MONITOR.is_nvml_available()
}

/// Pre-downloads `PresentMon` if not already available.
///
/// Optional command to download `PresentMon` ahead of time.
/// If not called, `PresentMon` will be downloaded automatically on first use.
///
/// # Returns
/// - `Ok(path)` - Path to PresentMon64.exe
/// - `Err(...)` - Download failed
///
/// # Examples (Frontend)
/// ```typescript
/// // `Option`al: Pre-download during app initialization
/// try {
///     const path = await invoke<string>('download_presentmon');
///     console.log('`PresentMon` ready at:', path);
/// } catch (error) {
///     console.warn('`PresentMon` download failed:', error);
/// }
/// ```
#[tauri::command]
pub fn download_presentmon() -> Result<String, String> {
    match PresentMonDownloader::ensure_available() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(e),
    }
}

/// Checks if `PresentMon` is available (bundled or cached).
///
/// # Examples (Frontend)
/// ```typescript
/// const available = await invoke<boolean>('is_presentmon_available');
/// if (!available) {
///     console.log('`PresentMon` will be downloaded on first use');
/// }
/// ```
#[tauri::command]
#[must_use]
pub fn is_presentmon_available() -> bool {
    PresentMonDownloader::get_presentmon_path()
        .map(|path| path.exists())
        .unwrap_or(false)
}

/// Checks if `RTSS` (RivaTuner Statistics Server) is available for fullscreen overlay.
///
/// `RTSS` enables the overlay to work in fullscreen exclusive mode by injecting
/// into the game process. User must have `RTSS` installed (comes with MSI Afterburner).
///
/// # Returns
/// - `true` if RTSS is available and can be used for fullscreen overlay
/// - `false` if RTSS not installed (overlay limited to borderless windowed)
///
/// # Examples (Frontend)
/// ```typescript
/// const hasRTSS = await invoke<boolean>('is_rtss_available');
/// if (!hasRTSS) {
///     toast.info('Install MSI Afterburner for fullscreen overlay support');
/// }
/// ```
#[tauri::command]
pub fn is_rtss_available() -> bool {
    PERF_MONITOR.is_rtss_available()
}

/// Enables `RTSS` overlay mode (for fullscreen games).
///
/// When enabled, metrics are written to `RTSS` shared memory instead of
/// the window overlay. `RTSS` then renders them inside the game.
///
/// # Returns
/// - `Ok(())` if RTSS mode enabled successfully
/// - `Err(...)` if RTSS not available
///
/// # Examples (Frontend)
/// ```typescript
/// try {
///     await invoke('enable_rtss_overlay');
///     console.log('Using `RTSS` for fullscreen overlay');
/// } catch (error) {
///     console.error('`RTSS` not available:', error);
/// }
/// ```
#[tauri::command]
pub fn enable_rtss_overlay() -> Result<(), String> {
    PERF_MONITOR.enable_rtss_overlay()
}

/// Disables `RTSS` overlay mode (back to window overlay).
///
/// Clears `RTSS` overlay and returns to using the window overlay.
///
/// # Examples (Frontend)
/// ```typescript
/// await invoke('disable_rtss_overlay');
/// console.log('Using window overlay');
/// ```
#[tauri::command]
pub fn disable_rtss_overlay() -> Result<(), String> {
    PERF_MONITOR.disable_rtss_overlay()
}

/// Checks if `RTSS` overlay mode is currently active.
///
/// # Returns
/// - `true` if using RTSS overlay (fullscreen mode)
/// - `false` if using window overlay (borderless mode)
///
/// # Examples (Frontend)
/// ```typescript
/// const usingRTSS = await invoke<boolean>('is_using_rtss_overlay');
/// setOverlayMode(usingRTSS ? 'rtss' : 'window');
/// ```
#[tauri::command]
pub fn is_using_rtss_overlay() -> bool {
    PERF_MONITOR.is_using_rtss_overlay()
}

/// Updates `RTSS` overlay with current metrics.
///
/// This should be called periodically (e.g., every 500ms) when `RTSS` mode is enabled.
/// The metrics are formatted and written to `RTSS` shared memory.
///
/// # Returns
/// - `Ok(())` if RTSS updated successfully
/// - `Err(...)` if RTSS not available or update failed
///
/// # Examples (Frontend)
/// ```typescript
/// // In a setInterval when `RTSS` mode is active
/// if (await invoke<boolean>('is_using_rtss_overlay')) {
///     await invoke('update_rtss_overlay');
/// }
/// ```
#[tauri::command]
pub fn update_rtss_overlay() -> Result<(), String> {
    PERF_MONITOR.update_rtss_overlay()
}

// ===== RTSS AUTO-INSTALLATION COMMANDS =====

/// Checks if Windows Package Manager (winget) is available on the system.
///
/// Winget is required for auto-installing `RTSS`. It comes pre-installed on:
/// - Windows 11 (all versions)
/// - Windows 10 version 1809 and later
///
/// Older systems can install winget via Microsoft Store (App Installer).
///
/// # Returns
/// - `true` if winget is available and functional
/// - `false` if winget not found
///
/// # Frontend Example
/// ```typescript
/// const canAutoInstall = await invoke<boolean>('is_winget_available');
/// if (!canAutoInstall) {
///     console.warn('Winget not available - manual installation required');
/// }
/// ```
#[tauri::command]
#[must_use]
pub fn is_winget_available() -> bool {
    RTSSInstaller::is_winget_available()
}

/// Checks if `RTSS` is already installed on the system.
///
/// This detects `RTSS` installed via winget. Note: Manual `RTSS` installations
/// or MSI Afterburner bundles may not be detected by this check.
///
/// For a more comprehensive check (including manual installs), use
/// `is_rtss_available()` which checks for RTSS shared memory.
///
/// # Returns
/// - `true` if RTSS is installed (detected by winget)
/// - `false` if RTSS not found
///
/// # Frontend Example
/// ```typescript
/// const installed = await invoke<boolean>('is_rtss_installed_via_winget');
/// if (!installed) {
///     // Show "Install `RTSS`" button
/// }
/// ```
#[tauri::command]
#[must_use]
pub fn is_rtss_installed_via_winget() -> bool {
    RTSSInstaller::is_rtss_installed()
}

/// Installs `RTSS` automatically via Windows Package Manager (winget).
///
/// This downloads and installs `RTSS` from the official Guru3D source
/// via winget, with minimal user interaction (silent install).
///
/// **IMPORTANT:** This is an ASYNC command that runs in a background thread
/// to avoid blocking the UI during the ~30 second installation.
///
/// ## Process
/// 1. Verifies winget is available
/// 2. Launches installation in background thread
/// 3. Triggers UAC prompt for admin privileges
/// 4. Downloads `RTSS` from official source (~10MB)
/// 5. Installs silently in background (~30 seconds)
/// 6. Auto-accepts license agreements
///
/// ## Requirements
/// - Winget available (Windows 10 1809+ or Windows 11)
/// - User grants UAC admin prompt
/// - Internet connection for download
///
/// # Returns
/// - Returns immediately (does NOT wait for installation)
/// - `Ok(())` if installation started successfully
/// - `Err(...)` if failed to start installation
///
/// # Frontend Example
/// ```typescript
/// const handleAutoInstall = async () => {
///     try {
///         setInstalling(true);
///         // This returns immediately, installation runs in background
///         await invoke('install_rtss_via_winget');
///
///         // Poll for completion
///         const checkInstalled = setInterval(async () => {
///             const installed = await invoke('is_rtss_available');
///             if (installed) {
///                 clearInterval(checkInstalled);
///                 setInstalling(false);
///                 toast.success('`RTSS` installed! Please restart Balam.');
///             }
///         }, 2000); // Check every 2 seconds
///     } catch (error) {
///         setInstalling(false);
///         toast.error(`Installation failed: ${error}`);
///     }
/// };
/// ```
#[tauri::command]
pub async fn install_rtss_via_winget() -> Result<(), String> {
    info!("Frontend requested RTSS auto-installation (async)");

    // Run installation in a blocking thread to avoid blocking Tauri's async runtime
    tokio::task::spawn_blocking(move || {
        info!("Starting RTSS installation in background thread...");
        match RTSSInstaller::install_rtss_silent() {
            Ok(()) => {
                info!("✅ RTSS installation completed successfully");
            },
            Err(e) => {
                warn!("❌ RTSS installation failed: {}", e);
            },
        }
    });

    // Return immediately without waiting for installation to complete
    Ok(())
}

/// Gets the installed version of `RTSS` (if available).
///
/// # Returns
/// - `Some(version)` if RTSS is installed (e.g., "7.3.7")
/// - `None` if RTSS not installed
///
/// # Frontend Example
/// ```typescript
/// const version = await invoke<string | null>('get_rtss_version');
/// if (version) {
///     console.log(`RTSS version: ${version}`);
/// }
/// ```
#[tauri::command]
#[must_use]
pub fn get_rtss_version() -> Option<String> {
    RTSSInstaller::get_rtss_version()
}

/// Uninstalls `RTSS` via Windows Package Manager (winget).
///
/// This is useful for testing or if the user wants to remove `RTSS`.
/// Runs asynchronously in background thread to avoid blocking UI.
///
/// # Returns
/// - Returns immediately (does NOT wait for uninstallation)
/// - `Ok(())` if uninstallation started successfully
/// - `Err(...)` if failed to start uninstallation
///
/// # Frontend Example
/// ```typescript
/// await invoke('uninstall_rtss_via_winget');
/// // Poll to check if uninstalled
/// const stillInstalled = await invoke('is_rtss_available');
/// ```
#[tauri::command]
pub async fn uninstall_rtss_via_winget() -> Result<(), String> {
    info!("Frontend requested RTSS uninstallation (async)");

    // Run uninstallation in a blocking thread
    tokio::task::spawn_blocking(move || {
        info!("Starting RTSS uninstallation in background thread...");
        match RTSSInstaller::uninstall_rtss() {
            Ok(()) => {
                info!("✅ RTSS uninstallation completed successfully");
            },
            Err(e) => {
                warn!("❌ RTSS uninstallation failed: {}", e);
            },
        }
    });

    Ok(())
}

// ============================================================================
// HAPTIC FEEDBACK COMMANDS
// ============================================================================

/// Triggers haptic feedback on connected gamepads.
///
/// Provides dual-motor rumble effects for navigation, actions, and events.
/// Gracefully degrades if no gamepad with force feedback is connected.
///
/// # Parameters
/// - `intensity`: "weak" | "medium" | "strong"
/// - `duration_ms`: Duration in milliseconds (50-2000ms, clamped for safety)
///
/// # Returns
/// - `Ok(())` if haptic triggered successfully (or no gamepads available)
/// - `Err(...)` if internal error occurred
///
/// # Frontend Example
/// ```typescript
/// // Navigation feedback (weak, 200ms)
/// await invoke('trigger_haptic', { intensity: 'weak', duration_ms: 200 });
///
/// // Action feedback (medium, 300ms)
/// await invoke('trigger_haptic', { intensity: 'medium', duration_ms: 300 });
///
/// // Event feedback (strong, 500ms)
/// await invoke('trigger_haptic', { intensity: 'strong', duration_ms: 500 });
/// ```
#[tauri::command]
pub async fn trigger_haptic(intensity: String, duration_ms: u64) -> Result<(), String> {
    let intensity_enum = match intensity.to_lowercase().as_str() {
        "weak" => HapticIntensity::Weak,
        "medium" => HapticIntensity::Medium,
        "strong" => HapticIntensity::Strong,
        _ => return Err(format!("Invalid intensity: {intensity}")),
    };

    let feedback = HapticFeedback::new(intensity_enum, duration_ms);

    // Create temporary adapter (or get from DI container in future)
    let adapter = GilrsHapticAdapter::new().map_err(|e| format!("Failed to initialize haptic adapter: {e}"))?;

    adapter.trigger(feedback).await
}

/// Checks if haptic feedback is supported (gamepad with force feedback connected).
///
/// # Returns
/// - `true` if at least one gamepad with force feedback is connected
/// - `false` if no compatible gamepads available
///
/// # Frontend Example
/// ```typescript
/// const supported = await invoke<boolean>('is_haptic_supported');
/// if (supported) {
///     // Enable haptic features in UI
/// }
/// ```
#[tauri::command]
pub fn is_haptic_supported() -> Result<bool, String> {
    let adapter = GilrsHapticAdapter::new().map_err(|e| format!("Failed to initialize haptic adapter: {e}"))?;

    Ok(adapter.is_supported())
}

/// Triggers navigation haptic feedback (weak, 200ms).
///
/// Convenience command for common navigation events.
///
/// # Frontend Example
/// ```typescript
/// await invoke('haptic_navigation');
/// ```
#[tauri::command]
pub async fn haptic_navigation() -> Result<(), String> {
    trigger_haptic("weak".to_string(), 200).await
}

/// Triggers action haptic feedback (medium, 300ms).
///
/// Convenience command for button press confirmations.
///
/// # Frontend Example
/// ```typescript
/// await invoke('haptic_action');
/// ```
#[tauri::command]
pub async fn haptic_action() -> Result<(), String> {
    trigger_haptic("medium".to_string(), 300).await
}

/// Triggers event haptic feedback (strong, 500ms).
///
/// Convenience command for important events (game launch, achievements, etc).
///
/// # Frontend Example
/// ```typescript
/// await invoke('haptic_event');
/// ```
#[tauri::command]
pub async fn haptic_event() -> Result<(), String> {
    trigger_haptic("strong".to_string(), 500).await
}
