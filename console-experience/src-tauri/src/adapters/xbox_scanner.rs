use crate::domain::Game;
use winreg::enums::*;
use winreg::RegKey;
use std::collections::HashSet;

pub struct XboxScanner;

impl XboxScanner {
    /// Native Registry-based UWP/Xbox app scanner.
    /// Deduplicates entries to prevent React rendering errors.
    pub fn scan() -> Vec<Game> {
        let mut games = Vec::new();
        let mut seen_ids = HashSet::new();
        println!("Scanning Xbox/UWP Apps (Deduplicated Registry)...");

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let path = "Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages";

        if let Ok(packages_key) = hkcu.open_subkey(path) {
            for name in packages_key.enum_keys().flatten() {
                if let Ok(pkg_key) = packages_key.open_subkey(&name) {
                    let display_name: String = pkg_key.get_value("DisplayName").unwrap_or_default();
                    let package_id: String = pkg_key.get_value("PackageID").unwrap_or_default();
                    
                    let lower_id = package_id.to_lowercase();
                    
                    let is_game = lower_id.contains("gaming") || 
                                  lower_id.contains("xbox") ||
                                  lower_id.contains("halo") ||
                                  lower_id.contains("forza") ||
                                  lower_id.contains("minecraft") ||
                                  lower_id.contains("ageofempires") ||
                                  lower_id.contains("seaofthieves");

                    if is_game {
                        let family_name = if let Some(first_underscore) = name.find('_') {
                            if let Some(last_underscore) = name.rfind('_') {
                                format!("{}{}", &name[..first_underscore], &name[last_underscore..])
                            } else {
                                name.clone()
                            }
                        } else {
                            name.clone()
                        };

                        // DEDUPLICACIÓN: Si ya vimos este FamilyName, lo saltamos
                        if seen_ids.contains(&family_name) {
                            continue;
                        }
                        seen_ids.insert(family_name.clone());

                        let app_id = format!("{}!App", family_name);
                        let clean_title = if display_name.is_empty() || display_name.contains("ms-resource") { 
                            package_id.split('.').nth(1).unwrap_or(&package_id).to_string() 
                        } else { 
                            display_name 
                        };

                        games.push(Game {
                            id: format!("xbox_{}", family_name),
                            title: clean_title,
                            path: app_id,
                            image: None,
                            last_played: None,
                        });
                    }
                }
            }
        }

        println!("Found {} unique Xbox/UWP games", games.len());
        games
    }
}
