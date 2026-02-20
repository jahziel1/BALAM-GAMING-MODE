/// DLL Overlay - Injection-based overlay for legacy games
///
/// Uses CreateRemoteThread to inject overlay.dll into game process.
/// Works with DirectX 9 games or DX11 games without FSO.
///
/// # Implementation
/// - DLL injection via CreateRemoteThread + LoadLibraryW
/// - Whitelist of safe games (single-player, no anti-cheat)
/// - Safe memory allocation in remote process
/// - Error handling and cleanup
///
/// # Safety
/// - Only injects into whitelisted games
/// - No anti-cheat bypass attempted
/// - Used for legitimate overlay functionality
/// - User owns the games and system
///
/// # Architecture
/// ```
/// Balam Console
///     ↓
/// DllOverlay::show() → CreateRemoteThread
///     ↓
/// Game Process → LoadLibraryW("overlay.dll")
///     ↓
/// overlay.dll → Kiero hook → ImGui rendering
/// ```
use super::detector::GameInfo;
use super::strategy::{OverlayStrategy, OverlayType};
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use tauri::AppHandle;
use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
use windows::Win32::System::Memory::{
    VirtualAllocEx, VirtualFreeEx, MEM_COMMIT, MEM_RELEASE, MEM_RESERVE, PAGE_READWRITE,
};
use windows::Win32::System::Threading::{CreateRemoteThread, OpenProcess, WaitForSingleObject, PROCESS_ALL_ACCESS};

/// Whitelist of games safe for DLL injection
///
/// These are primarily:
/// - Single-player games
/// - Games without anti-cheat
/// - Older DirectX 9 titles
/// - Games known to work with overlays
///
/// **CRITICAL:** Never add multiplayer games with anti-cheat systems.
const SAFE_GAMES_WHITELIST: &[&str] = &[
    // Example games (update with actual tested games)
    "hl2.exe",         // Half-Life 2
    "portal.exe",      // Portal
    "portal2.exe",     // Portal 2
    "bioshock.exe",    // BioShock
    "fallout3.exe",    // Fallout 3
    "falloutnv.exe",   // Fallout New Vegas
    "skyrim.exe",      // Skyrim (original)
    "oblivion.exe",    // Oblivion
    "darksouls.exe",   // Dark Souls (PTDE)
    "witcher.exe",     // The Witcher
    "witcher2.exe",    // The Witcher 2
    "masseffect.exe",  // Mass Effect
    "masseffect2.exe", // Mass Effect 2
    "masseffect3.exe", // Mass Effect 3
    "dragonage.exe",   // Dragon Age Origins
    "crysis.exe",      // Crysis
    "farcry2.exe",     // Far Cry 2
    "deadspace.exe",   // Dead Space
    "borderlands.exe", // Borderlands
    "dishonored.exe",  // Dishonored
];

/// DLL Overlay implementation
///
/// Injects overlay.dll into legacy game processes using CreateRemoteThread.
/// Only works with whitelisted games to avoid anti-cheat issues.
pub struct DllOverlay {
    /// Currently injected process ID
    #[allow(dead_code)]
    injected_pid: Option<u32>,
    /// Path to overlay DLL
    #[allow(dead_code)]
    dll_path: String,
}

impl Default for DllOverlay {
    fn default() -> Self {
        Self::new()
    }
}

impl DllOverlay {
    /// Create new DLL overlay instance
    #[must_use]
    pub fn new() -> Self {
        // DLL path will be in Tauri resources
        let dll_path = Self::get_dll_path();

        Self {
            injected_pid: None,
            dll_path,
        }
    }

    /// Get path to overlay DLL
    ///
    /// DLL should be bundled with Tauri app in resources folder.
    fn get_dll_path() -> String {
        // TODO: Use Tauri API to get resource path
        // For now, assume DLL is next to executable
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_default();

        exe_dir.join("overlay.dll").to_string_lossy().to_string()
    }

    /// Check if game is in whitelist
    ///
    /// Returns true only for known-safe games.
    fn is_whitelisted(game_name: &str) -> bool {
        let game_lower = game_name.to_lowercase();
        SAFE_GAMES_WHITELIST
            .iter()
            .any(|safe_game| game_lower.contains(&safe_game.to_lowercase()))
    }

