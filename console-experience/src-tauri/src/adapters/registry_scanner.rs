use crate::config::ExclusionConfig;
use crate::domain::errors::ScanError;
use crate::domain::{Game, GameSource};
use crate::ports::GameScanner;
use std::path::Path;
use tracing::info;
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
use winreg::RegKey;

/// Windows Registry scanner for games not managed by Steam/Epic/Xbox.
/// Scans Uninstall registry keys for potential games (GOG, independent games, etc.).
pub struct RegistryScanner {
    exclusions: ExclusionConfig,
}

impl RegistryScanner {
    /// Creates a new Registry scanner with default exclusions.
    #[must_use]
    pub fn new() -> Self {
        Self {
            exclusions: ExclusionConfig::load_or_default(),
        }
    }

    /// Legacy static scan method for backward compatibility.
    #[must_use]
    pub fn scan() -> Vec<Game> {
        Self::new().scan_internal().unwrap_or_default()
    }

    fn scan_internal(&self) -> Result<Vec<Game>, ScanError> {
        let mut games = Vec::new();
        info!("Scanning Windows Registry for independent games...");

        let paths = [
            (
                HKEY_LOCAL_MACHINE,
                "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
            ),
            (
                HKEY_LOCAL_MACHINE,
                "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
            ),
            (
                HKEY_CURRENT_USER,
                "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
            ),
        ];

        for (root, path) in paths {
            let root_key = RegKey::predef(root);
            if let Ok(uninstall_key) = root_key.open_subkey(path) {
                for name in uninstall_key.enum_keys().flatten() {
                    // CRITICAL: Skip Steam, Epic, and Xbox games in the registry scan
                    // as they have dedicated, metadata-rich scanners.
                    let lower_name = name.to_lowercase();
                    if lower_name.contains("steam app")
                        || lower_name.starts_with("epic_")
                        || lower_name.contains("microsofthome")
                    {
                        continue;
                    }

                    if let Ok(item_key) = uninstall_key.open_subkey(&name) {
                        let title: String = item_key.get_value("DisplayName").unwrap_or_default();
                        let install_location: String = item_key.get_value("InstallLocation").unwrap_or_default();
                        let display_icon: String = item_key.get_value("DisplayIcon").unwrap_or_default();

                        if title.is_empty() || install_location.is_empty() {
                            continue;
                        }

                        let lower_title = title.to_lowercase();
                        let lower_path = install_location.to_lowercase();

                        // Check if it's a game based on common paths, but EXCLUDE managed stores
                        let is_potential_game = lower_path.contains("game")
                            || lower_path.contains("gog")
                            || lower_path.contains("riot games")
                            || lower_path.contains("ubisoft");

                        // Skip Steam/Epic folders even in path checks
                        if lower_path.contains("steamapps") || lower_path.contains("epic games") {
                            continue;
                        }

                        let publisher: String = item_key
                            .get_value::<String, _>("Publisher")
                            .unwrap_or_default()
                            .to_lowercase();

                        // Check against exclusion config
                        let is_excluded = self
                            .exclusions
                            .registry_excludes
                            .iter()
                            .any(|pattern| lower_title.contains(&pattern.to_lowercase()));

                        let is_software = is_excluded
                            || publisher.contains("microsoft")
                            || publisher.contains("google")
                            || publisher.contains("adobe")
                            || publisher.contains("nvidia")
                            || publisher.contains("intel")
                            || lower_title.contains("driver")
                            || lower_title.contains("update");

                        if is_potential_game && !is_software {
                            let mut exe_path = display_icon.split(',').next().unwrap_or_default().to_string();

                            if exe_path.is_empty() || !Path::new(&exe_path).exists() {
                                if let Ok(dir_entries) = std::fs::read_dir(&install_location) {
                                    if let Some(entry) = dir_entries.flatten().find(|e| {
                                        e.path().extension().is_some_and(|ext| ext == "exe")
                                            && !e.file_name().to_string_lossy().to_lowercase().contains("uninstall")
                                    }) {
                                        exe_path = entry.path().to_string_lossy().to_string();
                                    }
                                }
                            }

                            if !exe_path.is_empty() && Path::new(&exe_path).exists() {
                                games.push(Game {
                                    id: format!("reg_{name}"),
                                    raw_id: name,
                                    title,
                                    path: exe_path,
                                    image: None,
                                    hero_image: None,
                                    logo: None,
                                    last_played: None,
                                    source: GameSource::Manual,
                                });
                            }
                        }
                    }
                }
            }
        }

        info!("Registry scan complete. Found {} independent games", games.len());
        Ok(games)
    }
}

impl Default for RegistryScanner {
    fn default() -> Self {
        Self::new()
    }
}

impl GameScanner for RegistryScanner {
    fn scan(&self) -> Result<Vec<Game>, ScanError> {
        self.scan_internal()
    }

    fn source(&self) -> GameSource {
        GameSource::Manual
    }

    fn priority(&self) -> u32 {
        4 // Lowest priority - manual/registry games
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scanner_creation() {
        let scanner = RegistryScanner::new();
        assert!(!scanner.exclusions.registry_excludes.is_empty());
    }

    #[test]
    fn test_scanner_implements_trait() {
        let scanner = RegistryScanner::new();
        assert_eq!(scanner.source(), GameSource::Manual);
        assert_eq!(scanner.priority(), 4);
    }

    #[test]
    fn test_exclusion_patterns() {
        let scanner = RegistryScanner::new();

        // Verify excluded patterns are in config
        assert!(scanner
            .exclusions
            .registry_excludes
            .iter()
            .any(|p| p.contains("DirectX")));
        assert!(scanner
            .exclusions
            .registry_excludes
            .iter()
            .any(|p| p.contains("VCRedist")));
        assert!(scanner
            .exclusions
            .registry_excludes
            .iter()
            .any(|p| p.contains("Redistributable")));
    }

    #[test]
    fn test_scanner_default() {
        let scanner = RegistryScanner::default();
        assert_eq!(scanner.source(), GameSource::Manual);
    }
}
