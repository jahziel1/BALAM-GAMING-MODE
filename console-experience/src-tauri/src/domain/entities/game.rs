use crate::domain::value_objects::game_source::GameSource;
use serde::{Deserialize, Serialize};

/// Domain entity representing a game discovered from various sources.
/// Contains all metadata needed for display and launching.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Game {
    /// Unique identifier (prefixed with source, e.g., "`steam_123`")
    pub id: String,
    /// Raw ID from the source platform (e.g., Steam `AppID`)
    pub raw_id: String,
    /// Display name of the game
    pub title: String,
    /// File system path to the game executable or installation directory
    pub path: String,
    /// Cover image URL or base64 data
    pub image: Option<String>,
    /// Hero/banner image for featured display
    pub hero_image: Option<String>,
    /// Logo image with transparent background
    pub logo: Option<String>,
    /// Last played timestamp (Unix epoch)
    pub last_played: Option<u64>,
    /// Source platform where game was discovered
    pub source: GameSource,
}

impl Game {
    /// Creates a new game with required fields.
    ///
    /// # Arguments
    /// * `id` - Unique identifier with source prefix (e.g., "`steam_123`")
    /// * `raw_id` - Platform-specific ID
    /// * `title` - Display name
    /// * `path` - File system path to executable
    /// * `source` - Platform source
    #[must_use]
    pub fn new(id: String, raw_id: String, title: String, path: String, source: GameSource) -> Self {
        Self {
            id,
            raw_id,
            title,
            path,
            image: None,
            hero_image: None,
            logo: None,
            last_played: None,
            source,
        }
    }

    /// Updates the last played timestamp to current time.
    pub fn mark_played(&mut self) {
        self.last_played = Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        );
    }

    /// Checks if the game has any artwork.
    #[must_use]
    pub fn has_artwork(&self) -> bool {
        self.image.is_some() || self.hero_image.is_some() || self.logo.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_creation() {
        let game = Game::new(
            "steam_123".to_string(),
            "123".to_string(),
            "Test Game".to_string(),
            "/path/to/game".to_string(),
            GameSource::Steam,
        );

        assert_eq!(game.id, "steam_123");
        assert_eq!(game.title, "Test Game");
        assert_eq!(game.source, GameSource::Steam);
        assert!(!game.has_artwork());
    }

    #[test]
    fn test_mark_played() {
        let mut game = Game::new(
            "steam_123".to_string(),
            "123".to_string(),
            "Test Game".to_string(),
            "/path/to/game".to_string(),
            GameSource::Steam,
        );

        assert!(game.last_played.is_none());
        game.mark_played();
        assert!(game.last_played.is_some());
    }

    #[test]
    fn test_has_artwork() {
        let mut game = Game::new(
            "steam_123".to_string(),
            "123".to_string(),
            "Test Game".to_string(),
            "/path/to/game".to_string(),
            GameSource::Steam,
        );

        assert!(!game.has_artwork());

        game.image = Some("cover.jpg".to_string());
        assert!(game.has_artwork());
    }
}
