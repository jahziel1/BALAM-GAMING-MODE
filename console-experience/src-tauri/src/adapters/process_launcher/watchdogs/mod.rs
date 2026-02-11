// =============================================================================
// WATCHDOG MODULES
// =============================================================================
//
// Process monitoring strategies for different game launchers:
// - Steam: Registry-based monitoring (most reliable)
// - PID: Generic process ID tracking
// - Xbox: Explorer fallback for UWP apps

pub mod pid;
pub mod steam;
pub mod xbox;

// Re-export main functions
pub use pid::start_watchdog;
pub use steam::start_steam_registry_watchdog;
pub use xbox::start_xbox_explorer_watchdog;
