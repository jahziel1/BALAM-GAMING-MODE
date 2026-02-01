/**
 * Application Store: Game Store
 *
 * Zustand store for game state management using dependency injection.
 * Factory function allows testing with MockGameRepository.
 *
 * @module application/stores/game-store
 */

import * as v from 'valibot';
import { create } from 'zustand';

import type { ActiveGame, Game } from '../../domain/entities/game';
import type { GameRepository } from '../../domain/repositories/game-repository';
import {
  ActiveGameSchema,
  GamesArraySchema,
  GameSchema,
} from '../../domain/validation/game-schemas';
import { toast } from '../../utils/toast';

/**
 * Game store state interface
 */
interface GameStoreState {
  // State
  games: Game[];
  activeRunningGame: ActiveGame | null;
  isLaunching: boolean;
  error: string | null;

  // Actions
  loadGames: () => Promise<void>;
  launchGame: (gameId: string) => Promise<void>;
  killGame: (pid: number) => Promise<void>;
  addManualGame: (title: string, exePath: string) => Promise<void>;
  removeGame: (gameId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Factory function to create game store with injected repository
 *
 * @param repository - Game repository implementation (Tauri or Mock)
 * @returns Zustand store hook
 */
export function createGameStore(repository: GameRepository) {
  return create<GameStoreState>((set) => ({
    // Initial state
    games: [],
    activeRunningGame: null,
    isLaunching: false,
    error: null,

    // Load all games from repository
    loadGames: async () => {
      try {
        set({ error: null });
        const games = await repository.getAll();

        // Validate response
        const validatedGames = v.parse(GamesArraySchema, games);

        set({ games: validatedGames });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load games';
        set({ error: errorMessage });
      }
    },

    // Launch a game by ID
    launchGame: async (gameId: string) => {
      try {
        set({ isLaunching: true, error: null });
        const activeGame = await repository.launch(gameId);

        // Validate response
        const validatedActiveGame = v.parse(ActiveGameSchema, activeGame);

        set({ activeRunningGame: validatedActiveGame, isLaunching: false });
        toast.gameStarted(validatedActiveGame.game.title);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to launch game';
        set({ error: errorMessage, isLaunching: false });
        toast.gameError('Game', errorMessage);
      }
    },

    // Kill running game
    killGame: async (pid: number) => {
      try {
        set({ error: null });
        await repository.kill(pid);
        set({ activeRunningGame: null });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to kill game';
        set({ error: errorMessage });
      }
    },

    // Add manual game
    addManualGame: async (title: string, exePath: string) => {
      try {
        set({ error: null });
        const newGame = await repository.addManual(title, exePath);

        // Validate response
        const validatedGame = v.parse(GameSchema, newGame);

        set((state) => ({ games: [...state.games, validatedGame] }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add game';
        set({ error: errorMessage });
      }
    },

    // Remove game by ID
    removeGame: async (gameId: string) => {
      try {
        set({ error: null });
        await repository.remove(gameId);
        set((state) => ({
          games: state.games.filter((g) => g.id !== gameId),
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove game';
        set({ error: errorMessage });
      }
    },

    // Clear error message
    clearError: () => {
      set({ error: null });
    },
  }));
}

/**
 * Type for the game store hook
 */
export type GameStore = ReturnType<typeof createGameStore>;
