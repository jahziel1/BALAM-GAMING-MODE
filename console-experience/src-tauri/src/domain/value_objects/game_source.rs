use serde::{Deserialize, Serialize};

/// Value object representing the source platform where a game was discovered.
/// Each source has different scanning and metadata capabilities.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum GameSource {
    /// Steam platform (AppID-based)
    Steam,
    /// Epic Games Store
    Epic,
    /// Xbox Game Pass / Microsoft Store
    Xbox,
    /// Manually added by user
    Manual,
}

impl GameSource {
    /// Returns the display name for the source.
    #[must_use]
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Steam => "Steam",
            Self::Epic => "Epic Games",
            Self::Xbox => "Xbox",
            Self::Manual => "Manual",
        }
    }

    /// Returns the ID prefix used for games from this source.
    #[must_use]
    pub fn id_prefix(&self) -> &'static str {
        match self {
            Self::Steam => "steam_",
            Self::Epic => "epic_",
            Self::Xbox => "xbox_",
            Self::Manual => "manual_",
        }
    }

    /// Checks if this source supports automatic metadata fetching.
    #[must_use]
    pub fn supports_metadata(&self) -> bool {
        matches!(self, Self::Steam | Self::Epic | Self::Xbox)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_display_names() {
        assert_eq!(GameSource::Steam.display_name(), "Steam");
        assert_eq!(GameSource::Epic.display_name(), "Epic Games");
        assert_eq!(GameSource::Xbox.display_name(), "Xbox");
        assert_eq!(GameSource::Manual.display_name(), "Manual");
    }

    #[test]
    fn test_id_prefixes() {
        assert_eq!(GameSource::Steam.id_prefix(), "steam_");
        assert_eq!(GameSource::Epic.id_prefix(), "epic_");
        assert_eq!(GameSource::Xbox.id_prefix(), "xbox_");
        assert_eq!(GameSource::Manual.id_prefix(), "manual_");
    }

    #[test]
    fn test_metadata_support() {
        assert!(GameSource::Steam.supports_metadata());
        assert!(GameSource::Epic.supports_metadata());
        assert!(GameSource::Xbox.supports_metadata());
        assert!(!GameSource::Manual.supports_metadata());
    }

    #[test]
    fn test_serialization() {
        let source = GameSource::Steam;
        let json = serde_json::to_string(&source).unwrap();
        let deserialized: GameSource = serde_json::from_str(&json).unwrap();
        assert_eq!(source, deserialized);
    }
}
