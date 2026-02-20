/// Overlay Commands - Tauri commands for game overlay control
///
/// Provides frontend API for overlay system:
/// - Show/hide overlay
/// - Configure opacity and click-through
/// - Automatic strategy selection (TOPMOST vs DLL injection)
///
/// # Architecture
/// ```
/// Frontend → Tauri Commands → Overlay Strategy → Game Overlay
/// ```
use crate::adapters::overlay::{dll_overlay, select_strategy, topmost_overlay, GameInfo, OverlayMethod};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// Overlay configuration for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayConfig {
    /// Whether overlay is currently visible
    pub visible: bool,
    /// Overlay type being used (topmost or dll_injection)
    pub overlay_type: String,
    /// Opacity level (0.0 - 1.0)
    pub opacity: f64,
    /// Whether click-through is enabled
    pub click_through: bool,
}

/// Overlay status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayStatus {
    /// Whether overlay system is active
    pub active: bool,
    /// Current game info if detected
    pub game_info: Option<GameInfo>,
    /// Current overlay configuration
    pub config: Option<OverlayConfig>,
}

/// Show overlay for currently running game
///
/// Automatically selects strategy based on game compatibility:
/// - TOPMOST for modern games (DX11/12 with FSO)
/// - DLL injection for legacy games (whitelisted only)
///
/// # Errors
/// Returns error if:
/// - No game is running
/// - Game is not compatible with any overlay method
/// - DLL injection fails (not whitelisted, DLL missing, etc.)
#[tauri::command]
pub async fn show_game_overlay(app: AppHandle) -> Result<OverlayConfig, String> {
    // Get current game info from FPS service or process detection
    let game_info = crate::adapters::overlay::get_game_info_from_fps_service()?.ok_or("No game detected")?;

    // Select appropriate strategy
    let strategy = select_strategy(&game_info);

    // Show overlay
    strategy.show(&app)?;

    // Return configuration
    Ok(OverlayConfig {
        visible: true,
        overlay_type: format!("{:?}", strategy.get_type()),
        opacity: 0.98, // Default opacity
        click_through: false,
    })
}

/// Hide overlay for currently running game
///
/// Hides overlay window (TOPMOST) or sends IPC to hide DLL overlay.
/// Does not unload DLL to avoid game crashes.
#[tauri::command]
pub async fn hide_game_overlay(app: AppHandle) -> Result<(), String> {
    // Try to hide TOPMOST overlay (safe if not present)
    if let Some(_window) = app.get_webview_window("overlay") {
        let strategy = OverlayMethod::TopMost(crate::adapters::overlay::topmost_overlay::TopMostOverlay::new());
        strategy.hide()?;
    }

    // TODO: Send IPC to DLL overlay to hide (Phase 7)

    Ok(())
}

/// Toggle overlay visibility
///
/// Shows overlay if hidden, hides if shown.
#[tauri::command]
pub async fn toggle_game_overlay(app: AppHandle) -> Result<OverlayConfig, String> {
    // Check if overlay window exists
    if let Some(window) = app.get_webview_window("overlay") {
        // TOPMOST overlay exists
        if window.is_visible().unwrap_or(false) {
            hide_game_overlay(app).await?;
            Ok(OverlayConfig {
                visible: false,
                overlay_type: "TopMost".to_string(),
                opacity: 0.98,
                click_through: false,
            })
        } else {
            show_game_overlay(app).await
        }
    } else {
        // No overlay window - show it
        show_game_overlay(app).await
    }
}

/// Set overlay opacity (TOPMOST only)
///
/// Controls transparency of overlay window.
/// - 0.0 = fully transparent (invisible)
/// - 1.0 = fully opaque
/// - Recommended: 0.98 (allows GPU optimizations)
///
/// # Errors
/// Returns error if overlay window doesn't exist or Windows API fails.
#[tauri::command]
pub async fn set_overlay_opacity(app: AppHandle, opacity: f64) -> Result<(), String> {
    topmost_overlay::set_overlay_opacity(&app, opacity)
}

/// Enable/disable click-through (TOPMOST only)
///
/// When enabled, mouse clicks pass through overlay to game below.
/// Useful for info-only overlays (FPS counter, stats).
///
/// # Errors
/// Returns error if overlay window doesn't exist or Windows API fails.
#[tauri::command]
pub async fn set_overlay_click_through(app: AppHandle, enabled: bool) -> Result<(), String> {
    topmost_overlay::set_click_through(&app, enabled)
}

/// Get current overlay status
///
/// Returns whether overlay is active and current configuration.
#[tauri::command]
pub async fn get_overlay_status(app: AppHandle) -> Result<OverlayStatus, String> {
    // Check if TOPMOST overlay exists
    if let Some(window) = app.get_webview_window("overlay") {
        let visible = window.is_visible().unwrap_or(false);

        // Try to get game info (ignore errors)
        let game_info = crate::adapters::overlay::get_game_info_from_fps_service()
            .ok()
            .flatten();

        Ok(OverlayStatus {
            active: visible,
            game_info,
            config: Some(OverlayConfig {
                visible,
                overlay_type: "TopMost".to_string(),
                opacity: 0.98,
                click_through: false,
            }),
        })
    } else {
        // No overlay active
        Ok(OverlayStatus {
            active: false,
            game_info: None,
            config: None,
        })
    }
}

/// Check if game is whitelisted for DLL injection
///
/// Returns true if game can safely receive DLL overlay.
/// Used by frontend to show warnings or recommendations.
#[tauri::command]
pub async fn is_game_whitelisted(game_name: String) -> Result<bool, String> {
    Ok(dll_overlay::is_game_whitelisted(&game_name))
}

/// Get list of whitelisted games
///
/// Returns array of game executable names that are safe for DLL injection.
#[tauri::command]
pub async fn get_whitelisted_games() -> Result<Vec<String>, String> {
    Ok(dll_overlay::get_whitelist().iter().map(|s| s.to_string()).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_overlay_config_serialization() {
        let config = OverlayConfig {
            visible: true,
            overlay_type: "TopMost".to_string(),
            opacity: 0.98,
            click_through: false,
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"visible\":true"));
        assert!(json.contains("\"overlay_type\":\"TopMost\""));
    }

    #[test]
    fn test_overlay_status_default() {
        let status = OverlayStatus {
            active: false,
            game_info: None,
            config: None,
        };

        assert!(!status.active);
        assert!(status.game_info.is_none());
        assert!(status.config.is_none());
    }
}
