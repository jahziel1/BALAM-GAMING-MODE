use crate::domain::entities::Game;
use crate::domain::errors::ScanError;
use crate::ports::GameScanner;
use std::sync::Arc;

/// Domain service for discovering games from multiple sources.
/// Orchestrates scanning across different platforms with prioritization.
pub struct GameDiscoveryService {
    scanners: Vec<Arc<dyn GameScanner>>,
}

impl GameDiscoveryService {
    /// Creates a new discovery service with the given scanners.
    ///
    /// # Arguments
    /// * `scanners` - Vector of scanner implementations to use for discovery
    #[must_use]
    pub fn new(scanners: Vec<Arc<dyn GameScanner>>) -> Self {
        Self { scanners }
    }

    /// Discovers games from all scanners, sorted by priority.
    /// Continues even if individual scanners fail.
    pub fn discover(&self) -> Result<Vec<Game>, ScanError> {
        use tracing::{error, info};

        info!("Starting game discovery with {} scanners", self.scanners.len());

        // Sort scanners by priority (metadata-rich sources first)
        let mut sorted = self.scanners.clone();
        sorted.sort_by_key(|s| s.priority());

        let mut all_games = Vec::new();
        let mut any_success = false;

        for scanner in sorted {
            let source_name = scanner.source().display_name();
            info!("Scanning {}...", source_name);

            match scanner.scan() {
                Ok(games) => {
                    info!("✓ Found {} games from {}", games.len(), source_name);
                    all_games.extend(games);
                    any_success = true;
                },
                Err(e) => {
                    error!("✗ Scanner {} failed: {}", source_name, e);
                },
            }
        }

        if !any_success && !self.scanners.is_empty() {
            return Err(ScanError::PlatformError("All scanners failed".to_string()));
        }

        Ok(all_games)
    }

    /// Returns the number of registered scanners.
    #[must_use]
    pub fn scanner_count(&self) -> usize {
        self.scanners.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::value_objects::GameSource;

    struct MockScanner {
        games: Vec<Game>,
        should_fail: bool,
        source: GameSource,
    }

    impl GameScanner for MockScanner {
        fn scan(&self) -> Result<Vec<Game>, ScanError> {
            if self.should_fail {
                Err(ScanError::IoError("Mock failure".to_string()))
            } else {
                Ok(self.games.clone())
            }
        }

        fn source(&self) -> GameSource {
            self.source
        }
    }

    #[test]
    fn test_discover_with_working_scanner() {
        let game = Game::new(
            "steam_123".to_string(),
            "123".to_string(),
            "Test Game".to_string(),
            "/test".to_string(),
            GameSource::Steam,
        );

        let scanner = Arc::new(MockScanner {
            games: vec![game],
            should_fail: false,
            source: GameSource::Steam,
        });

        let service = GameDiscoveryService::new(vec![scanner]);
        let games = service.discover().unwrap();

        assert_eq!(games.len(), 1);
        assert_eq!(games[0].title, "Test Game");
    }

    #[test]
    fn test_discover_continues_on_partial_failure() {
        let game = Game::new(
            "steam_123".to_string(),
            "123".to_string(),
            "Working Game".to_string(),
            "/test".to_string(),
            GameSource::Steam,
        );

        let failing = Arc::new(MockScanner {
            games: vec![],
            should_fail: true,
            source: GameSource::Epic,
        });

        let working = Arc::new(MockScanner {
            games: vec![game],
            should_fail: false,
            source: GameSource::Steam,
        });

        let service = GameDiscoveryService::new(vec![failing, working]);
        let games = service.discover().unwrap();

        assert_eq!(games.len(), 1);
        assert_eq!(games[0].title, "Working Game");
    }

    #[test]
    fn test_discover_all_fail() {
        let failing = Arc::new(MockScanner {
            games: vec![],
            should_fail: true,
            source: GameSource::Steam,
        });

        let service = GameDiscoveryService::new(vec![failing]);
        let result = service.discover();

        assert!(result.is_err());
    }

    #[test]
    fn test_scanner_count() {
        let scanner1 = Arc::new(MockScanner {
            games: vec![],
            should_fail: false,
            source: GameSource::Steam,
        });
        let scanner2 = Arc::new(MockScanner {
            games: vec![],
            should_fail: false,
            source: GameSource::Epic,
        });

        let service = GameDiscoveryService::new(vec![scanner1, scanner2]);
        assert_eq!(service.scanner_count(), 2);
    }
}
