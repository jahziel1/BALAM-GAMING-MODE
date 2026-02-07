-- Initial schema for Balam Console Experience
-- SQLite cache for game metadata and settings

-- Games table: Caches scanned game metadata
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    exe_name TEXT NOT NULL,
    icon_path TEXT,
    install_location TEXT,
    launcher_type TEXT, -- e.g., 'steam', 'epic', 'gog', 'manual'
    app_id TEXT, -- Steam AppID, Epic ID, etc.
    last_played INTEGER, -- Unix timestamp
    play_time_seconds INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0, -- SQLite boolean (0 or 1)
    is_hidden INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index for fast lookups by path
CREATE INDEX IF NOT EXISTS idx_games_path ON games(path);

-- Index for filtering by launcher type
CREATE INDEX IF NOT EXISTS idx_games_launcher ON games(launcher_type);

-- Index for sorting by last played
CREATE INDEX IF NOT EXISTS idx_games_last_played ON games(last_played DESC);

-- Index for favorites
CREATE INDEX IF NOT EXISTS idx_games_favorite ON games(is_favorite) WHERE is_favorite = 1;

-- Settings table: Key-value store for app configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Scan history table: Tracks filesystem scan performance
CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_type TEXT NOT NULL, -- 'steam', 'epic', 'gog', 'manual', 'full'
    games_found INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    scanned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index for scan history queries
CREATE INDEX IF NOT EXISTS idx_scan_history_type ON scan_history(scan_type, scanned_at DESC);

-- Trigger to update updated_at on games table
CREATE TRIGGER IF NOT EXISTS update_games_timestamp
AFTER UPDATE ON games
FOR EACH ROW
BEGIN
    UPDATE games SET updated_at = strftime('%s', 'now') WHERE id = OLD.id;
END;

-- Trigger to update updated_at on settings table
CREATE TRIGGER IF NOT EXISTS update_settings_timestamp
AFTER UPDATE ON settings
FOR EACH ROW
BEGIN
    UPDATE settings SET updated_at = strftime('%s', 'now') WHERE key = OLD.key;
END;
