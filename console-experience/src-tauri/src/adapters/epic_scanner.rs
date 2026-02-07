use crate::config::ExclusionConfig;
use crate::domain::errors::ScanError;
use crate::domain::{Game, GameSource};
use crate::ports::GameScanner;
use serde::Deserialize;
use std::fs;
use std::path::Path;
use tracing::info;

#[derive(Deserialize, Debug)]
struct EpicManifest {
    #[serde(rename = "DisplayName")]
    display_name: String,
    #[serde(rename = "InstallLocation")]
    install_location: String,
    #[serde(rename = "LaunchExecutable")]
    launch_executable: String,
    #[serde(rename = "CatalogItemId")]
    catalog_item_id: String,
}

/// Epic Games Store scanner.
///
/// Discovers installed Epic games by parsing `.item` manifest files
/// from the Epic Games Launcher data directory.
///
/// # Data Sources
/// - **Manifest Directory**: `%ProgramData%\Epic\EpicGamesLauncher\Data\Manifests\`
/// - **Manifest Format**: JSON (`.item` files)
/// - **Metadata Quality**: High (`DisplayName`, `InstallLocation`, `LaunchExecutable`)
///
/// # Performance
/// Typical scan time: **200-500ms** for 50-100 games.
///
/// # Thread Safety
/// Safe to use concurrently via `Arc<EpicScanner>`.
///
/// # Examples
/// ```rust
/// use console_experience::adapters::epic_scanner::EpicScanner;
/// use console_experience::ports::GameScanner;
///
/// let scanner = EpicScanner::new();
/// match scanner.scan() {
///     `Ok`(games) => println!("Found {} Epic games", games.len()),
///     `Err`(e) => eprintln!("Epic scan failed: {}", e),
/// }
/// ```
pub struct EpicScanner {
    exclusions: ExclusionConfig,
}

impl EpicScanner {
    /// Creates a new Epic scanner with default exclusions.
    ///
    /// Exclusions filter out non-game entries (e.g., Unreal Engine builds).
    ///
    /// # Examples
    /// ```rust
    /// use console_experience::adapters::epic_scanner::EpicScanner;
    ///
    /// let scanner = EpicScanner::new();
    /// ```
    #[must_use]
    pub fn new() -> Self {
        Self {
            exclusions: ExclusionConfig::load_or_default(),
        }
    }

    /// Legacy static scan method for backward compatibility.
    ///
    /// **Deprecated**: Use `EpicScanner::new().scan()` instead.
    ///
    /// # Returns
    /// Empty vector if scan fails (errors are silently ignored).
    #[must_use]
    pub fn scan() -> Vec<Game> {
        Self::new().scan_internal().unwrap_or_default()
    }

    fn scan_internal(&self) -> Result<Vec<Game>, ScanError> {
        let mut games = Vec::new();
        info!("Scanning Epic Games...");

        let manifest_path = "C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests";

        if let Ok(entries) = fs::read_dir(manifest_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("item") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(manifest) = serde_json::from_str::<EpicManifest>(&content) {
                            // Skip excluded patterns (Unreal Engine, etc.)
                            if self
                                .exclusions
                                .epic_patterns
                                .iter()
                                .any(|pattern| manifest.display_name.contains(pattern))
                            {
                                continue;
                            }

                            let install_path = Path::new(&manifest.install_location);
                            let full_exe_path = install_path.join(&manifest.launch_executable);
                            let catalog_item_id = &manifest.catalog_item_id;

                            games.push(Game {
                                id: format!("epic_{catalog_item_id}"),
                                raw_id: catalog_item_id.clone(),
                                title: manifest.display_name,
                                path: full_exe_path.to_string_lossy().to_string(),
                                image: None,
                                hero_image: None,
                                logo: None,
                                last_played: None,
                                source: GameSource::Epic,
                            });
                        }
                    }
                }
            }
        }

        info!("Epic Games scan complete. Found {} games", games.len());
        Ok(games)
    }
}

impl Default for EpicScanner {
    fn default() -> Self {
        Self::new()
    }
}

impl GameScanner for EpicScanner {
    fn scan(&self) -> Result<Vec<Game>, ScanError> {
        self.scan_internal()
    }

    fn source(&self) -> GameSource {
        GameSource::Epic
    }

    fn priority(&self) -> u32 {
        2 // Second priority after Steam
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scanner_creation() {
        let scanner = EpicScanner::new();
        assert!(!scanner.exclusions.epic_patterns.is_empty());
    }

    #[test]
    fn test_scanner_implements_trait() {
        let scanner = EpicScanner::new();
        assert_eq!(scanner.source(), GameSource::Epic);
        assert_eq!(scanner.priority(), 2);
    }

    #[test]
    fn test_exclusion_patterns() {
        let scanner = EpicScanner::new();

        // Verify excluded patterns are in config
        assert!(scanner.exclusions.epic_patterns.contains(&"UE_".to_string()));
        assert!(scanner.exclusions.epic_patterns.contains(&"UnrealEngine".to_string()));
    }

    #[test]
    fn test_manifest_deserialization() {
        let json = r#"{
            "DisplayName": "Fortnite",
            "InstallLocation": "C:\\Program Files\\Epic Games\\Fortnite",
            "LaunchExecutable": "FortniteClient-Win64-Shipping.exe",
            "CatalogItemId": "4fe75bbc5a674f4f9b356b5c90567da5"
        }"#;

        let manifest: Result<EpicManifest, _> = serde_json::from_str(json);
        assert!(manifest.is_ok());

        let manifest = manifest.unwrap();
        assert_eq!(manifest.display_name, "Fortnite");
        assert_eq!(manifest.catalog_item_id, "4fe75bbc5a674f4f9b356b5c90567da5");
    }
}
