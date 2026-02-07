/**
 * Active Games Tracker
 *
 * Thread-safe global state for tracking currently running games.
 * Supports all game types: Steam (no PID), Xbox/UWP (optional PID), Native (PID).
 *
 * This module solves the critical issue where:
 * - Steam games don't return real PIDs (use protocol handler)
 * - Xbox/UWP games may or may not have PIDs (depending on COM activation)
 * - Frontend needs to track and kill games by ID
 */
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::domain::entities::game::Game;

/// Information about an active running game
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveGameInfo {
    /// Complete game data
    pub game: Game,
    /// Process ID (`None` for Steam games and Xbox fallback)
    pub pid: Option<u32>,
    /// Game executable path (used for kill operations)
    pub path: String,
}

/// Frontend-compatible ActiveGame response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveGame {
    pub game: Game,
    pub pid: u32, // 0 for games without real PID (Steam)
}

impl From<ActiveGameInfo> for ActiveGame {
    fn from(info: ActiveGameInfo) -> Self {
        ActiveGame {
            game: info.game,
            pid: info.pid.unwrap_or(0), // Steam and Xbox fallback get PID 0
        }
    }
}

/// Thread-safe global tracker for active games
pub struct ActiveGamesTracker {
    games: Arc<RwLock<HashMap<String, ActiveGameInfo>>>,
}

impl ActiveGamesTracker {
    /// Create a new tracker
    #[must_use]
    pub fn new() -> Self {
        Self {
            games: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register a newly launched game
    pub fn register(&self, game_id: String, info: ActiveGameInfo) {
        let mut games = self.games.write().expect("Failed to lock active games for write");
        let pid = info.pid;
        games.insert(game_id.clone(), info);
        tracing::info!("🎮 Active game registered: {} (PID: {:?})", game_id, pid);
    }

    /// Get active game by ID
    #[must_use]
    pub fn get(&self, game_id: &str) -> Option<ActiveGameInfo> {
        let games = self.games.read().expect("Failed to lock active games for read");
        games.get(game_id).cloned()
    }

    /// Remove game from tracking (called by watchdog when game exits)
    pub fn unregister(&self, game_id: &str) {
        let mut games = self.games.write().expect("Failed to lock active games for write");
        if let Some(info) = games.remove(game_id) {
            tracing::info!("🎮 Active game unregistered: {} (PID: {:?})", game_id, info.pid);
        }
    }

    /// Get all active games (for debugging)
    #[must_use]
    pub fn list_active(&self) -> Vec<String> {
        let games = self.games.read().expect("Failed to lock active games for read");
        games.keys().cloned().collect()
    }

    /// Get tracker clone for use in threads (watchdog)
    #[must_use]
    pub fn clone_tracker(&self) -> Self {
        Self {
            games: Arc::clone(&self.games),
        }
    }
}

impl Default for ActiveGamesTracker {
    fn default() -> Self {
        Self::new()
    }
}
