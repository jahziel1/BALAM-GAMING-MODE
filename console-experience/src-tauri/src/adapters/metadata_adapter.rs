use crate::adapters::identity_engine::IdentityEngine;
use crate::adapters::microsoft_store_adapter::MicrosoftStoreAdapter;
use crate::domain::{Game, GameSource};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tracing::{error, info, warn};

pub struct MetadataAdapter;

impl MetadataAdapter {
    pub fn get_covers_dir(app_handle: &AppHandle) -> PathBuf {
        let path = app_handle
            .path()
            .app_local_data_dir()
            .unwrap_or_default()
            .join("covers");
        if !path.exists() {
            info!("Creating covers directory at: {:?}", path);
            if let Err(e) = fs::create_dir_all(&path) {
                error!("Failed to create covers directory: {}", e);
            }
        }
        path
    }

    pub fn ensure_metadata_cached(games: &mut Vec<Game>, app_handle: &AppHandle) -> bool {
        let covers_dir = Self::get_covers_dir(app_handle);
        let mut any_updated = false;

        // Initialize MS Store adapter for Xbox games
        let ms_store_adapter = MicrosoftStoreAdapter::new();

        info!(
            "Syncing metadata for {} games. Cache dir: {:?}",
            games.len(),
            covers_dir
        );

        for game in games {
            // Special handling for Xbox games - use Microsoft Store API
            if game.source == GameSource::Xbox {
                if Self::process_xbox_game(game, &covers_dir, &ms_store_adapter) {
                    any_updated = true;
                }
                continue;
            }
            // Process Cover
            if let Some(img_url) = &game.image {
                if img_url.starts_with("http") {
                    let game_id = &game.id;
                    let local_filename = format!("{game_id}_cover.jpg");
                    let local_path = covers_dir.join(&local_filename);

                    if local_path.exists() {
                        game.image = Some(local_path.display().to_string());
                        any_updated = true;
                    } else {
                        match Self::download_image(img_url) {
                            Ok(data) => match fs::write(&local_path, data) {
                                Ok(()) => {
                                    info!("Successfully saved cover for {} to {:?}", game.title, local_path);
                                    game.image = Some(local_path.display().to_string());
                                    any_updated = true;
                                },
                                Err(e) => error!("Failed to download cover for {}: {}", game.title, e),
                            },
                            Err(e) => error!("Failed to download cover for {}: {}", game.title, e),
                        }
                    }
                }
            } else {
                // FALLBACK: No image URL provided, try to extract icon from .exe
                info!("No image URL for {}, attempting icon extraction from exe", game.title);

                // Check if icon already exists
                let game_id = &game.id;
                let icon_filename = format!("{game_id}_icon.ico");
                let icon_path = covers_dir.join(&icon_filename);

                if icon_path.exists() {
                    game.image = Some(icon_path.display().to_string());
                    any_updated = true;
                    info!("Using cached icon for {}", game.title);
                } else {
                    // Try to extract icon from the game's exe
                    if let Some(icon_path_str) = IdentityEngine::extract_icon(&game.path, &covers_dir, &game.id) {
                        game.image = Some(icon_path_str);
                        any_updated = true;
                        info!("Successfully extracted icon for {}", game.title);
                    } else {
                        warn!("Failed to extract icon for {} from {}", game.title, game.path);
                        // Icon will remain None, frontend will use placeholder
                    }
                }
            }

            // Process Hero
            if let Some(hero_url) = &game.hero_image {
                if hero_url.starts_with("http") {
                    let game_id = &game.id;
                    let local_filename = format!("{game_id}_hero.jpg");
                    let local_path = covers_dir.join(&local_filename);

                    if local_path.exists() {
                        game.hero_image = Some(local_path.display().to_string());
                        any_updated = true;
                    } else if let Ok(data) = Self::download_image(hero_url) {
                        if fs::write(&local_path, data).is_ok() {
                            info!("Successfully saved hero for {} to {:?}", game.title, local_path);
                            game.hero_image = Some(local_path.display().to_string());
                            any_updated = true;
                        }
                    }
                }
            }

            // Process Logo
            if let Some(logo_url) = &game.logo {
                if logo_url.starts_with("http") {
                    let game_id = &game.id;
                    let local_filename = format!("{game_id}_logo.png");
                    let local_path = covers_dir.join(&local_filename);

                    if local_path.exists() {
                        game.logo = Some(local_path.display().to_string());
                        any_updated = true;
                    } else if let Ok(data) = Self::download_image(logo_url) {
                        if fs::write(&local_path, data).is_ok() {
                            info!("Successfully saved logo for {} to {:?}", game.title, local_path);
                            game.logo = Some(local_path.display().to_string());
                            any_updated = true;
                        }
                    }
                }
            }
        }

        any_updated
    }

