/// Strategy Pattern - Overlay method selection
///
/// Automatically selects the best overlay method based on game capabilities.
use super::detector::GameInfo;
use super::dll_overlay::DllOverlay;
use super::topmost_overlay::TopMostOverlay;
use tauri::AppHandle;

/// Overlay strategy trait - common interface for all overlay methods
pub trait OverlayStrategy: Send + Sync {
    /// Show overlay
    fn show(&self, app: &AppHandle) -> Result<(), String>;

    /// Hide overlay
    fn hide(&self) -> Result<(), String>;

    /// Check if compatible with given game
    fn is_compatible(&self, game: &GameInfo) -> bool;

    /// Get strategy type
    fn get_type(&self) -> OverlayType;
}

/// Overlay type identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverlayType {
    TopMost,
    DllInjection,
}

/// Overlay method enum - wraps different strategies
pub enum OverlayMethod {
    TopMost(TopMostOverlay),
    DllInjection(DllOverlay),
}

impl OverlayMethod {
    /// Show overlay using selected strategy
    pub fn show(&self, app: &AppHandle) -> Result<(), String> {
        match self {
            Self::TopMost(overlay) => overlay.show(app),
            Self::DllInjection(overlay) => overlay.show(app),
        }
    }

    /// Hide overlay using selected strategy
    pub fn hide(&self) -> Result<(), String> {
        match self {
            Self::TopMost(overlay) => overlay.hide(),
            Self::DllInjection(overlay) => overlay.hide(),
        }
    }

    /// Get overlay type
    #[must_use]
    pub fn get_type(&self) -> OverlayType {
        match self {
            Self::TopMost(overlay) => overlay.get_type(),
            Self::DllInjection(overlay) => overlay.get_type(),
        }
    }
}

/// Select best overlay strategy for given game
///
/// Decision matrix:
/// - DX12: Always TOPMOST (FSO built-in)
/// - DX11 + FSO: TOPMOST
/// - DX11 without FSO: DLL injection
/// - DX9: DLL injection
#[must_use]
pub fn select_strategy(game: &GameInfo) -> OverlayMethod {
    if game.is_compatible_topmost {
        // Modern game with FSO support
        OverlayMethod::TopMost(TopMostOverlay::new())
    } else {
        // Legacy game or no FSO - use DLL injection
        OverlayMethod::DllInjection(DllOverlay::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strategy_selection() {
        // DX12 game
        let dx12_game = GameInfo {
            pid: 1234,
            name: "modern_game.exe".to_string(),
            dx_version: 12,
            has_fso: true,
            is_compatible_topmost: true,
        };
        let strategy = select_strategy(&dx12_game);
        assert_eq!(strategy.get_type(), OverlayType::TopMost);

        // DX11 with FSO
        let dx11_fso = GameInfo {
            pid: 1235,
            name: "game.exe".to_string(),
            dx_version: 11,
            has_fso: true,
            is_compatible_topmost: true,
        };
        let strategy = select_strategy(&dx11_fso);
        assert_eq!(strategy.get_type(), OverlayType::TopMost);

        // DX9 game
        let dx9_game = GameInfo {
            pid: 1236,
            name: "old_game.exe".to_string(),
            dx_version: 9,
            has_fso: false,
            is_compatible_topmost: false,
        };
        let strategy = select_strategy(&dx9_game);
        assert_eq!(strategy.get_type(), OverlayType::DllInjection);
    }
}
