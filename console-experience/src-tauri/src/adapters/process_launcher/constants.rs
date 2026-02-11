// =============================================================================
// PROCESS LAUNCHER CONSTANTS
// =============================================================================

/// Steam registry watchdog timeout
/// Industry standard: 15-30s (Playnite, GOG Galaxy)
/// Research shows:
/// - Normal launch: 15-20s on modern systems
/// - With launchers/anti-cheat: 30-60s
/// - First launch/updates: 60-120s
/// Source: https://steamcommunity.com/discussions/forum/0/2976275080133332609/
pub const STEAM_TIMEOUT_SECONDS: u64 = 30;

/// Xbox explorer fallback timeout
pub const XBOX_EXPLORER_TIMEOUT_SECONDS: u64 = 5;

/// Threshold to consider a game exit as "quick exit" (failure)
pub const QUICK_EXIT_THRESHOLD_SECONDS: u64 = 5;

/// Polling interval for registry monitoring (more responsive)
pub const POLLING_INTERVAL_MS: u64 = 250;
