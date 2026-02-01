use path_clean::PathClean;
use pelite::pe64::{Pe, PeFile};
use pelite::FileMap;
use std::fs;
use std::path::Path;

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
}
