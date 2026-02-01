/**
 * Infrastructure: Tauri Game Repository
 *
 * Implementation of GameRepository using Tauri IPC.
 * Communicates with Rust backend via invoke().
 *
 * @module infrastructure/repositories/tauri-game-repository
 */

import { invoke } from '@tauri-apps/api/core';

import type { ActiveGame, Game } from '../../domain/entities/game';
import type { GameRepository } from '../../domain/repositories/game-repository';

/**
 * Tauri IPC implementation of GameRepository
 *
 * Updated to match new backend signatures:
 * - launch_game: Only requires gameId (backend looks up path)
 * - kill_game: Requires pid (backend uses hybrid kill strategy)
 */
export class TauriGameRepository implements GameRepository {
  async getAll(): Promise<Game[]> {
    return invoke<Game[]>('get_games');
  }

  async launch(gameId: string): Promise<ActiveGame> {
    // Backend now only needs gameId (looks up game internally)
    return invoke<ActiveGame>('launch_game', { gameId });
  }

  async kill(pid: number): Promise<void> {
    // Backend now expects pid parameter (uses hybrid kill strategy)
    await invoke('kill_game', { pid });
  }

  async addManual(title: string, exePath: string): Promise<Game> {
    return invoke<Game>('add_manual_game', { title, exePath });
  }

  async remove(gameId: string): Promise<void> {
    await invoke('remove_game', { gameId });
  }
}
