use steamlocate::SteamDir;
use crate::domain::Game;
use tracing::{info, warn};

pub struct SteamScanner;

impl SteamScanner {
    pub fn scan() -> Vec<Game> {
        let mut games = Vec::new();
        
        info!("Scanning Steam...");

        // In steamlocate v2, locate() returns a SteamDir
        match SteamDir::locate() {
            Ok(steam_dir) => {
                let steam_path = steam_dir.path().to_path_buf(); // Use getter method
                let steamapps = steam_path.join("steamapps");
                
                // Scan default steamapps
                Self::scan_folder(&steamapps, &mut games);

                // Also need to read libraryfolders.vdf to find other drives
                // ... (omitted for brevity in this fix, let's get default working first)
            },
            Err(_) => warn!("Steam was not found on this system"),
        }
        
        info!("Steam scan complete. Found {} games", games.len());
        games
    }
    
    fn scan_folder(steamapps_path: &std::path::Path, games: &mut Vec<Game>) {
        if let Ok(entries) = std::fs::read_dir(steamapps_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                // Check for appmanifest_*.acf
                if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                    if filename.starts_with("appmanifest_") && filename.ends_with(".acf") {
                        // Extract AppID from filename: appmanifest_1091500.acf
                        let app_id_str = filename.trim_start_matches("appmanifest_").trim_end_matches(".acf");
                        
                        // Parse ACF file manually (it's KeyValues format)
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            // Quick and dirty parser for "name" and "installdir"
                            let name = Self::extract_value(&content, "name");
                            let install_dir = Self::extract_value(&content, "installdir");

                            if let (Some(name), Some(install_dir)) = (name, install_dir) {
                                let image_url = format!("https://cdn.akamai.steamstatic.com/steam/apps/{}/library_600x900.jpg", app_id_str);
                                
                                // Construct the Game Directory path
                                // steamapps_path is ".../steamapps"
                                // Game dir is ".../steamapps/common/{install_dir}"
                                let common_path = steamapps_path.join("common").join(install_dir);
                                
                                games.push(Game {
                                    id: format!("steam_{}", app_id_str),
                                    title: name,
                                    path: common_path.display().to_string(), // Now points to the Game Directory
                                    image: Some(image_url),
                                    last_played: None, 
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    fn extract_value(content: &str, key: &str) -> Option<String> {
        for line in content.lines() {
            if line.contains(key) {
                // line looks like: "name"  "Cyberpunk 2077"
                let parts: Vec<&str> = line.split('"').collect();
                if parts.len() >= 4 {
                    return Some(parts[3].to_string());
                }
            }
        }
        None
    }
}