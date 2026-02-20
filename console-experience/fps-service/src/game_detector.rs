/// Game Detector - DirectX version and Fullscreen Optimization detection
///
/// Detects:
/// - DirectX version (9, 11, 12) from ETW events and process analysis
/// - Fullscreen Optimization (FSO) status from registry
/// - Whether TOPMOST overlay will work
///
/// # Strategy Selection
/// - DX12 or (DX11 + FSO) → TOPMOST overlay works
/// - DX9 or (DX11 without FSO) → DLL injection needed
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use std::collections::HashMap;
use std::path::PathBuf;
use windows::core::Result as WinResult;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
    PROCESS_QUERY_LIMITED_INFORMATION,
};
use winreg::enums::*;
use winreg::RegKey;

/// Game information for overlay strategy selection
#[derive(Debug, Clone)]
pub struct GameInfo {
    pub pid: u32,
    pub name: String,
    pub exe_path: String,
    pub dx_version: u32, // 9, 11, or 12
    pub has_fso: bool,
    pub is_compatible_topmost: bool,
}

/// DirectX version cache (PID → DX version)
/// Populated by ETW event analysis
static DX_VERSION_CACHE: Lazy<Mutex<HashMap<u32, u32>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Get game information for a given process ID
pub fn get_game_info(pid: u32) -> Option<GameInfo> {
    let (name, exe_path) = get_process_info(pid)?;

    // Detect DirectX version
    let dx_version = detect_dx_version(pid, &exe_path);

    // Detect FSO status
    let has_fso = detect_fso_status(&exe_path);

    // Determine if TOPMOST overlay will work
    let is_compatible_topmost = is_topmost_compatible(dx_version, has_fso);

    Some(GameInfo {
        pid,
        name,
        exe_path,
        dx_version,
        has_fso,
        is_compatible_topmost,
    })
}

/// Register DirectX version from ETW event analysis
/// Called when we detect DXGI events with specific characteristics
pub fn register_dx_version(pid: u32, version: u32) {
    DX_VERSION_CACHE.lock().insert(pid, version);
}

/// Get process name and executable path
fn get_process_info(pid: u32) -> Option<(String, String)> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;

        let mut buffer = [0u16; 260]; // MAX_PATH
        let mut size = buffer.len() as u32;
        let pwstr = windows::core::PWSTR(buffer.as_mut_ptr());

        let result = QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, pwstr, &mut size);
        let _ = CloseHandle(handle);

        if result.is_ok() && size > 0 {
            let path = String::from_utf16_lossy(&buffer[0..size as usize]);
            let name = path
                .rsplit('\\')
                .next()
                .unwrap_or(&path)
                .to_string();

            Some((name, path))
        } else {
            None
        }
    }
}

/// Detect DirectX version for a process
///
/// Strategy:
/// 1. Check ETW cache first (from event analysis)
/// 2. Fall back to DLL analysis if not in cache
fn detect_dx_version(pid: u32, exe_path: &str) -> u32 {
    // Check ETW cache first
    if let Some(&version) = DX_VERSION_CACHE.lock().get(&pid) {
        return version;
    }

    // Fall back to DLL analysis
    detect_dx_version_from_dlls(exe_path)
}

/// Detect DirectX version by analyzing loaded DLLs
///
/// Heuristic:
/// - d3d12.dll → DirectX 12
/// - d3d11.dll → DirectX 11
/// - d3d9.dll → DirectX 9
/// - Default → 11 (most modern games)
fn detect_dx_version_from_dlls(exe_path: &str) -> u32 {
    // Get directory of executable
    let exe_dir = PathBuf::from(exe_path)
        .parent()
        .map(|p| p.to_path_buf());

    if let Some(dir) = exe_dir {
        // Check for DirectX DLLs in same directory
        if dir.join("d3d12.dll").exists() {
            return 12;
        }
        if dir.join("d3d11.dll").exists() {
            return 11;
        }
        if dir.join("d3d9.dll").exists() {
            return 9;
        }
    }

    // Check Windows System32 for DLL hints (less reliable)
    // Most modern games use DX11/DX12, so default to 11
    11
}

