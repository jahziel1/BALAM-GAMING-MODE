use std::fs;
use std::path::Path;
use serde::Deserialize;
use crate::domain::Game;
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
    // We could extract more, but this is enough
}

pub struct EpicScanner;

impl EpicScanner {
    pub fn scan() -> Vec<Game> {
        let mut games = Vec::new();
        info!("Scanning Epic Games...");

        // Standard Epic Manifests location
        let manifest_path = "C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests";
        
        if let Ok(entries) = fs::read_dir(manifest_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("item") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(manifest) = serde_json::from_str::<EpicManifest>(&content) {
                            // Basic filter: Skip engine versions
                            if manifest.display_name.contains("UE_") {
                                continue;
                            }

                            // Construct full path to executable
                            let install_path = Path::new(&manifest.install_location);
                            let full_exe_path = install_path.join(&manifest.launch_executable);

                            games.push(Game {
                                id: format!("epic_{}", manifest.catalog_item_id),
                                title: manifest.display_name,
                                path: full_exe_path.to_string_lossy().to_string(),
                                image: None, // Epic doesn't provide local images easily. We'd need an IGDB lookup later.
                                last_played: None,
                            });
                        }
                    }
                }
            }
        }
        
        info!("Epic Games scan complete. Found {} games", games.len());
        games
    }
}
