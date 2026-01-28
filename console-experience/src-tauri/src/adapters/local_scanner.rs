use walkdir::WalkDir;

// Simple scanner that looks for .exe files in given directories
// TODO: In production, this should parse Steam library folders properly.
pub struct LocalGameScanner;

impl LocalGameScanner {
    pub fn scan_directory(dir: &str) -> Vec<String> {
        let mut games = Vec::new();
        
        for entry in WalkDir::new(dir).min_depth(1).max_depth(3) {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "exe" {
                        // Basic heuristic: Ignore uninstallers and helpers
                        let name = path.file_stem().unwrap().to_string_lossy().to_string();
                        if !name.to_lowercase().contains("uninstall") && !name.to_lowercase().contains("helper") {
                            games.push(path.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
        games
    }
}