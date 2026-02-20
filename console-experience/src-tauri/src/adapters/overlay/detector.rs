/// Detector - Reads game info from FPS service
///
/// Bridges FPS service (ETW) with overlay module.
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Game information (mirrors fps-service GameState)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameInfo {
    pub pid: u32,
    pub name: String,
    pub dx_version: u32,
    pub has_fso: bool,
    pub is_compatible_topmost: bool,
}

/// FPS service response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
struct FpsData {
    pub fps: f32,
    pub game_state: Option<GameState>,
}

/// Game state from FPS service
#[derive(Debug, Clone, Serialize, Deserialize)]
struct GameState {
    pub pid: u32,
    pub name: String,
    pub dx_version: u32,
    pub has_fso: bool,
    pub is_compatible_topmost: bool,
}

/// Get game info from FPS service via IPC
///
/// Reads from Named Pipe: \\.\pipe\BalamFps
/// Returns None if no game is running
pub fn get_game_info_from_fps_service() -> Result<Option<GameInfo>, String> {
    use windows::Win32::Foundation::{CloseHandle, GENERIC_READ, INVALID_HANDLE_VALUE};
    use windows::Win32::Storage::FileSystem::{
        CreateFileW, ReadFile, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_NONE, OPEN_EXISTING,
    };

    unsafe {
        // Open named pipe
        let pipe_name = windows::core::w!(r"\\.\pipe\BalamFps");
        let handle = CreateFileW(
            pipe_name,
            GENERIC_READ.0,
            FILE_SHARE_NONE,
            None,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            None,
        )
        .map_err(|e| format!("Failed to open pipe: {}", e))?;

        if handle == INVALID_HANDLE_VALUE {
            return Err("Invalid pipe handle".to_string());
        }

        // Read response
        let mut buffer = vec![0u8; 4096];
        let mut bytes_read = 0u32;

        let read_result = ReadFile(handle, Some(&mut buffer[..]), Some(&mut bytes_read as *mut u32), None);

        let _ = CloseHandle(handle);

        if read_result.is_err() {
            return Err("Failed to read from pipe".to_string());
        }

        // Parse JSON
        let json_str = String::from_utf8_lossy(&buffer[0..bytes_read as usize]);
        let data: FpsData = serde_json::from_str(&json_str).map_err(|e| format!("Failed to parse JSON: {}", e))?;

        // Convert to GameInfo
        Ok(data.game_state.map(|state| GameInfo {
            pid: state.pid,
            name: state.name,
            dx_version: state.dx_version,
            has_fso: state.has_fso,
            is_compatible_topmost: state.is_compatible_topmost,
        }))
    }
}

/// Poll for game state changes
///
/// Returns when game state changes (started/stopped)
pub fn wait_for_game_state_change(
    previous_state: Option<u32>, // Previous PID
    timeout: Duration,
) -> Result<Option<GameInfo>, String> {
    let start = std::time::Instant::now();

    loop {
        if start.elapsed() > timeout {
            return Err("Timeout waiting for state change".to_string());
        }

        if let Ok(Some(info)) = get_game_info_from_fps_service() {
            // State changed: game started
            if previous_state.is_none() || previous_state != Some(info.pid) {
                return Ok(Some(info));
            }
        } else if previous_state.is_some() {
            // State changed: game stopped
            return Ok(None);
        }

        std::thread::sleep(Duration::from_millis(100));
    }
}
