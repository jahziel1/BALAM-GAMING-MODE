/// DLL Overlay - Injection-based overlay for legacy games
///
/// Uses CreateRemoteThread to inject overlay.dll into game process.
/// Works with DirectX 9 games or DX11 games without FSO.
///
/// # Implementation (Fase 4)
/// - DLL injection via CreateRemoteThread
/// - Whitelist of safe games
/// - IPC bridge for communication
use super::detector::GameInfo;
use super::strategy::{OverlayStrategy, OverlayType};
use tauri::AppHandle;

pub struct DllOverlay {
    // Will be implemented in Fase 4
}

impl Default for DllOverlay {
    fn default() -> Self {
        Self::new()
    }
}

impl DllOverlay {
    #[must_use]
    pub fn new() -> Self {
        Self {}
    }
}

impl OverlayStrategy for DllOverlay {
    fn show(&self, _app: &AppHandle) -> Result<(), String> {
        // TODO: Implement in Fase 4
        Ok(())
    }

    fn hide(&self) -> Result<(), String> {
        // TODO: Implement in Fase 4
        Ok(())
    }

    fn is_compatible(&self, game: &GameInfo) -> bool {
        !game.is_compatible_topmost
    }

    fn get_type(&self) -> OverlayType {
        OverlayType::DllInjection
    }
}
