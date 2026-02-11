// =============================================================================
// PROCESS LAUNCHER - Modular Architecture
// =============================================================================
//
// This module handles game launching and monitoring across different platforms:
// - Steam: Protocol-based launch with registry monitoring
// - Xbox/UWP: Native COM activation with PID tracking
// - Native: Direct executable launch with process monitoring
//
// Architecture:
// - constants: Timeout and polling configuration
// - pre_flight: Pre-launch validation to detect already-running games
// - launch_strategies: Platform-specific launch logic
// - watchdogs: Process monitoring for different launchers
// - window_manager: Application window control
// - uwp: Windows UWP/COM activation
// - error_handler: Centralized error emission

pub mod constants;
pub mod error_handler;
pub mod launch_strategies;
pub mod pre_flight;
pub mod uwp;
pub mod watchdogs;
pub mod window_manager;

// Re-export main public API
pub use launch_strategies::launch_game_process;

// Re-export for testing
#[cfg(test)]
pub use constants::*;
#[cfg(test)]
pub use pre_flight::{game_process_exists, pre_launch_check, steam_game_is_running};
#[cfg(test)]
pub use uwp::launch_uwp_app;

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_steam_game_running_check_returns_false_for_nonexistent_game() {
        // Test that checking a non-existent Steam app ID returns false
        let result = steam_game_is_running("999999999");
        assert!(!result, "Non-existent Steam game should not be reported as running");
    }

    #[test]
    fn test_pre_launch_check_succeeds_for_non_steam_game() {
        // Non-Steam games should pass pre-launch checks
        let result = pre_launch_check("epic_123", "Test Game");
        assert!(result.is_ok(), "Non-Steam games should pass pre-launch check");
    }

    #[test]
    fn test_pre_launch_check_validates_steam_id_format() {
        // Test that Steam IDs are properly validated
        let result = pre_launch_check("steam_12345", "Test Game");
        // Should succeed (game not actually running in test environment)
        assert!(result.is_ok(), "Valid Steam ID should pass pre-launch check");
    }

    #[test]
    fn test_launch_uwp_app_handles_invalid_app_id() {
        // Test that invalid UWP app IDs are handled gracefully
        let result = launch_uwp_app("InvalidAppId_NotReal!App");
        assert!(result.is_err(), "Invalid UWP app ID should return error");
    }

    #[test]
    fn test_constants_are_sensible() {
        // Verify timeout constants are reasonable
        assert!(
            STEAM_TIMEOUT_SECONDS >= 15,
            "Steam timeout should be at least 15 seconds"
        );
        assert!(
            QUICK_EXIT_THRESHOLD_SECONDS < STEAM_TIMEOUT_SECONDS,
            "Quick exit threshold should be less than timeout"
        );
        assert!(
            POLLING_INTERVAL_MS > 0 && POLLING_INTERVAL_MS <= 1000,
            "Polling interval should be between 1-1000ms"
        );
    }

    #[test]
    fn test_game_process_exists_handles_empty_string() {
        // Test that empty process name doesn't panic
        let result = game_process_exists("");
        assert!(!result, "Empty process name should return false");
    }

    #[test]
    fn test_game_process_exists_handles_nonexistent_process() {
        // Test that non-existent process returns false
        let result = game_process_exists("NonExistentGameProcess_12345.exe");
        assert!(!result, "Non-existent process should return false");
    }
}
