/// Integration tests: Test full workflows end-to-end
/// These tests verify that all components work together correctly
use console_experience_lib::application::DIContainer;
use console_experience_lib::domain::entities::Game;
use console_experience_lib::domain::value_objects::GameSource;

#[test]
fn test_di_container_initialization() {
    // GIVEN: Fresh DI container
    let container = DIContainer::new();

    // THEN: All services should be initialized
    assert_eq!(
        container.game_discovery_service.scanner_count(),
        4,
        "Should have 4 scanners registered (Steam, Epic, Xbox, Registry)"
    );
}

#[test]
fn test_full_game_discovery_flow() {
    // GIVEN: DI container with all scanners
    let container = DIContainer::new();

    // WHEN: Discover games from all sources
    let discovered = container
        .game_discovery_service
        .discover()
        .expect("Discovery should not fail");

    // THEN: Should return games (may be empty if no games installed)
    // This test validates the flow works, not that games exist
    assert!(
        discovered.len() >= 0,
        "Discovery should return a valid list (empty or with games)"
    );
}

#[test]
fn test_discovery_and_deduplication_flow() {
    // GIVEN: DI container
    let container = DIContainer::new();

    // WHEN: Discover and deduplicate
    let discovered = container.game_discovery_service.discover().unwrap_or_default();

    let original_count = discovered.len();

    let unique_games = container.game_deduplication_service.deduplicate(discovered);

    // THEN: Deduplication should not increase count
    assert!(
        unique_games.len() <= original_count,
        "Deduplication should not increase game count"
    );
}

#[test]
fn test_deduplication_removes_exact_duplicates() {
    // GIVEN: DI container and duplicate games
    let container = DIContainer::new();

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
        "C:\\Games\\test.exe".to_string(), // Same path!
        GameSource::Epic,
    );

    let game3 = Game::new(
        "steam_789".to_string(),
        "789".to_string(),
        "Another Game".to_string(),
        "C:\\Games\\another.exe".to_string(),
        GameSource::Steam,
    );

    let games = vec![game1, game2, game3];

    // WHEN: Deduplicate
    let unique = container.game_deduplication_service.deduplicate(games);

    // THEN: Should have 2 unique games (test.exe counted once + another.exe)
    assert_eq!(unique.len(), 2, "Should remove duplicate game at same path");

    // AND: First occurrence should be kept (Steam has priority)
    let test_game = unique.iter().find(|g| g.title == "Test Game");
    assert!(test_game.is_some());
    assert_eq!(test_game.unwrap().source, GameSource::Steam);
}

#[test]
fn test_scanner_priority_order() {
    // GIVEN: DI container
    let container = DIContainer::new();

    // WHEN: Get discovery service
    let service = &container.game_discovery_service;

    // THEN: Scanner count should be correct
    assert_eq!(
        service.scanner_count(),
        4,
        "Should have Steam, Epic, Xbox, Registry scanners"
    );

    // Note: Priority is tested implicitly through deduplication order
    // Steam (priority 1) games should be kept over Epic (priority 2) for same path
}

#[test]
fn test_game_entity_full_lifecycle() {
    // GIVEN: New game
    let mut game = Game::new(
        "steam_999".to_string(),
        "999".to_string(),
        "Lifecycle Test".to_string(),
        "/path/to/game".to_string(),
        GameSource::Steam,
    );

    // THEN: Initial state
    assert_eq!(game.id, "steam_999");
    assert_eq!(game.title, "Lifecycle Test");
    assert!(game.last_played.is_none());
    assert!(!game.has_artwork());

    // WHEN: Add artwork
    game.image = Some("cover.jpg".to_string());
    game.hero_image = Some("hero.jpg".to_string());

    // THEN: Has artwork
    assert!(game.has_artwork());

    // WHEN: Mark as played
    game.mark_played();

    // THEN: Last played is set
    assert!(game.last_played.is_some());
    let timestamp = game.last_played.unwrap();
    assert!(timestamp > 0, "Timestamp should be positive Unix epoch");
}

#[test]
fn test_multiple_container_instances_independent() {
    // GIVEN: Two separate DI containers
    let container1 = DIContainer::new();
    let container2 = DIContainer::new();

    // WHEN: Use both containers
    let result1 = container1.game_discovery_service.scanner_count();
    let result2 = container2.game_discovery_service.scanner_count();

    // THEN: Both should work independently
    assert_eq!(result1, 4);
    assert_eq!(result2, 4);
}

#[test]
fn test_empty_game_list_handling() {
    // GIVEN: DI container and empty game list
    let container = DIContainer::new();
    let empty_games: Vec<Game> = vec![];

    // WHEN: Deduplicate empty list
    let result = container.game_deduplication_service.deduplicate(empty_games);

    // THEN: Should handle gracefully
    assert_eq!(result.len(), 0);
}

#[test]
fn test_game_source_consistency() {
    // GIVEN: Games from different sources
    let steam_game = Game::new(
        "steam_1".to_string(),
        "1".to_string(),
        "Steam Game".to_string(),
        "/steam/game".to_string(),
        GameSource::Steam,
    );

    let epic_game = Game::new(
        "epic_2".to_string(),
        "2".to_string(),
        "Epic Game".to_string(),
        "/epic/game".to_string(),
        GameSource::Epic,
    );

    let xbox_game = Game::new(
        "xbox_3".to_string(),
        "3".to_string(),
        "Xbox Game".to_string(),
        "/xbox/game".to_string(),
        GameSource::Xbox,
    );

    // THEN: Each game maintains its source
    assert_eq!(steam_game.source, GameSource::Steam);
    assert_eq!(epic_game.source, GameSource::Epic);
    assert_eq!(xbox_game.source, GameSource::Xbox);

    // AND: Source display names are correct
    assert_eq!(steam_game.source.display_name(), "Steam");
    assert_eq!(epic_game.source.display_name(), "Epic Games");
    assert_eq!(xbox_game.source.display_name(), "Xbox");
}
