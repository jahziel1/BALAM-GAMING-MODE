/**
 * Domain Entity: Game
 *
 * Pure domain entity with no framework dependencies.
 * Represents a game that can be launched and managed by the console experience.
 *
 * @module domain/entities/game
 */

/**
 * Game source platform
 */
export type GameSource = 'Steam' | 'Epic' | 'Xbox' | 'BattleNet' | 'Manual';

/**
 * Game entity representing a playable game
 */
export interface Game {
  /** Unique identifier (e.g., "steam_12345") */
  id: string;
  /** Raw platform ID */
  raw_id: string;
  /** Display title */
  title: string;
  /** Executable path */
  path: string;
  /** Source platform */
  source: GameSource;
  /** Cover image path (optional) */
  image: string | null;
  /** Hero/background image path (optional) */
  hero_image: string | null;
  /** Logo image path (optional) */
  logo: string | null;
  /** Last played timestamp (Unix epoch, optional) */
  last_played: number | null;
  /** Favorite flag (SQLite boolean: 0 or 1) */
  is_favorite?: number;
  /** Total play time in seconds */
  play_time_seconds?: number;
}

/**
 * Active running game state
 */
export interface ActiveGame {
  /** Game that is currently running */
  game: Game;
  /** Process ID of the running game */
  pid: number;
}
