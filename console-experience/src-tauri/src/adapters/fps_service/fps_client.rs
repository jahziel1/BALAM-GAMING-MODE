/// FPS Client - Named Pipe client for reading FPS from service
///
/// Connects to `\\.\pipe\BalamFps` and reads current FPS value.
///
/// # Performance
/// - <1ms per request (cached)
/// - Non-blocking
/// - Auto-reconnect on failure
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};
use windows::core::Result as WinResult;
use windows::Win32::Foundation::{CloseHandle, GENERIC_READ, INVALID_HANDLE_VALUE};
use windows::Win32::Storage::FileSystem::{
    CreateFileA, ReadFile, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_READ, OPEN_EXISTING,
};
use windows::Win32::System::Pipes::{SetNamedPipeHandleState, PIPE_READMODE_MESSAGE};

const CACHE_DURATION: Duration = Duration::from_millis(100); // Cache for 100ms

/// FPS data structure
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FpsData {
    pub fps: f32,
}

/// FPS Client
pub struct FpsClient {
    /// Cached FPS value
    cached_fps: Arc<Mutex<Option<f32>>>,
    /// Last update time
    last_update: Arc<Mutex<Instant>>,
}

impl FpsClient {
    /// Create new FPS client
    #[must_use]
    pub fn new() -> Self {
        Self {
            cached_fps: Arc::new(Mutex::new(None)),
            last_update: Arc::new(Mutex::new(Instant::now().checked_sub(CACHE_DURATION).unwrap())),
        }
    }

    /// Get current FPS
    ///
    /// Returns cached value if fresh (<100ms old), otherwise queries service.
    ///
    /// # Returns
    /// - `Some(fps)` - FPS value available
    /// - `None` - Service not available or not responding
    #[must_use]
    pub fn get_fps(&self) -> Option<f32> {
        let now = Instant::now();
        let last_update = *self.last_update.lock();

        // Return cached value if fresh
        if now.duration_since(last_update) < CACHE_DURATION {
            if let Some(fps) = *self.cached_fps.lock() {
                return Some(fps);
            }
        }

        // Query service
        match Self::query_service() {
            Ok(fps) => {
                *self.cached_fps.lock() = Some(fps);
                *self.last_update.lock() = now;
                Some(fps)
            },
            Err(_) => {
                // Service not available - silent fail (expected when service not running)
                None
            },
        }
    }

    /// Query FPS from service via named pipe
    fn query_service() -> WinResult<f32> {
        unsafe {
            // Open named pipe (READ ONLY - default security allows Everyone to read)
            let pipe_handle = CreateFileA(
                windows::core::s!(r"\\.\pipe\BalamFps"),
                GENERIC_READ.0, // Only READ access (not WRITE)
                FILE_SHARE_READ,
                None,
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                None,
            )?;

            if pipe_handle == INVALID_HANDLE_VALUE {
                return Err(windows::core::Error::from_win32());
            }

            // Set pipe mode to message
            let mode = PIPE_READMODE_MESSAGE;
            let _ = SetNamedPipeHandleState(pipe_handle, Some(&mode), None, None);

            // No write needed - server sends data immediately on connect
            // Read response
            let mut buffer = [0u8; 512];
            let mut bytes_read = 0u32;
            ReadFile(pipe_handle, Some(&mut buffer), Some(&mut bytes_read), None)?;

            // Close handle
            let _ = CloseHandle(pipe_handle);

            // Parse JSON response
            let json =
                std::str::from_utf8(&buffer[..bytes_read as usize]).map_err(|_| windows::core::Error::from_win32())?;

            let data: FpsData = serde_json::from_str(json).map_err(|_| windows::core::Error::from_win32())?;

            Ok(data.fps)
        }
    }

    /// Check if service is available
    #[must_use]
    pub fn is_service_available(&self) -> bool {
        Self::query_service().is_ok()
    }
}

impl Default for FpsClient {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fps_client_creation() {
        let client = FpsClient::new();
        // Should not panic
        let _ = client.get_fps();
    }
}