    /// Get process handle by PID
    ///
    /// Opens process with all access rights for injection.
    #[allow(dead_code)]
    fn open_process(pid: u32) -> Result<HANDLE, String> {
        unsafe {
            OpenProcess(PROCESS_ALL_ACCESS, false, pid).map_err(|e| format!("Failed to open process {}: {}", pid, e))
        }
    }

    /// Inject DLL into process
    ///
    /// Uses classic CreateRemoteThread + LoadLibraryW technique:
    /// 1. Allocate memory in remote process
    /// 2. Write DLL path to remote memory
    /// 3. Get address of LoadLibraryW
    /// 4. Create remote thread with LoadLibraryW(dll_path)
    #[allow(dead_code)]
    fn inject_dll(process: HANDLE, dll_path: &str) -> Result<(), String> {
        unsafe {
            // Convert DLL path to wide string
            let dll_path_wide: Vec<u16> = OsStr::new(dll_path).encode_wide().chain(Some(0)).collect();

            let dll_path_size = dll_path_wide.len() * 2; // UTF-16 = 2 bytes per char

            // Allocate memory in remote process
            let remote_buffer = VirtualAllocEx(process, None, dll_path_size, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);

            if remote_buffer.is_null() {
                return Err("Failed to allocate memory in remote process".to_string());
            }

            // Write DLL path to remote memory
            let mut bytes_written = 0usize;
            let write_result = windows::Win32::System::Diagnostics::Debug::WriteProcessMemory(
                process,
                remote_buffer,
                dll_path_wide.as_ptr() as *const _,
                dll_path_size,
                Some(&mut bytes_written),
            );

            if write_result.is_err() || bytes_written != dll_path_size {
                let _ = VirtualFreeEx(process, remote_buffer, 0, MEM_RELEASE);
                return Err("Failed to write DLL path to remote process".to_string());
            }

            // Get address of LoadLibraryW
            let kernel32 = GetModuleHandleW(windows::core::w!("kernel32.dll"))
                .map_err(|e| format!("Failed to get kernel32 handle: {}", e))?;

            let load_library = GetProcAddress(kernel32, windows::core::s!("LoadLibraryW"))
                .ok_or("Failed to get LoadLibraryW address")?;

            // Create remote thread
            // SAFETY: transmute LoadLibraryW function pointer to thread start routine
            let thread_start: unsafe extern "system" fn(*mut std::ffi::c_void) -> u32 =
                std::mem::transmute(load_library);

            let thread = CreateRemoteThread(process, None, 0, Some(thread_start), Some(remote_buffer), 0, None)
                .map_err(|e| format!("Failed to create remote thread: {}", e))?;

            // Wait for thread to finish loading DLL
            let _ = WaitForSingleObject(thread, 5000); // 5 second timeout

            // Cleanup
            let _ = CloseHandle(thread);
            let _ = VirtualFreeEx(process, remote_buffer, 0, MEM_RELEASE);

            Ok(())
        }
    }

    /// Find process ID by name
    ///
    /// Returns first matching process if found.
    #[allow(dead_code)]
    fn find_process_by_name(process_name: &str) -> Result<Option<u32>, String> {
        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
                .map_err(|e| format!("Failed to create process snapshot: {}", e))?;

            let mut entry = PROCESSENTRY32W {
                dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
                ..Default::default()
            };

            if Process32FirstW(snapshot, &mut entry).is_err() {
                let _ = CloseHandle(snapshot);
                return Ok(None);
            }

            let process_name_lower = process_name.to_lowercase();

            loop {
                let exe_name = String::from_utf16_lossy(&entry.szExeFile)
                    .trim_end_matches('\0')
                    .to_string();

                if exe_name.to_lowercase() == process_name_lower {
                    let pid = entry.th32ProcessID;
                    let _ = CloseHandle(snapshot);
                    return Ok(Some(pid));
                }

                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }

            let _ = CloseHandle(snapshot);
            Ok(None)
        }
    }
}