    /// Process Xbox game metadata using Microsoft Store API
    fn process_xbox_game(game: &mut Game, covers_dir: &Path, ms_store_adapter: &MicrosoftStoreAdapter) -> bool {
        let mut any_updated = false;

        // Check if we already have cached images
        let game_id = &game.id;
        let cover_path = covers_dir.join(format!("{game_id}_cover.jpg"));
        let hero_path = covers_dir.join(format!("{game_id}_hero.jpg"));
        let logo_path = covers_dir.join(format!("{game_id}_logo.png"));

        // If all images exist, use them
        if cover_path.exists() && hero_path.exists() && logo_path.exists() {
            game.image = Some(cover_path.display().to_string());
            game.hero_image = Some(hero_path.display().to_string());
            game.logo = Some(logo_path.display().to_string());
            return true;
        }

        info!("Fetching Xbox game artwork from Microsoft Store for: {}", game.title);

        // Fetch artwork from MS Store API using PackageFamilyName (stored in raw_id)
        let artwork = match ms_store_adapter.fetch_artwork(&game.raw_id) {
            Ok(art) => art,
            Err(e) => {
                warn!("Failed to fetch MS Store artwork for {}: {}", game.title, e);
                return false;
            },
        };

        // Download and cache cover image
        // Fallback priority: Cover -> Hero -> Logo
        let cover_source = artwork
            .cover_url
            .as_ref()
            .or(artwork.hero_url.as_ref())
            .or(artwork.logo_url.as_ref());

        if let Some(cover_url) = cover_source {
            if !cover_path.exists() {
                match Self::download_image(cover_url) {
                    Ok(data) => {
                        if fs::write(&cover_path, data).is_ok() {
                            info!("✅ Saved Xbox cover for {} to {:?}", game.title, cover_path);
                            game.image = Some(cover_path.display().to_string());
                            any_updated = true;
                        }
                    },
                    Err(e) => warn!("Failed to download Xbox cover for {}: {}", game.title, e),
                }
            } else {
                game.image = Some(cover_path.display().to_string());
                any_updated = true;
            }
        }

        // Download and cache hero image
        if let Some(hero_url) = &artwork.hero_url {
            if !hero_path.exists() {
                match Self::download_image(hero_url) {
                    Ok(data) => {
                        if fs::write(&hero_path, data).is_ok() {
                            info!("✅ Saved Xbox hero for {} to {:?}", game.title, hero_path);
                            game.hero_image = Some(hero_path.display().to_string());
                            any_updated = true;
                        }
                    },
                    Err(e) => warn!("Failed to download Xbox hero for {}: {}", game.title, e),
                }
            } else {
                game.hero_image = Some(hero_path.display().to_string());
                any_updated = true;
            }
        }

        // Download and cache logo image
        if let Some(logo_url) = &artwork.logo_url {
            if !logo_path.exists() {
                match Self::download_image(logo_url) {
                    Ok(data) => {
                        if fs::write(&logo_path, data).is_ok() {
                            info!("✅ Saved Xbox logo for {} to {:?}", game.title, logo_path);
                            game.logo = Some(logo_path.display().to_string());
                            any_updated = true;
                        }
                    },
                    Err(e) => warn!("Failed to download Xbox logo for {}: {}", game.title, e),
                }
            } else {
                game.logo = Some(logo_path.display().to_string());
                any_updated = true;
            }
        }

        any_updated
    }

    fn download_image(url: &str) -> Result<Vec<u8>, String> {
        info!("Fetching remote asset: {}", url);
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .user_agent("BalamGridEngine/1.0")
            .build()
            .map_err(|e| e.to_string())?;

        let response = client.get(url).send().map_err(|e| format!("Network error: {e}"))?;

        if response.status().is_success() {
            let bytes = response.bytes().map_err(|e| format!("Data error: {e}"))?;
            Ok(bytes.to_vec())
        } else {
            let status = response.status();
            Err(format!("HTTP Error: {status}"))
        }
    }
}
