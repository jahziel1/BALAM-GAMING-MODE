/// PiP Window Commands
///
/// Commands to control the Performance PiP (Picture-in-Picture) window.
use tauri::{AppHandle, Manager, PhysicalPosition};

/// Show the Performance PiP window
#[tauri::command]
pub async fn show_performance_pip(app: AppHandle) -> Result<(), String> {
    let pip_window = app
        .get_webview_window("performance-pip")
        .ok_or("PiP window not found")?;

    // Position in top-right corner
    let monitor = pip_window
        .current_monitor()
        .map_err(|e| format!("Failed to get monitor: {}", e))?
        .ok_or("No monitor found")?;

    let monitor_size = monitor.size();
    let window_size = pip_window
        .outer_size()
        .map_err(|e| format!("Failed to get window size: {}", e))?;

    // Position: 12px from top-right
    let x = monitor_size.width as i32 - window_size.width as i32 - 12;
    let y = 12;

    pip_window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|e| format!("Failed to set position: {}", e))?;

    pip_window.show().map_err(|e| format!("Failed to show window: {}", e))?;

    pip_window
        .set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;

    Ok(())
}

/// Hide the Performance PiP window
#[tauri::command]
pub async fn hide_performance_pip(app: AppHandle) -> Result<(), String> {
    let pip_window = app
        .get_webview_window("performance-pip")
        .ok_or("PiP window not found")?;

    pip_window.hide().map_err(|e| format!("Failed to hide window: {}", e))?;

    Ok(())
}

/// Toggle the Performance PiP window
#[tauri::command]
pub async fn toggle_performance_pip(app: AppHandle) -> Result<bool, String> {
    let pip_window = app
        .get_webview_window("performance-pip")
        .ok_or("PiP window not found")?;

    let is_visible = pip_window
        .is_visible()
        .map_err(|e| format!("Failed to check visibility: {}", e))?;

    if is_visible {
        hide_performance_pip(app).await?;
        Ok(false)
    } else {
        show_performance_pip(app).await?;
        Ok(true)
    }
}

/// Check if PiP window is visible
#[tauri::command]
pub async fn is_pip_visible(app: AppHandle) -> Result<bool, String> {
    let pip_window = app
        .get_webview_window("performance-pip")
        .ok_or("PiP window not found")?;

    pip_window
        .is_visible()
        .map_err(|e| format!("Failed to check visibility: {}", e))
}
