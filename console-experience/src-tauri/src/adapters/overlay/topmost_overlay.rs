/// TOPMOST Overlay - Window-based overlay for modern games
///
/// Uses WS_EX_TOPMOST + WS_EX_LAYERED for overlay rendering.
/// Works with DirectX 11/12 games that have Fullscreen Optimizations enabled.
///
/// # Implementation (Fase 3)
/// - Create second Tauri window
/// - Configure extended window styles
/// - Opacity control (0 → 0.98)
/// - Click-through management
use super::detector::GameInfo;
use super::strategy::{OverlayStrategy, OverlayType};
use tauri::AppHandle;

pub struct TopMostOverlay {
    // Will be implemented in Fase 3
}

impl Default for TopMostOverlay {
    fn default() -> Self {
        Self::new()
    }
}

impl TopMostOverlay {
    #[must_use]
    pub fn new() -> Self {
        Self {}
    }
}

impl OverlayStrategy for TopMostOverlay {
    fn show(&self, _app: &AppHandle) -> Result<(), String> {
        // TODO: Implement in Fase 3
        Ok(())
    }

    fn hide(&self) -> Result<(), String> {
        // TODO: Implement in Fase 3
        Ok(())
    }

    fn is_compatible(&self, game: &GameInfo) -> bool {
        game.is_compatible_topmost
    }

    fn get_type(&self) -> OverlayType {
        OverlayType::TopMost
    }
}
