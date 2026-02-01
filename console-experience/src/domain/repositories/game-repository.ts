/**
 * Port: Game Repository
 *
 * Interface for game-related operations.
 * Implementations can use Tauri IPC or mock data for testing.
 *
 * @module domain/repositories/game-repository
 */

import type { ActiveGame, Game } from '../entities/game';

/**
 * Repository interface for game operations
 */
export interface GameRepository {
  /**
   * Get all available games from all sources
   * @returns Promise resolving to array of games
   */
  getAll(): Promise<Game[]>;

  /**
   * Launch a game by ID
   * @param gameId - Unique game identifier
   * @returns Promise resolving to active game info
   */
  launch(gameId: string): Promise<ActiveGame>;

  /**
   * Kill a running game by process ID
   * @param pid - Process ID to terminate
   * @returns Promise resolving when game is terminated
   */
  kill(pid: number): Promise<void>;

  /**
   * Add a manual game entry
   * @param title - Game title
   * @param exePath - Path to executable
   * @returns Promise resolving to created game
   */
  addManual(title: string, exePath: string): Promise<Game>;

  /**
   * Remove a game by ID
   * @param gameId - Unique game identifier
   * @returns Promise resolving when game is removed
   */
  remove(gameId: string): Promise<void>;
}
