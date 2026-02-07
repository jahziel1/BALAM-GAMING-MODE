use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{LazyLock, Mutex};
use tracing::{info, warn};

/// Global lock to prevent concurrent downloads
static DOWNLOAD_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

/// `PresentMon` downloader and bundler.
///
/// Handles automatic download and caching of PresentMon64.exe for FPS monitoring.
///
/// # Features
/// - Downloads from official GitHub releases
/// - Caches in app data directory
/// - Verifies file integrity
/// - Fallback to bundled version if available
/// - Prevents concurrent downloads with global lock
///
/// # Download URL
/// Latest stable: https://github.com/GameTechDev/`PresentMon`/releases
pub struct PresentMonDownloader;

impl PresentMonDownloader {
    /// `PresentMon` version to download
    const VERSION: &'static str = "2.2.0";

    /// GitHub release URL pattern
    const DOWNLOAD_URL: &'static str =
        "https://github.com/GameTechDev/PresentMon/releases/download/v2.2.0/PresentMon-2.2.0-x64.exe";

    /// Expected file size (for validation)
    /// `PresentMon` v2.2.0 is ~393KB
    const EXPECTED_SIZE_MIN: u64 = 300_000; // ~300KB minimum

    /// Gets the path where `PresentMon` should be located.
    ///
    /// Priority:
    /// 1. Bundled with app (in resources)
    /// 2. Cached in app data directory
    /// 3. Download location (if needs download)
    ///
    /// # Returns
    /// Path to PresentMon64.exe (may not exist yet)
    pub fn get_presentmon_path() -> Result<PathBuf, String> {
        // Try bundled version first (included in Tauri resources)
        if let Ok(bundled) = Self::get_bundled_path() {
            if bundled.exists() {
                info!("Found bundled PresentMon at: {}", bundled.display());
                return Ok(bundled);
            }
        }

        // Try cached version
        if let Ok(cached) = Self::get_cache_path() {
            if cached.exists() {
                info!("Found cached PresentMon at: {}", cached.display());
                return Ok(cached);
            }
        }

        // Return cache path for download
        Self::get_cache_path()
    }

    /// Gets the bundled `PresentMon` path (in Tauri resources).
    ///
    /// # Returns
    /// Path to bundled PresentMon64.exe
    fn get_bundled_path() -> Result<PathBuf, String> {
        // Tauri resources are in: <exe_dir>/_resources/
        let exe_dir = std::env::current_exe()
            .map_err(|e| format!("Failed to get exe dir: {e}"))?
            .parent()
            .ok_or("Failed to get parent dir")?
            .to_path_buf();

        // Check multiple possible locations
        let possible_paths = vec![
            exe_dir.join("PresentMon64.exe"),
            exe_dir.join("resources").join("PresentMon64.exe"),
            exe_dir.join("_resources").join("PresentMon64.exe"),
        ];

        for path in possible_paths {
            if path.exists() {
                return Ok(path);
            }
        }

        Err("Bundled PresentMon not found".to_string())
    }

    /// Gets the cache path for downloaded `PresentMon`.
    ///
    /// # Returns
    /// Path in app data: %LOCALAPPDATA%/Balam/PresentMon64.exe
    fn get_cache_path() -> Result<PathBuf, String> {
        let app_data = std::env::var("LOCALAPPDATA").map_err(|e| format!("Failed to get LOCALAPPDATA: {e}"))?;

        let cache_dir = PathBuf::from(app_data).join("Balam");

        // Create directory if not exists
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir).map_err(|e| format!("Failed to create cache dir: {e}"))?;
        }

        Ok(cache_dir.join("PresentMon64.exe"))
    }

    /// Downloads PresentMon64.exe from GitHub releases.
    ///
    /// # Returns
    /// Path to downloaded executable
    ///
    /// # Errors
    /// Returns error if download fails, network unavailable, or file invalid.
    ///
    /// # Concurrency
    /// Uses global lock to prevent multiple simultaneous downloads.
    pub fn download() -> Result<PathBuf, String> {
        // Acquire lock to prevent concurrent downloads
        let _lock = DOWNLOAD_LOCK.lock().unwrap_or_else(|e| e.into_inner());

        info!("Downloading PresentMon v{} from GitHub...", Self::VERSION);

        let cache_path = Self::get_cache_path()?;

        // Re-check if already downloaded (another thread might have completed while waiting for lock)
        if cache_path.exists() {
            let metadata = fs::metadata(&cache_path).map_err(|e| format!("Failed to get file metadata: {e}"))?;

            if metadata.len() >= Self::EXPECTED_SIZE_MIN {
                info!("PresentMon already cached at: {}", cache_path.display());
                return Ok(cache_path);
            }
            warn!("Cached PresentMon is too small, re-downloading");
            let _ = fs::remove_file(&cache_path);
        }

        // Download from GitHub
        info!("Downloading from: {}", Self::DOWNLOAD_URL);
        info!("This may take 10-30 seconds depending on your connection...");

        // Create client with 60 second timeout
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

        let response = client
            .get(Self::DOWNLOAD_URL)
            .send()
            .map_err(|e| format!("Failed to download PresentMon: {e}"))?;

        if !response.status().is_success() {
            let status = response.status();
            return Err(format!("Download failed with status: {status}"));
        }

        info!("Download successful, reading response bytes...");

        let bytes = response
            .bytes()
            .map_err(|e| format!("Failed to read download bytes: {e}"))?;

        info!("Downloaded {} bytes", bytes.len());

        // Validate file size
        if bytes.len() < Self::EXPECTED_SIZE_MIN as usize {
            let err_msg = format!(
                "Downloaded file too small: {} bytes (expected >= {})",
                bytes.len(),
                Self::EXPECTED_SIZE_MIN
            );
            warn!("{}", err_msg);
            return Err(err_msg);
        }

        info!("File size validation passed");

        // Write to cache
        let mut file = fs::File::create(&cache_path).map_err(|e| format!("Failed to create cache file: {e}"))?;

        file.write_all(&bytes)
            .map_err(|e| format!("Failed to write cache file: {e}"))?;

        info!(
            "PresentMon downloaded successfully: {} ({} bytes)",
            cache_path.display(),
            bytes.len()
        );

        Ok(cache_path)
    }

    /// Ensures `PresentMon` is available (download if needed).
    ///
    /// # Returns
    /// Path to PresentMon64.exe (guaranteed to exist)
    ///
    /// # Errors
    /// Returns error if cannot find bundled, cached, or download fails.
    pub fn ensure_available() -> Result<PathBuf, String> {
        // Try to get existing path
        match Self::get_presentmon_path() {
            Ok(path) if path.exists() => {
                info!("PresentMon available at: {}", path.display());
                Ok(path)
            },
            _ => {
                // Need to download
                warn!("PresentMon not found, downloading...");
                Self::download()
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_cache_path() {
        let path = PresentMonDownloader::get_cache_path();
        assert!(path.is_ok());

        let path = path.unwrap();
        assert!(path.ends_with("Balam\\PresentMon64.exe"));
    }

    #[test]
    fn test_version_constant() {
        assert!(!PresentMonDownloader::VERSION.is_empty());
        assert!(PresentMonDownloader::DOWNLOAD_URL.contains("PresentMon"));
    }
}
