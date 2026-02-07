use path_clean::PathClean;
use pelite::pe64::{Pe, PeFile};
use pelite::resources::FindError;
use pelite::FileMap;
use std::fs;
use std::path::Path;
use tracing::{info, warn};

pub struct IdentityEngine;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct GameIdentity {
    pub canonical_path: String,
    pub internal_name: Option<String>,
}

impl IdentityEngine {
    /// Generates a robust identity for a game executable.
    #[must_use]
    pub fn get_identity(path: &str) -> GameIdentity {
        let canonical = Self::canonicalize_path(path);
        let internal_name = Self::extract_pe_internal_name(path);

        GameIdentity {
            canonical_path: canonical,
            internal_name,
        }
    }

    /// Normalizes paths to be "Canonical"
    fn canonicalize_path(path: &str) -> String {
        let p = Path::new(path);

        if p.is_dir() {
            return p.to_path_buf().clean().to_string_lossy().to_lowercase();
        }

        match fs::canonicalize(p) {
            Ok(canon) => {
                let path_str = canon.to_string_lossy().to_string();
                path_str.trim_start_matches(r"\\?\").to_lowercase()
            },
            Err(_) => p.to_path_buf().clean().to_string_lossy().to_lowercase(),
        }
    }

    /// Extracts original filename or internal name from PE Headers using pelite 0.10
    fn extract_pe_internal_name(path: &str) -> Option<String> {
        let p = Path::new(path);
        if !p.exists() || p.is_dir() || p.extension().is_none_or(|ext| ext != "exe") {
            return None;
        }

        let map = match FileMap::open(path) {
            Ok(m) => m,
            Err(_) => return None,
        };

        if let Ok(file) = PeFile::from_bytes(&map) {
            if let Ok(resources) = file.resources() {
                if let Ok(version_info) = resources.version_info() {
                    let mut result = None;

                    // pelite 0.10 version_info.translation() returns &[Language]
                    let langs = version_info.translation();
                    for lang in langs {
                        version_info.strings(*lang, |key, value| {
                            if result.is_none() && (key == "InternalName" || key == "OriginalFilename") {
                                result = Some(value.to_lowercase());
                            }
                        });
                        if result.is_some() {
                            break;
                        }
                    }
                    return result;
                }
            }
        }

        None
    }

    /// Extracts the icon from a .exe file and saves it as PNG
    ///
    /// Returns the path to the saved icon file, or `None` if extraction failed.
    ///
    /// # Arguments
    /// * `exe_path` - Path to the .exe file
    /// * `output_dir` - Directory where to save the extracted icon
    /// * `game_id` - Unique game ID for naming the icon file
    ///
    /// # Returns
    /// `Some(path)` if icon was successfully extracted and saved, `None` otherwise
    pub fn extract_icon(exe_path: &str, output_dir: &Path, game_id: &str) -> Option<String> {
        let p = Path::new(exe_path);
        if !p.exists() || p.is_dir() || p.extension().is_none_or(|ext| ext != "exe") {
            return None;
        }

        info!("Attempting to extract icon from: {}", exe_path);

        let map = match FileMap::open(exe_path) {
            Ok(m) => m,
            Err(e) => {
                warn!("Failed to open PE file {}: {}", exe_path, e);
                return None;
            },
        };

        let file = match PeFile::from_bytes(&map) {
            Ok(f) => f,
            Err(e) => {
                warn!("Failed to parse PE file {}: {}", exe_path, e);
                return None;
            },
        };

        let resources = match file.resources() {
            Ok(r) => r,
            Err(e) => {
                warn!("Failed to get resources from {}: {}", exe_path, e);
                return None;
            },
        };

        // Try to find icon group (RT_GROUP_ICON = 14)
        // Icon groups contain metadata about available icons
        let icon_group_result = resources.find_resource(&[
            pelite::resources::Name::Id(14), // RT_GROUP_ICON
            pelite::resources::Name::Id(1),  // First icon group
        ]);

        if icon_group_result.is_err() {
            warn!("No icon group found in {}", exe_path);
            return None;
        }

        // Try to get the actual icon data (RT_ICON = 3)
        // We'll try to get the first icon in the group
        let icon_result = resources.find_resource(&[
            pelite::resources::Name::Id(3), // RT_ICON
            pelite::resources::Name::Id(1), // First icon
        ]);

        match icon_result {
            Ok(icon_data) => {
                // The icon data from PE is in ICO format
                // Save as .ico and let the frontend handle it
                let ico_filename = format!("{game_id}_icon.ico");
                let ico_path = output_dir.join(&ico_filename);

                match fs::write(&ico_path, icon_data) {
                    Ok(()) => {
                        info!("Successfully extracted icon for {} to {:?}", game_id, ico_path);
                        Some(ico_path.display().to_string())
                    },
                    Err(e) => {
                        warn!("Failed to write icon file: {}", e);
                        None
                    },
                }
            },
            Err(FindError::NotFound) => {
                warn!("Icon not found in {}", exe_path);
                None
            },
            Err(e) => {
                warn!("Error finding icon in {}: {:?}", exe_path, e);
                None
            },
        }
    }
}
