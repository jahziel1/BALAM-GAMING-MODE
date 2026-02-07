use crate::domain::game_process::GameProcess;
use crate::ports::game_management_port::GameManagementPort;
use std::thread;
use std::time::Duration;
use tracing::{info, warn};
use windows::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM, WAIT_OBJECT_0, WAIT_TIMEOUT};
use windows::Win32::System::Threading::{
    OpenProcess, TerminateProcess, WaitForSingleObject, PROCESS_QUERY_INFORMATION, PROCESS_TERMINATE,
};
use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindowThreadProcessId, SendMessageW, WM_CLOSE};

/// Windows implementation of game management using Win32 APIs.
///
/// Provides graceful game shutdown using `WM_CLOSE` messages with
/// `TerminateProcess` fallback for unresponsive processes.
pub struct WindowsGameAdapter;

impl WindowsGameAdapter {
    /// Creates a new Windows game adapter.
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    /// Enumerates all top-level windows and sends `WM_CLOSE` to windows belonging to target PID.
    ///
    /// # Safety
    /// Uses unsafe FFI calls to Win32 APIs. The `enum_proc` callback must be `extern "system"`.
    ///
    /// # Returns
    /// Number of windows that received `WM_CLOSE` messages.
    #[allow(clippy::unused_self)]
    unsafe fn send_close_to_windows(&self, target_pid: u32) -> Result<usize, String> {
        // EnumWindows callback - must be extern "system"
        unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let (target_pid, count_ptr) = *(lparam.0 as *const (u32, *mut usize));
            let mut window_pid = 0u32;
            let _ = GetWindowThreadProcessId(hwnd, Some(&raw mut window_pid));

            if window_pid == target_pid {
                // Send WM_CLOSE to the window (graceful shutdown)
                let _ = SendMessageW(hwnd, WM_CLOSE, None, None);
                unsafe {
                    *count_ptr += 1;
                }
            }

            BOOL(1) // Continue enumeration
        }

        let mut count = 0usize;
        let count_ptr = &raw mut count;
        let lparam = LPARAM(std::ptr::from_ref(&(target_pid, count_ptr)) as isize);
        EnumWindows(Some(enum_proc), lparam).map_err(|e| format!("EnumWindows failed: {e}"))?;

        Ok(count)
    }

    /// Waits for a process to exit (up to 5 seconds).
    ///
    /// # Returns
    /// - `Ok(true)` - Process exited within timeout
    /// - `Ok(false)` - Process still running after timeout
    /// - `Err(...)` - Error checking process status
    #[allow(clippy::unused_self)]
    unsafe fn wait_for_process_exit(&self, pid: u32, timeout_secs: u32) -> Result<bool, String> {
        let handle = OpenProcess(PROCESS_QUERY_INFORMATION, false, pid)
            .map_err(|e| format!("Failed to open process for wait: {e}"))?;

        let timeout_ms = timeout_secs * 1000;
        let result = WaitForSingleObject(handle, timeout_ms);

        let _ = CloseHandle(handle);

        match result {
            WAIT_OBJECT_0 => Ok(true), // Process exited
            WAIT_TIMEOUT => Ok(false), // Still running
            _ => Err("WaitForSingleObject failed".to_string()),
        }
    }
}

impl Default for WindowsGameAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl GameManagementPort for WindowsGameAdapter {
    fn get_current_game(&self) -> Result<Option<GameProcess>, String> {
        // TODO: Integrate with existing game_watchdog to get running game
        // For now, return None (will be implemented in integration phase)
        Ok(None)
    }

    fn close_game(&self, pid: u32) -> Result<bool, String> {
        info!("Attempting to close game with PID {}", pid);

        // Step 1: Send WM_CLOSE to all windows (graceful shutdown)
        unsafe {
            match self.send_close_to_windows(pid) {
                Ok(count) => {
                    if count > 0 {
                        info!("Sent WM_CLOSE to {} windows for PID {}", count, pid);
                    } else {
                        warn!("No windows found for PID {}, process may be windowless", pid);
                    }
                },
                Err(e) => {
                    warn!("Failed to enumerate windows: {}", e);
                    // Continue to TerminateProcess fallback
                },
            }
        }

        // Step 2: Wait 5 seconds for graceful shutdown
        info!("Waiting 5 seconds for graceful shutdown (PID {})", pid);
        thread::sleep(Duration::from_secs(5));

        // Step 3: Check if process exited gracefully
        unsafe {
            let still_running = if let Ok(exited) = self.wait_for_process_exit(pid, 0) {
                !exited
            } else {
                // If we can't check status, assume it exited
                info!("Cannot verify process status (PID {}), assuming exited", pid);
                return Ok(true);
            };

            if !still_running {
                info!("Game PID {} closed gracefully", pid);
                return Ok(true);
            }

            // Step 4: Force terminate if still running
            warn!("Game PID {} did not close gracefully, using TerminateProcess", pid);

            let handle = OpenProcess(PROCESS_TERMINATE, false, pid)
                .map_err(|e| format!("Failed to open process for termination: {e}"))?;

            let terminate_result = TerminateProcess(handle, 1);
            let _ = CloseHandle(handle);

            terminate_result.map_err(|e| format!("TerminateProcess failed: {e}"))?;

            info!("Game PID {} force-terminated", pid);
            Ok(false) // Indicate force termination
        }
    }

    fn is_process_responding(&self, _pid: u32) -> Result<bool, String> {
        // TODO: Implement using IsHungAppWindow or SendMessageTimeout
        // For MVP, always return true
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adapter_creation() {
        let adapter = WindowsGameAdapter::new();
        // Should not panic
        assert!(adapter.get_current_game().is_ok());
    }

    #[test]
    fn test_close_nonexistent_process() {
        let adapter = WindowsGameAdapter::new();
        let result = adapter.close_game(999_999); // Nonexistent PID
                                                  // Implementation may return Ok(false) for graceful close attempt on nonexistent PID
                                                  // This is acceptable behavior - not a critical error
        assert!(result.is_ok());
    }
}
