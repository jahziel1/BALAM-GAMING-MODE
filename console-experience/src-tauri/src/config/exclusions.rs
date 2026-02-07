use crate::domain::entities::Game;
use crate::domain::value_objects::GameSource;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Configuration for excluding non-game entries from scan results.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ExclusionConfig {
    /// Steam `AppIDs` to exclude (e.g., redistributables, runtimes)
    pub steam_app_ids: Vec<String>,
    /// Epic game title patterns to exclude
    pub epic_patterns: Vec<String>,
    /// Xbox package patterns to exclude
    pub xbox_patterns: Vec<String>,
    /// Registry entry patterns to exclude
    pub registry_excludes: Vec<String>,
}

impl ExclusionConfig {
    /// Loads exclusion config from JSON file.
    pub fn load() -> Result<Self, String> {
        let config_path = Self::get_config_path();

        let content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read {config_path:?}: {e}"))?;

        serde_json::from_str(&content).map_err(|e| format!("Failed to parse exclusions.json: {e}"))
    }

    /// Gets the path to the exclusions config file.
    fn get_config_path() -> PathBuf {
        // Try relative to executable first, then fallback to current dir
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(std::path::Path::to_path_buf));

        if let Some(dir) = exe_dir {
            let path = dir.join("config").join("exclusions.json");
            if path.exists() {
                return path;
            }
        }

        PathBuf::from("config/exclusions.json")
    }

    /// Loads config with default fallback if file doesn't exist.
    #[must_use]
    pub fn load_or_default() -> Self {
        Self::load().unwrap_or_else(|_| Self::default())
    }

    /// Checks if a game should be excluded based on its properties.
    #[must_use]
    pub fn is_excluded(&self, game: &Game) -> bool {
        match game.source {
            GameSource::Steam => self.steam_app_ids.contains(&game.raw_id),
            GameSource::Epic => self.epic_patterns.iter().any(|pattern| game.title.contains(pattern)),
            GameSource::Xbox => self.xbox_patterns.iter().any(|pattern| game.id.contains(pattern)),
            GameSource::BattleNet => false, // No Battle.net exclusions yet
            GameSource::Manual => self
                .registry_excludes
                .iter()
                .any(|pattern| game.title.contains(pattern)),
        }
    }
}

impl Default for ExclusionConfig {
    fn default() -> Self {
        Self {
            steam_app_ids: vec![
                "228980".to_string(),  // Steamworks Common Redistributables
                "1070560".to_string(), // Steam Linux Runtime
                "1391110".to_string(), // Steam Linux Runtime - Soldier
                "1493710".to_string(), // Proton Experimental
                "1826330".to_string(), // Steam Linux Runtime - Sniper
            ],
            epic_patterns: vec!["UE_".to_string(), "UnrealEngine".to_string()],
            xbox_patterns: vec!["Microsoft.Gaming".to_string(), "Xbox.TCUI".to_string()],
            registry_excludes: vec![
                "DirectX".to_string(),
                "VCRedist".to_string(),
                "Microsoft Visual C++".to_string(),
                "Redistributable".to_string(),
            ],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = ExclusionConfig::default();
        assert!(!config.steam_app_ids.is_empty());
        assert!(!config.epic_patterns.is_empty());
        assert!(!config.xbox_patterns.is_empty());
        assert!(!config.registry_excludes.is_empty());
    }

    #[test]
    fn test_steam_exclusion() {
        let config = ExclusionConfig::default();
        let game = Game::new(
            "steam_228980".to_string(),
            "228980".to_string(),
            "Steamworks Common Redistributables".to_string(),
            "/path".to_string(),
            GameSource::Steam,
        );

        assert!(config.is_excluded(&game));
    }

    #[test]
    fn test_epic_pattern_exclusion() {
        let config = ExclusionConfig::default();
        let game = Game::new(
            "epic_123".to_string(),
            "123".to_string(),
            "UE_SomeEngine".to_string(),
            "/path".to_string(),
            GameSource::Epic,
        );

        assert!(config.is_excluded(&game));
    }

    #[test]
    fn test_valid_game_not_excluded() {
        let config = ExclusionConfig::default();
        let game = Game::new(
            "steam_123".to_string(),
            "123".to_string(),
            "Cool Game".to_string(),
            "/path".to_string(),
            GameSource::Steam,
        );

        assert!(!config.is_excluded(&game));
    }
}
