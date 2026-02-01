use crate::domain::Game;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tracing::{error, info};

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

        info!(
            "Syncing metadata for {} games. Cache dir: {:?}",
            games.len(),
            covers_dir
        );

        for game in games {
            // Process Cover
            if let Some(img_url) = &game.image {
                if img_url.starts_with("http") {
                    let local_filename = format!("{}_cover.jpg", game.id);
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
                                Err(e) => error!("Failed to write cover to disk: {}", e),
                            },
                            Err(e) => error!("Failed to download cover for {}: {}", game.title, e),
                        }
                    }
                }
            }

            // Process Hero
            if let Some(hero_url) = &game.hero_image {
                if hero_url.starts_with("http") {
                    let local_filename = format!("{}_hero.jpg", game.id);
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
                    let local_filename = format!("{}_logo.png", game.id);
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
            Err(format!("HTTP Error: {}", response.status()))
        }
    }
}