impl OverlayStrategy for DllOverlay {
    /// Show overlay by injecting DLL into game process
    ///
    /// Steps:
    /// 1. Verify game is whitelisted (safety check)
    /// 2. Check if DLL file exists
    /// 3. Open game process
    /// 4. Inject overlay.dll via CreateRemoteThread
    /// 5. Store PID for later cleanup
    fn show(&self, _app: &AppHandle) -> Result<(), String> {
        // Get game info from detector (will be passed separately in real impl)
        // For now, we'll assume GameInfo is available via app state

        // PLACEHOLDER: In real implementation, GameInfo would be passed
        // or retrieved from app state
        // For now, return Ok to allow compilation

        // Example implementation (commented out):
        /*
        // 1. Verify whitelist
        if !Self::is_whitelisted(&game.name) {
            return Err(format!(
                "Game '{}' is not whitelisted for DLL injection. Only single-player games without anti-cheat are supported.",
                game.name
            ));
        }

        // 2. Check DLL exists
        if !Path::new(&self.dll_path).exists() {
            return Err(format!(
                "Overlay DLL not found at: {}",
                self.dll_path
            ));
        }

        // 3. Open process
        let process = Self::open_process(game.pid)?;

        // 4. Inject DLL
        let inject_result = Self::inject_dll(process, &self.dll_path);

        // 5. Cleanup process handle
        unsafe { CloseHandle(process); }

        inject_result?;

        // Store PID
        self.injected_pid = Some(game.pid);
        */

        Ok(())
    }

    /// Hide overlay
    ///
    /// **Note:** We don't unload the DLL (risky and can crash game).
    /// Instead, we send IPC message to DLL to hide overlay UI.
    /// The DLL remains loaded until game exits.
    fn hide(&self) -> Result<(), String> {
        // TODO: Send IPC message to overlay.dll to hide UI
        // This will be implemented in Fase 5 with IPC bridge
        Ok(())
    }

    /// Check if compatible with given game
    ///
    /// DLL injection works with:
    /// - DX9 games
    /// - DX11 games without FSO
    /// - Must be whitelisted for safety
    fn is_compatible(&self, game: &GameInfo) -> bool {
        !game.is_compatible_topmost && Self::is_whitelisted(&game.name)
    }

    /// Get overlay type identifier
    fn get_type(&self) -> OverlayType {
        OverlayType::DllInjection
    }
}

/// Check if game is safe for DLL injection
///
/// Public API to verify whitelist status before injection.
#[must_use]
pub fn is_game_whitelisted(game_name: &str) -> bool {
    DllOverlay::is_whitelisted(game_name)
}

/// Get list of whitelisted games
///
/// Returns array of safe game executable names.
#[must_use]
pub fn get_whitelist() -> &'static [&'static str] {
    SAFE_GAMES_WHITELIST
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_whitelist_check() {
        // Whitelisted game
        assert!(DllOverlay::is_whitelisted("hl2.exe"));
        assert!(DllOverlay::is_whitelisted("portal.exe"));
        assert!(DllOverlay::is_whitelisted("skyrim.exe"));

        // Not whitelisted
        assert!(!DllOverlay::is_whitelisted("csgo.exe"));
        assert!(!DllOverlay::is_whitelisted("valorant.exe"));
        assert!(!DllOverlay::is_whitelisted("unknown.exe"));
    }

    #[test]
    fn test_compatibility_check() {
        let overlay = DllOverlay::new();

        // DX9 whitelisted game - compatible
        let dx9_game = GameInfo {
            pid: 1234,
            name: "hl2.exe".to_string(),
            dx_version: 9,
            has_fso: false,
            is_compatible_topmost: false,
        };
        assert!(overlay.is_compatible(&dx9_game));

        // DX9 non-whitelisted - not compatible
        let dx9_non_whitelisted = GameInfo {
            pid: 1235,
            name: "unknown.exe".to_string(),
            dx_version: 9,
            has_fso: false,
            is_compatible_topmost: false,
        };
        assert!(!overlay.is_compatible(&dx9_non_whitelisted));

        // DX12 game (uses TOPMOST) - not compatible
        let dx12_game = GameInfo {
            pid: 1236,
            name: "modern_game.exe".to_string(),
            dx_version: 12,
            has_fso: true,
            is_compatible_topmost: true,
        };
        assert!(!overlay.is_compatible(&dx12_game));
    }

    #[test]
    fn test_whitelist_export() {
        let whitelist = get_whitelist();
        assert!(!whitelist.is_empty());
        assert!(whitelist.contains(&"hl2.exe"));
    }
}
