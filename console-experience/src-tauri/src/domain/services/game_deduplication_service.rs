use crate::adapters::identity_engine::IdentityEngine;
use crate::domain::entities::Game;
use std::collections::HashSet;

/// Domain service for deduplicating games based on identity.
/// Uses `IdentityEngine` to determine if games are the same across different sources.
pub struct GameDeduplicationService;

impl GameDeduplicationService {
    /// Creates a new deduplication service.
    ///
    /// Uses `IdentityEngine` to determine game identity across platforms.
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    /// Deduplicates a collection of games based on their identity.
    ///
    /// Priority is given to games that appear first (scanners should be pre-sorted).
    /// Uses binary identity for executables, path identity otherwise.
    ///
    /// # Arguments
    /// * `games` - Iterable collection of games to deduplicate
    ///
    /// # Returns
    /// Vector of unique games with duplicates removed
    pub fn deduplicate<I>(&self, games: I) -> Vec<Game>
    where
        I: IntoIterator<Item = Game>,
    {
        use tracing::info;

        let mut seen_identities = HashSet::new();
        let mut unique_games = Vec::new();
        let mut duplicate_count = 0;

        for game in games {
            let identity = IdentityEngine::get_identity(&game.path);

            // Identity key: Binaries match by internal name, others by canonical path
            let identity_key = if let Some(ref internal) = identity.internal_name {
                format!("BIN_{internal}")
            } else {
                format!("PATH_{}", identity.canonical_path)
            };

            if seen_identities.contains(&identity_key) {
                duplicate_count += 1;
                info!("Skipping duplicate: {} (identity already exists)", game.title);
            } else {
                seen_identities.insert(identity_key);
                unique_games.push(game);
            }
        }

        info!(
            "Deduplication complete: {} unique, {} duplicates removed",
            unique_games.len(),
            duplicate_count
        );

        unique_games
    }
}

impl Default for GameDeduplicationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::value_objects::GameSource;

    #[test]
    fn test_deduplicate_removes_duplicates() {
        let game1 = Game::new(
            "steam_123".to_string(),
            "123".to_string(),
            "Test Game".to_string(),
            "C:\\Games\\test.exe".to_string(),
            GameSource::Steam,
        );

        let game2 = Game::new(
            "epic_456".to_string(),
            "456".to_string(),
            "Test Game".to_string(),
            "C:\\Games\\test.exe".to_string(), // Same path
            GameSource::Epic,
        );

        let service = GameDeduplicationService::new();
        let input_games = vec![game1.clone(), game2];
        let unique = service.deduplicate(input_games);

        // Should keep only the first one (Steam has priority)
        assert_eq!(unique.len(), 1);
        assert_eq!(unique[0].source, GameSource::Steam);
    }

    #[test]
    fn test_deduplicate_keeps_unique() {
        let game1 = Game::new(
            "steam_123".to_string(),
            "123".to_string(),
            "Game One".to_string(),
            "C:\\Games\\game1.exe".to_string(),
            GameSource::Steam,
        );

        let game2 = Game::new(
            "steam_456".to_string(),
            "456".to_string(),
            "Game Two".to_string(),
            "C:\\Games\\game2.exe".to_string(),
            GameSource::Steam,
        );

        let service = GameDeduplicationService::new();
        let input_games = vec![game1, game2];
        let unique = service.deduplicate(input_games);

        assert_eq!(unique.len(), 2);
    }

    #[test]
    fn test_deduplicate_empty_input() {
        let service = GameDeduplicationService::new();
        let games: Vec<Game> = vec![];
        let unique = service.deduplicate(games);

        assert_eq!(unique.len(), 0);
    }
}
