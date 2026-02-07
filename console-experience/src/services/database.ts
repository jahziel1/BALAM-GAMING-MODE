/**
 * Database Service
 *
 * Provides TypeScript interface for SQLite operations using tauri-plugin-sql.
 * Handles game metadata caching and app settings persistence.
 */

import Database from '@tauri-apps/plugin-sql';

// Database instance (singleton)
let db: Database | null = null;

/**
 * Initialize database connection
 * Creates/opens the SQLite database and runs migrations
 */
export async function initDatabase(): Promise<void> {
  if (db) return; // Already initialized

  try {
    db = await Database.load('sqlite:balam.db');
    console.log('✅ SQLite database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get database instance (ensures initialized)
 */
async function getDb(): Promise<Database> {
  if (!db) {
    await initDatabase();
  }
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// ============================================================================
// GAME CACHE OPERATIONS
// ============================================================================

export interface CachedGame {
  id: number;
  title: string;
  path: string;
  exe_name: string;
  icon_path: string | null;
  install_location: string | null;
  launcher_type: string | null;
  app_id: string | null;
  last_played: number | null;
  play_time_seconds: number;
  is_favorite: number;
  is_hidden: number;
  created_at: number;
  updated_at: number;
}

/**
 * Get all cached games
 */
export async function getAllGames(): Promise<CachedGame[]> {
  const database = await getDb();
  return await database.select<CachedGame[]>(
    'SELECT * FROM games WHERE is_hidden = 0 ORDER BY last_played DESC NULLS LAST'
  );
}

/**
 * Get game by path
 */
export async function getGameByPath(path: string): Promise<CachedGame | null> {
  const database = await getDb();
  const results = await database.select<CachedGame[]>(
    'SELECT * FROM games WHERE path = $1 LIMIT 1',
    [path]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Upsert game (insert or update if exists)
 */
export async function upsertGame(
  game: Omit<CachedGame, 'id' | 'created_at' | 'updated_at'>
): Promise<void> {
  const database = await getDb();

  await database.execute(
    `INSERT INTO games (
      title, path, exe_name, icon_path, install_location, launcher_type, app_id,
      last_played, play_time_seconds, is_favorite, is_hidden
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT(path) DO UPDATE SET
      title = excluded.title,
      exe_name = excluded.exe_name,
      icon_path = excluded.icon_path,
      install_location = excluded.install_location,
      launcher_type = excluded.launcher_type,
      app_id = excluded.app_id,
      last_played = excluded.last_played,
      play_time_seconds = excluded.play_time_seconds,
      is_favorite = excluded.is_favorite,
      is_hidden = excluded.is_hidden`,
    [
      game.title,
      game.path,
      game.exe_name,
      game.icon_path,
      game.install_location,
      game.launcher_type,
      game.app_id,
      game.last_played,
      game.play_time_seconds,
      game.is_favorite,
      game.is_hidden,
    ]
  );
}

/**
 * Update game last played timestamp
 */
export async function updateLastPlayed(path: string): Promise<void> {
  const database = await getDb();
  const now = Math.floor(Date.now() / 1000); // Unix timestamp

  await database.execute('UPDATE games SET last_played = $1 WHERE path = $2', [now, path]);
}

/**
 * Update game play time
 */
export async function addPlayTime(path: string, secondsPlayed: number): Promise<void> {
  const database = await getDb();

  await database.execute(
    'UPDATE games SET play_time_seconds = play_time_seconds + $1 WHERE path = $2',
    [secondsPlayed, path]
  );
}

/**
 * Toggle game favorite status
 */
export async function toggleFavorite(path: string): Promise<void> {
  const database = await getDb();

  await database.execute('UPDATE games SET is_favorite = NOT is_favorite WHERE path = $1', [path]);
}

/**
 * Get all favorite games
 */
export async function getFavoriteGames(): Promise<CachedGame[]> {
  const database = await getDb();
  return await database.select<CachedGame[]>(
    'SELECT * FROM games WHERE is_favorite = 1 ORDER BY title ASC'
  );
}

/**
 * Get recently played games (last 20)
 */
export async function getRecentlyPlayedGames(limit = 20): Promise<CachedGame[]> {
  const database = await getDb();
  return await database.select<CachedGame[]>(
    'SELECT * FROM games WHERE last_played IS NOT NULL ORDER BY last_played DESC LIMIT $1',
    [limit]
  );
}

/**
 * Delete game from cache
 */
export async function deleteGame(path: string): Promise<void> {
  const database = await getDb();

  await database.execute('DELETE FROM games WHERE path = $1', [path]);
}

/**
 * Clear all games from cache
 */
export async function clearGamesCache(): Promise<void> {
  const database = await getDb();
  await database.execute('DELETE FROM games');
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

/**
 * Get setting value by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const database = await getDb();
  const results = await database.select<{ value: string }[]>(
    'SELECT value FROM settings WHERE key = $1 LIMIT 1',
    [key]
  );
  return results.length > 0 ? results[0].value : null;
}

/**
 * Set setting value (upsert)
 */
export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDb();

  await database.execute(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

/**
 * Delete setting
 */
export async function deleteSetting(key: string): Promise<void> {
  const database = await getDb();
  await database.execute('DELETE FROM settings WHERE key = $1', [key]);
}

// ============================================================================
// SCAN HISTORY OPERATIONS
// ============================================================================

export interface ScanHistory {
  id: number;
  scan_type: string;
  games_found: number;
  duration_ms: number;
  scanned_at: number;
}

/**
 * Record a scan in history
 */
export async function recordScan(
  scanType: string,
  gamesFound: number,
  durationMs: number
): Promise<void> {
  const database = await getDb();

  await database.execute(
    'INSERT INTO scan_history (scan_type, games_found, duration_ms) VALUES ($1, $2, $3)',
    [scanType, gamesFound, durationMs]
  );
}

/**
 * Get recent scan history (last 10 scans)
 */
export async function getRecentScans(): Promise<ScanHistory[]> {
  const database = await getDb();
  return await database.select<ScanHistory[]>(
    'SELECT * FROM scan_history ORDER BY scanned_at DESC LIMIT 10'
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get database statistics (for debugging)
 */
export async function getDatabaseStats(): Promise<{
  totalGames: number;
  favorites: number;
  totalPlayTime: number;
}> {
  const database = await getDb();

  const [stats] = await database.select<
    { totalGames: number; favorites: number; totalPlayTime: number }[]
  >(
    `SELECT
      COUNT(*) as totalGames,
      SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) as favorites,
      SUM(play_time_seconds) as totalPlayTime
    FROM games`
  );

  return stats;
}

/**
 * Close database connection (call on app shutdown)
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed');
  }
}
