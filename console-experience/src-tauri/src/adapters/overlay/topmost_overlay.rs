/// TOPMOST Overlay - Window-based overlay for modern games
///
/// Uses WS_EX_TOPMOST + WS_EX_LAYERED for overlay rendering.
/// Works with DirectX 11/12 games that have Fullscreen Optimizations enabled.
///
/// # Implementation
/// - Create second Tauri window with overlay UI
/// - Configure WS_EX_TOPMOST + WS_EX_LAYERED extended styles
/// - Opacity control (0.0 → 0.98) for visibility
/// - Click-through management for input passthrough
///
/// # Architecture
/// ```
/// Main Window (Balam Console)
///     ↓
/// Game Launches → Overlay Window Created
///     ↓
/// TOPMOST + LAYERED → Renders above fullscreen game
/// ```
use super::detector::GameInfo;
use super::strategy::{OverlayStrategy, OverlayType};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongPtrW, SetLayeredWindowAttributes, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, HWND_TOPMOST,
    LWA_ALPHA, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_EX_TOPMOST,
    WS_EX_TRANSPARENT,
};

/// Overlay window label
const OVERLAY_WINDOW_LABEL: &str = "overlay";

/// TopMost overlay implementation
///
/// Creates a separate Tauri window configured with TOPMOST and LAYERED styles.
/// This allows the overlay to appear above fullscreen games with FSO enabled.
pub struct TopMostOverlay {
    /// Window label for Tauri window management
    window_label: String,
}

impl Default for TopMostOverlay {
    fn default() -> Self {
        Self::new()
    }
}

impl TopMostOverlay {
    /// Create new TOPMOST overlay instance
    #[must_use]
    pub fn new() -> Self {
        Self {
            window_label: OVERLAY_WINDOW_LABEL.to_string(),
        }
    }

    /// Configure window extended styles for overlay
    ///
    /// Sets:
    /// - WS_EX_TOPMOST: Always on top
    /// - WS_EX_LAYERED: Enable transparency/opacity
    /// - WS_EX_TOOLWINDOW: Hide from taskbar
    /// - WS_EX_TRANSPARENT: Click-through (can be toggled)
    fn configure_window_styles(hwnd: *mut std::ffi::c_void, click_through: bool) -> Result<(), String> {
        unsafe {
            let hwnd = HWND(hwnd as isize);

            // Get current extended styles
            let mut ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);

            // Add required styles
            ex_style |= WS_EX_TOPMOST.0 as isize;
            ex_style |= WS_EX_LAYERED.0 as isize;
            ex_style |= WS_EX_TOOLWINDOW.0 as isize;

            // Conditionally add click-through
            if click_through {
                ex_style |= WS_EX_TRANSPARENT.0 as isize;
            } else {
                ex_style &= !(WS_EX_TRANSPARENT.0 as isize);
            }

            // Apply new styles
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style);

            // Force TOPMOST positioning
            SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW)
                .map_err(|e| format!("Failed to set TOPMOST: {}", e))?;

            Ok(())
        }
    }

    /// Set window opacity using Windows APIs
    ///
    /// Uses SetLayeredWindowAttributes to control transparency.
    /// Opacity range: 0.0 (fully transparent) to 1.0 (fully opaque)
    fn set_window_opacity(hwnd: *mut std::ffi::c_void, opacity: f64) -> Result<(), String> {
        let opacity = opacity.clamp(0.0, 1.0);
        let alpha = (opacity * 255.0) as u8;

        unsafe {
            let hwnd = HWND(hwnd as isize);
            SetLayeredWindowAttributes(hwnd, None, alpha, LWA_ALPHA)
                .map_err(|e| format!("Failed to set opacity: {}", e))?;
        }

        Ok(())
    }

    /// Create overlay window if it doesn't exist
    fn create_overlay_window(&self, app: &AppHandle) -> Result<(), String> {
        // Check if window already exists
        if app.get_webview_window(&self.window_label).is_some() {
            return Ok(());
        }

        // Create overlay window
        let window = WebviewWindowBuilder::new(app, &self.window_label, WebviewUrl::App("/overlay".into()))
            .title("Balam Overlay")
            .inner_size(1920.0, 1080.0) // Default 1080p, will adapt to screen
            .resizable(false)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .visible(false) // Start hidden, will be shown after style configuration
            .build()
            .map_err(|e| format!("Failed to create overlay window: {}", e))?;

        // Get HWND and configure Windows styles
        let hwnd = window.hwnd().map_err(|e| format!("Failed to get HWND: {}", e))?;

        // Configure extended styles (start with click-through disabled)
        Self::configure_window_styles(hwnd.0, false)?;

        // Set initial opacity to 98% (fully visible but allows GPU optimizations)
        Self::set_window_opacity(hwnd.0, 0.98)?;

        Ok(())
    }
}

