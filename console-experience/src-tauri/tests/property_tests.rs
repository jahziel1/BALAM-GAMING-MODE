use console_experience_lib::domain::entities::Game;
use console_experience_lib::domain::services::GameDeduplicationService;
use console_experience_lib::domain::value_objects::GameSource;
use proptest::prelude::*;

/// Property: Deduplication is idempotent
/// Running deduplicate twice should give the same result as running it once
#[cfg(test)]
mod deduplication_properties {
    use super::*;

    proptest! {
        #[test]
        fn prop_deduplication_idempotent(
            titles in prop::collection::vec("[a-z]{3,10}", 0..50),
            paths in prop::collection::vec("[a-z]{5,15}", 0..50),
        ) {
            let service = GameDeduplicationService::new();

            // Create games from generated data
            let games: Vec<Game> = titles.into_iter()
                .zip(paths.into_iter())
                .map(|(title, path)| {
                    Game::new(
                        format!("test_{}", title),
                        title.clone(),
                        title,
                        path,
                        GameSource::Steam,
                    )
                })
                .collect();

            // Deduplication should be idempotent
            let once = service.deduplicate(games.clone());
            let twice = service.deduplicate(once.clone());

            prop_assert_eq!(once.len(), twice.len(), "Deduplication should be idempotent");
        }

        #[test]
        fn prop_deduplication_reduces_or_maintains_size(
            titles in prop::collection::vec("[a-z]{3,10}", 0..100),
        ) {
            let service = GameDeduplicationService::new();

            let games: Vec<Game> = titles.into_iter()
                .enumerate()
                .map(|(i, title)| {
                    Game::new(
                        format!("test_{}", i),
                        i.to_string(),
                        title.clone(),
                        format!("/path/{}", i),
                        GameSource::Steam,
                    )
                })
                .collect();

            let original_count = games.len();
            let deduplicated = service.deduplicate(games);

            prop_assert!(
                deduplicated.len() <= original_count,
                "Deduplication should never increase game count"
            );
        }

        #[test]
        fn prop_empty_list_stays_empty(
            _seed in 0u32..1000,
        ) {
            let service = GameDeduplicationService::new();
            let empty: Vec<Game> = vec![];
            let result = service.deduplicate(empty);

            prop_assert_eq!(result.len(), 0, "Empty list should stay empty");
        }

        #[test]
        fn prop_single_game_stays_single(
            title in "[a-z]{5,15}",
            path in "[a-z]{5,15}",
        ) {
            let service = GameDeduplicationService::new();
            let game = Game::new(
                "test_1".to_string(),
                "1".to_string(),
                title,
                path,
                GameSource::Steam,
            );

            let result = service.deduplicate(vec![game]);

            prop_assert_eq!(result.len(), 1, "Single game should remain");
        }
    }
}

/// Property: Game entity invariants
#[cfg(test)]
mod game_entity_properties {
    use super::*;

    proptest! {
        #[test]
        fn prop_game_id_never_empty(
            id in "[a-z0-9_]{1,20}",
            raw_id in "[0-9]{1,10}",
            title in "[a-z ]{3,30}",
            path in "[a-z/]{5,50}",
        ) {
            let game = Game::new(id.clone(), raw_id, title, path, GameSource::Steam);

            prop_assert!(!game.id.is_empty(), "Game ID should never be empty");
            prop_assert_eq!(game.id, id, "Game ID should match input");
        }

        #[test]
        fn prop_mark_played_always_sets_timestamp(
            id in "[a-z0-9_]{1,20}",
            raw_id in "[0-9]{1,10}",
            title in "[a-z ]{3,30}",
            path in "[a-z/]{5,50}",
        ) {
            let mut game = Game::new(id, raw_id, title, path, GameSource::Steam);

            prop_assert!(game.last_played.is_none(), "New game should not have last_played");

            game.mark_played();

            prop_assert!(game.last_played.is_some(), "mark_played should set timestamp");
        }

        #[test]
        fn prop_has_artwork_consistent(
            id in "[a-z0-9_]{1,20}",
            has_image in prop::bool::ANY,
            has_hero in prop::bool::ANY,
            has_logo in prop::bool::ANY,
        ) {
            let mut game = Game::new(
                id,
                "1".to_string(),
                "Test".to_string(),
                "/path".to_string(),
                GameSource::Steam,
            );

            if has_image { game.image = Some("img.jpg".to_string()); }
            if has_hero { game.hero_image = Some("hero.jpg".to_string()); }
            if has_logo { game.logo = Some("logo.png".to_string()); }

            let expected = has_image || has_hero || has_logo;
            prop_assert_eq!(
                game.has_artwork(),
                expected,
                "has_artwork should be true if any artwork exists"
            );
        }
    }
}
