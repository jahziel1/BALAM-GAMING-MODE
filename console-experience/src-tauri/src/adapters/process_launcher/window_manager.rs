// =============================================================================
// WINDOW MANAGEMENT
// =============================================================================

use tauri::{AppHandle, Manager};

/// Minimize (hide) the application window
pub fn minimize_window(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.hide();
    }
}

/// Restore (show) the application window
pub fn restore_window(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
