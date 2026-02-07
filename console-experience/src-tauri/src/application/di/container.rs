use crate::adapters::battlenet_scanner::BattleNetScanner;
use crate::adapters::epic_scanner::EpicScanner;
use crate::adapters::registry_scanner::RegistryScanner;
use crate::adapters::steam_scanner::SteamScanner;
use crate::adapters::xbox_scanner::XboxScanner;
use crate::application::active_games::ActiveGamesTracker;
use crate::domain::services::{GameDeduplicationService, GameDiscoveryService};
use crate::ports::GameScanner;
use std::sync::Arc;

/// Dependency Injection Container.
/// Manages application-wide service instances and their dependencies.
#[derive(Clone)]
pub struct DIContainer {
    pub game_discovery_service: Arc<GameDiscoveryService>,
    pub game_deduplication_service: Arc<GameDeduplicationService>,
    pub active_games_tracker: Arc<ActiveGamesTracker>,
}

impl DIContainer {
    /// Creates a new DI container with all services initialized.
    pub fn new() -> Self {
        use tracing::info;

        info!("Initializing DI Container...");

        // Register all game scanners
        let scanners: Vec<Arc<dyn GameScanner>> = vec![
            Arc::new(SteamScanner::new()),
            Arc::new(EpicScanner::new()),
            Arc::new(XboxScanner::new()),
            Arc::new(BattleNetScanner::new()),
            Arc::new(RegistryScanner::new()),
        ];

        info!("Registered {} scanners", scanners.len());

        Self {
            game_discovery_service: Arc::new(GameDiscoveryService::new(scanners)),
            game_deduplication_service: Arc::new(GameDeduplicationService::new()),
            active_games_tracker: Arc::new(ActiveGamesTracker::new()),
        }
    }
}

impl Default for DIContainer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_container_creation() {
        let container = DIContainer::new();
        assert_eq!(container.game_discovery_service.scanner_count(), 5);
    }

    #[test]
    fn test_container_default() {
        let container = DIContainer::default();
        assert_eq!(container.game_discovery_service.scanner_count(), 5);
    }
}
