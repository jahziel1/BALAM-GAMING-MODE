/**
 * Infrastructure: Mock Game Repository
 *
 * Mock implementation for testing without Tauri runtime.
 * Provides deterministic test data.
 *
 * @module infrastructure/repositories/mock-game-repository
 */

import type { ActiveGame, Game } from '../../domain/entities/game';
import type { GameRepository } from '../../domain/repositories/game-repository';

/**
 * Mock implementation of GameRepository for testing
 */
export class MockGameRepository implements GameRepository {
  private games: Game[] = [];
  private activeGame: ActiveGame | null = null;
  private nextPid = 1000;
  private nextManualId = 1;

  constructor(initialGames: Game[] = []) {
    this.games = [...initialGames];
  }

  async getAll(): Promise<Game[]> {
    return Promise.resolve([...this.games]);
  }

  async launch(gameId: string): Promise<ActiveGame> {
    const game = this.games.find((g) => g.id === gameId);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    this.activeGame = {
      game,
      pid: this.nextPid++,
    };

    return Promise.resolve(this.activeGame);
  }

  async kill(pid: number): Promise<void> {
    if (this.activeGame?.pid === pid) {
      this.activeGame = null;
    }
    return Promise.resolve();
  }

  async addManual(title: string, exePath: string): Promise<Game> {
    const newGame: Game = {
      id: `manual_${this.nextManualId}`,
      raw_id: String(this.nextManualId),
      title,
      path: exePath,
      source: 'Manual',
      image: null,
      hero_image: null,
      logo: null,
      last_played: null,
    };

    this.nextManualId++;
    this.games.push(newGame);
    return Promise.resolve(newGame);
  }

  async remove(gameId: string): Promise<void> {
    this.games = this.games.filter((g) => g.id !== gameId);
    return Promise.resolve();
  }

  /**
   * Test helper: Get current active game
   */
  getActiveGame(): ActiveGame | null {
    return this.activeGame;
  }

  /**
   * Test helper: Reset repository state
   */
  reset(games: Game[] = []): void {
    this.games = [...games];
    this.activeGame = null;
    this.nextPid = 1000;
    this.nextManualId = 1;
  }
}
