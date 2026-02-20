pub mod detector;
pub mod dll_overlay;
pub mod ipc_bridge;
/// Overlay Module - Strategy pattern for game overlays
///
/// Provides unified interface for different overlay methods:
/// - TOPMOST window (for modern games with FSO)
/// - DLL injection (for legacy games without FSO)
///
/// # Architecture
/// ```
/// GameInfo → select_strategy() → OverlayMethod
///                                      ↓
///                           ┌──────────┴──────────┐
///                           ↓                     ↓
///                    TopMostOverlay        DllOverlay
/// ```
pub mod strategy;
pub mod topmost_overlay;

// Re-export main APIs
pub use detector::{get_game_info_from_fps_service, GameInfo};
pub use strategy::{select_strategy, OverlayMethod, OverlayStrategy, OverlayType};