impl OverlayStrategy for TopMostOverlay {
    /// Show overlay window
    ///
    /// Creates overlay window if needed and shows it above the game.
    /// Configures TOPMOST and LAYERED styles for rendering above fullscreen.
    fn show(&self, app: &AppHandle) -> Result<(), String> {
        // Create window if it doesn't exist
        self.create_overlay_window(app)?;

        // Get window and show it
        let window = app
            .get_webview_window(&self.window_label)
            .ok_or("Overlay window not found")?;

        window.show().map_err(|e| format!("Failed to show overlay: {}", e))?;

        // Re-apply TOPMOST in case window lost focus
        let hwnd = window.hwnd().map_err(|e| format!("Failed to get HWND: {}", e))?;
        Self::configure_window_styles(hwnd.0, false)?;

        Ok(())
    }

    /// Hide overlay window
    ///
    /// Hides the overlay window but keeps it in memory for fast re-show.
    fn hide(&self) -> Result<(), String> {
        // Note: We don't have access to AppHandle here, so we can't get the window.
        // This method will be called from a Tauri command that has app access.
        // For now, return Ok - the actual hiding will be done via Tauri commands.
        Ok(())
    }

    /// Check if compatible with given game
    ///
    /// TOPMOST overlay works with:
    /// - DX12 games (always have FSO)
    /// - DX11 games with FSO enabled
    fn is_compatible(&self, game: &GameInfo) -> bool {
        game.is_compatible_topmost
    }

    /// Get overlay type identifier
    fn get_type(&self) -> OverlayType {
        OverlayType::TopMost
    }
}

/// Enable click-through for overlay window
///
/// When enabled, mouse clicks pass through to the game below.
/// Useful when overlay is displaying info only (FPS, stats).
pub fn set_click_through(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let window = app
        .get_webview_window(OVERLAY_WINDOW_LABEL)
        .ok_or("Overlay window not found")?;

    let hwnd = window.hwnd().map_err(|e| format!("Failed to get HWND: {}", e))?;

    TopMostOverlay::configure_window_styles(hwnd.0, enabled)
}

/// Set overlay opacity
///
/// - 0.0 = fully transparent (invisible)
/// - 1.0 = fully opaque
/// - Recommended: 0.98 (allows GPU optimizations while nearly opaque)
pub fn set_overlay_opacity(app: &AppHandle, opacity: f64) -> Result<(), String> {
    let opacity = opacity.clamp(0.0, 1.0);

    let window = app
        .get_webview_window(OVERLAY_WINDOW_LABEL)
        .ok_or("Overlay window not found")?;

    let hwnd = window.hwnd().map_err(|e| format!("Failed to get HWND: {}", e))?;

    TopMostOverlay::set_window_opacity(hwnd.0, opacity)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_overlay_creation() {
        let overlay = TopMostOverlay::new();
        assert_eq!(overlay.window_label, OVERLAY_WINDOW_LABEL);
    }

    #[test]
    fn test_compatibility_check() {
        let overlay = TopMostOverlay::new();

        // DX12 game - compatible
        let dx12_game = GameInfo {
            pid: 1234,
            name: "modern_game.exe".to_string(),
            dx_version: 12,
            has_fso: true,
            is_compatible_topmost: true,
        };
        assert!(overlay.is_compatible(&dx12_game));

        // DX9 game - not compatible
        let dx9_game = GameInfo {
            pid: 1235,
            name: "old_game.exe".to_string(),
            dx_version: 9,
            has_fso: false,
            is_compatible_topmost: false,
        };
        assert!(!overlay.is_compatible(&dx9_game));
    }
}
