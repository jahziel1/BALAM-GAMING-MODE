/// PiP Window Commands
///
/// Commands to control the Performance PiP (Picture-in-Picture) window.
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};

/// Show the Performance PiP window
#[tauri::command]
pub async fn show_performance_pip(app: AppHandle) -> Result<(), String> {
    // Check if window already exists
    if let Some(existing_window) = app.get_webview_window("performance-pip") {
        existing_window
            .show()
            .map_err(|e| format!("Failed to show window: {}", e))?;
        existing_window
            .set_focus()
            .map_err(|e| format!("Failed to focus window: {}", e))?;
        return Ok(());
    }

    // Use same URL as main window
    #[cfg(dev)]
    let url = WebviewUrl::External("http://localhost:1420".parse().unwrap());
    #[cfg(not(dev))]
    let url = WebviewUrl::App("index.html".into());

    // Create new PiP window (larger to avoid edge artifacts)
    let pip_window = WebviewWindowBuilder::new(&app, "performance-pip", url)
        .title("")
        .inner_size(280.0, 250.0)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .focusable(false)
        .accept_first_mouse(false)
        .visible_on_all_workspaces(true)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

    // Position in top-right corner
    let monitor = pip_window
        .current_monitor()
        .map_err(|e| format!("Failed to get monitor: {}", e))?
        .ok_or("No monitor found")?;

    let monitor_size = monitor.size();
    let window_size = pip_window
        .outer_size()
        .map_err(|e| format!("Failed to get window size: {}", e))?;

    // Position flush with top-right (no offset to avoid edge artifacts)
    let x = monitor_size.width as i32 - window_size.width as i32;
    let y = 0;

    pip_window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|e| format!("Failed to set position: {}", e))?;

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
