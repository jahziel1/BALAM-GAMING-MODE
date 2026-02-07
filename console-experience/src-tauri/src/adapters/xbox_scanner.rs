use crate::config::ExclusionConfig;
use crate::domain::errors::ScanError;
use crate::domain::{Game, GameSource};
use crate::ports::GameScanner;
use std::collections::HashSet;
use tracing::info;
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

/// Xbox Game Pass / Microsoft Store scanner.
/// Reads UWP app packages from Windows Registry.
pub struct XboxScanner {
    exclusions: ExclusionConfig,
}

impl XboxScanner {
    /// Creates a new Xbox scanner with default exclusions.
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
        let mut seen_ids = HashSet::new();
        info!("Scanning Xbox/UWP Apps (Deduplicated Registry)...");

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let path = "Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages";

        if let Ok(packages_key) = hkcu.open_subkey(path) {
            for name in packages_key.enum_keys().flatten() {
                if let Ok(pkg_key) = packages_key.open_subkey(&name) {
                    let display_name: String = pkg_key.get_value("DisplayName").unwrap_or_default();
                    let package_id: String = pkg_key.get_value("PackageID").unwrap_or_default();

                    let lower_id = package_id.to_lowercase();

                    let is_game = lower_id.contains("gaming")
                        || lower_id.contains("xbox")
                        || lower_id.contains("halo")
                        || lower_id.contains("forza")
                        || lower_id.contains("minecraft")
                        || lower_id.contains("ageofempires")
                        || lower_id.contains("seaofthieves");

                    if is_game {
                        let family_name = if let Some(first_underscore) = name.find('_') {
                            if let Some(last_underscore) = name.rfind('_') {
                                let prefix = &name[..first_underscore];
                                let suffix = &name[last_underscore..];
                                format!("{prefix}{suffix}")
                            } else {
                                name.clone()
                            }
                        } else {
                            name.clone()
                        };

                        // Skip excluded patterns
                        if self
                            .exclusions
                            .xbox_patterns
                            .iter()
                            .any(|pattern| family_name.contains(pattern))
                        {
                            continue;
                        }

                        if seen_ids.contains(&family_name) {
                            continue;
                        }
                        seen_ids.insert(family_name.clone());

                        let app_id = format!("{family_name}!App");
                        let clean_title = if display_name.is_empty() || display_name.contains("ms-resource") {
                            package_id.split('.').nth(1).unwrap_or(&package_id).to_string()
                        } else {
                            display_name
                        };

                        games.push(Game {
                            id: format!("xbox_{family_name}"),
                            raw_id: family_name.clone(),
                            title: clean_title,
                            path: app_id,
                            image: None,
                            hero_image: None,
                            logo: None,
                            last_played: None,
                            source: GameSource::Xbox,
                        });
                    }
                }
            }
        }

        info!("Xbox/UWP scan complete. Found {} unique games", games.len());
        Ok(games)
    }
}

impl Default for XboxScanner {
    fn default() -> Self {
        Self::new()
    }
}

impl GameScanner for XboxScanner {
    fn scan(&self) -> Result<Vec<Game>, ScanError> {
        self.scan_internal()
    }

    fn source(&self) -> GameSource {
        GameSource::Xbox
    }

    fn priority(&self) -> u32 {
        3 // Third priority after Steam and Epic
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scanner_creation() {
        let scanner = XboxScanner::new();
        assert!(!scanner.exclusions.xbox_patterns.is_empty());
    }

    #[test]
    fn test_scanner_implements_trait() {
        let scanner = XboxScanner::new();
        assert_eq!(scanner.source(), GameSource::Xbox);
        assert_eq!(scanner.priority(), 3);
    }

    #[test]
    fn test_exclusion_patterns() {
        let scanner = XboxScanner::new();

        // Verify excluded patterns are in config
        assert!(scanner
            .exclusions
            .xbox_patterns
            .iter()
            .any(|p| p.contains("Microsoft.Gaming")));
        assert!(scanner.exclusions.xbox_patterns.iter().any(|p| p.contains("Xbox.TCUI")));
    }

    #[test]
    fn test_scanner_default() {
        let scanner = XboxScanner::default();
        assert_eq!(scanner.source(), GameSource::Xbox);
    }
}