/// Detect Fullscreen Optimization status from Windows registry
///
/// Registry location:
/// HKCU\System\GameConfigStore\Children\{hash}\GameDVR_FSEBehavior
///
/// Values:
/// - 0 = FSO disabled (exclusive fullscreen)
/// - 2 = FSO enabled (borderless optimized)
/// - Missing = FSO enabled by default (Windows 10/11)
fn detect_fso_status(exe_path: &str) -> bool {
    // Normalize path
    let normalized_path = exe_path.to_lowercase().replace('/', "\\");

    // Try to read from registry
    if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER).open_subkey("System\\GameConfigStore\\Children") {
        // Iterate through children to find matching executable
        for child in hkcu.enum_keys().filter_map(|k| k.ok()) {
            if let Ok(child_key) = hkcu.open_subkey(&child) {
                // Check if MatchedExeFullPath matches our executable
                if let Ok(matched_path) = child_key.get_value::<String, _>("MatchedExeFullPath") {
                    let matched_normalized = matched_path.to_lowercase().replace('/', "\\");

                    if matched_normalized == normalized_path {
                        // Found matching entry, check GameDVR_FSEBehavior
                        if let Ok(fse_behavior) = child_key.get_value::<u32, _>("GameDVR_FSEBehavior") {
                            // 0 = Disabled, 2 = Enabled
                            return fse_behavior == 2;
                        }
                        // If key exists but value is missing, FSO is enabled by default
                        return true;
                    }
                }
            }
        }
    }

    // If no registry entry found, Windows 10/11 enables FSO by default
    // for most games (unless explicitly disabled by user)
    true
}

/// Determine if TOPMOST overlay strategy will work
///
/// Decision matrix:
/// - DX12: Always works (FSO is built-in)
/// - DX11 + FSO: Works
/// - DX11 without FSO: Needs DLL injection
/// - DX9: Always needs DLL injection
fn is_topmost_compatible(dx_version: u32, has_fso: bool) -> bool {
    match dx_version {
        12 => true,           // DX12 always has FSO
        11 => has_fso,        // DX11 works if FSO enabled
        9 | _ => false,       // DX9 and unknown need DLL injection
    }
}

/// Force enable FSO for a game (registry modification)
///
/// Modifies registry to enable FSO for games that don't have it.
/// Requires elevation, typically done from Tauri backend.
pub fn force_enable_fso(exe_path: &str) -> WinResult<()> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (game_key, _) = hkcu.create_subkey("System\\GameConfigStore\\Children")?;

    // Create new entry for game
    let game_hash = format!("{:x}", calculate_path_hash(exe_path));
    let (entry, _) = game_key.create_subkey(&game_hash)?;

    // Set values
    entry.set_value("MatchedExeFullPath", &exe_path)?;
    entry.set_value("GameDVR_FSEBehavior", &2u32)?; // 2 = FSO enabled

    Ok(())
}

/// Calculate hash for executable path (simple FNV-1a hash)
fn calculate_path_hash(path: &str) -> u32 {
    const FNV_OFFSET: u32 = 2166136261;
    const FNV_PRIME: u32 = 16777619;

    path.bytes().fold(FNV_OFFSET, |hash, byte| {
        (hash ^ byte as u32).wrapping_mul(FNV_PRIME)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_topmost_compatibility() {
        assert!(is_topmost_compatible(12, false)); // DX12 always works
        assert!(is_topmost_compatible(12, true));

        assert!(is_topmost_compatible(11, true));  // DX11 with FSO works
        assert!(!is_topmost_compatible(11, false)); // DX11 without FSO needs DLL

        assert!(!is_topmost_compatible(9, true));   // DX9 needs DLL
        assert!(!is_topmost_compatible(9, false));
    }

    #[test]
    fn test_path_hash() {
        let hash1 = calculate_path_hash("C:\\Games\\game.exe");
        let hash2 = calculate_path_hash("C:\\Games\\game.exe");
        let hash3 = calculate_path_hash("C:\\Games\\other.exe");

        assert_eq!(hash1, hash2); // Same path = same hash
        assert_ne!(hash1, hash3); // Different path = different hash
    }
}
