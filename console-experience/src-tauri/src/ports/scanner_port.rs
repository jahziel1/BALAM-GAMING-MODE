use crate::domain::entities::Game;
use crate::domain::errors::ScanError;
use crate::domain::value_objects::GameSource;

/// Port trait for game scanners.
///
/// Implementations discover games from different platforms (Steam, Epic, Xbox, etc.).
/// All scanners must be thread-safe (Send + Sync) for concurrent scanning.
///
/// # Priority System
/// Scanners are executed in priority order (lower number = higher priority).
/// This ensures metadata-rich sources (Steam) are scanned before fallback
/// sources (Registry), improving deduplication accuracy.
///
/// # Error Handling
/// Scanners should be fault-tolerant. Individual scanner failures should not
/// block discovery from other sources. Use `GameDiscoveryService` to orchestrate
/// multiple scanners with automatic error recovery.
///
/// # Thread Safety
/// All scanners must be `Send + Sync` to allow concurrent scanning via `tokio::spawn`.
///
/// # Examples
/// ```rust
/// use console_experience::ports::GameScanner;
/// use console_experience::adapters::steam_scanner::SteamScanner;
///
/// let scanner = SteamScanner::new();
/// match scanner.scan() {
///     `Ok`(games) => println!("Found {} Steam games", games.len()),
///     `Err`(e) => eprintln!("Steam scan failed: {}", e),
/// }
/// ```
pub trait GameScanner: Send + Sync {
    /// Scans for games from this source.
    ///
    /// # Returns
    /// * `Ok(Vec<Game>)` - List of discovered games
    /// * `Err(ScanError)` - If scanning fails
    ///
    /// # Errors
    /// - `ScanError::IoError` - Filesystem access failed (permissions, path not found)
    /// - `ScanError::ParseError` - Manifest/config file parsing failed
    /// - `ScanError::PlatformError` - Platform-specific error (Registry access, etc.)
    ///
    /// # Performance
    /// Scanners should complete within 5 seconds for typical libraries (<500 games).
    /// Use lazy parsing and avoid expensive I/O operations.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::GameScanner;
    /// # use console_experience::adapters::steam_scanner::SteamScanner;
    /// let scanner = SteamScanner::new();
    /// let games = scanner.scan()?;
    /// for game in games {
    ///     println!("{} ({})", game.title, game.path);
    /// }
    /// # Ok::<(), console_experience::domain::errors::ScanError>(())
    /// ```
    fn scan(&self) -> Result<Vec<Game>, ScanError>;

    /// Returns the source platform this scanner handles.
    ///
    /// Used for game identification and deduplication.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::GameScanner;
    /// # use console_experience::adapters::steam_scanner::SteamScanner;
    /// # use console_experience::domain::value_objects::GameSource;
    /// let scanner = SteamScanner::new();
    /// assert_eq!(scanner.source(), GameSource::Steam);
    /// ```
    fn source(&self) -> GameSource;

    /// Returns the priority for this scanner (lower = scanned first).
    ///
    /// Used to prioritize metadata-rich sources. Default priorities:
    /// - **Steam: 1** (highest - rich metadata, cover art, icons)
    /// - **Epic: 2** (good metadata, JSON manifests)
    /// - **Xbox: 3** (UWP registry, limited metadata)
    /// - **Manual/Registry: 4** (lowest - fallback, no metadata)
    ///
    /// # Priority Impact
    /// When multiple scanners detect the same game, the scanner with the
    /// **lowest priority number** wins. This ensures Steam metadata is
    /// preferred over generic Registry entries.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::GameScanner;
    /// # use console_experience::adapters::steam_scanner::SteamScanner;
    /// # use console_experience::adapters::registry_scanner::RegistryScanner;
    /// let steam = SteamScanner::new();
    /// let registry = RegistryScanner::new();
    /// assert!(steam.priority() < registry.priority()); // Steam scanned first
    /// ```
    fn priority(&self) -> u32 {
        match self.source() {
            GameSource::Steam => 1, // Highest priority - best metadata
            GameSource::Epic => 2,
            GameSource::Xbox => 3,
            GameSource::BattleNet => 4,
            GameSource::Manual => 5, // Lowest priority
        }
    }
}
