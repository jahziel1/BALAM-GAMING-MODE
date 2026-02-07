/**
 * Game Slice
 *
 * Zustand slice for game state management using dependency injection.
 * Part of the app-store using the Slices Pattern.
 *
 * ## Architecture
 * - **Pattern**: Zustand Slices + Dependency Injection
 * - **State**: Games list, active running game, launch status
 * - **Actions**: Load, launch, kill, add, remove games
 *
 * @module stores/slices/game-slice
 */

import * as v from 'valibot';

import type { ActiveGame, Game } from '../../../domain/entities/game';
import type { GameRepository } from '../../../domain/repositories/game-repository';
import {
  ActiveGameSchema,
  GamesArraySchema,
  GameSchema,
} from '../../../domain/validation/game-schemas';
import { toast } from '../../../utils/toast';

/**
 * Game slice state
 */
export interface GameSlice {
  game: {
    games: Game[];
    activeRunningGame: ActiveGame | null;
    isLaunching: boolean;
    error: string | null;
  };

  // Actions
  loadGames: () => Promise<void>;
  launchGame: (gameId: string) => Promise<void>;
  clearActiveGame: () => void;
  killGame: (pid: number) => Promise<void>;
  addManualGame: (title: string, exePath: string) => Promise<void>;
  removeGame: (gameId: string) => Promise<void>;
  clearGameError: () => void;
}

/**
 * Create game slice with injected repository
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param repository - Game repository implementation (Tauri or Mock)
 * @returns Game slice state and actions
 */
export const createGameSlice = (
  set: (fn: (state: GameSlice) => Partial<GameSlice>) => void,
  _get: () => GameSlice,
  repository: GameRepository
): GameSlice => ({
  // Initial state
  game: {
    games: [],
    activeRunningGame: null,
    isLaunching: false,
    error: null,
  },

  // Load all games from repository
  loadGames: async () => {
    try {
      set((state) => ({
        game: { ...state.game, error: null },
      }));

      const games = await repository.getAll();

      // Validate response
      const validatedGames = v.parse(GamesArraySchema, games);

      set((state) => ({
        game: { ...state.game, games: validatedGames },
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load games';
      set((state) => ({
        game: { ...state.game, error: errorMessage },
      }));
    }
  },

  // Launch a game by ID
  launchGame: async (gameId: string) => {
    try {
      set((state) => ({
        game: { ...state.game, isLaunching: true, error: null },
      }));

      const activeGame = await repository.launch(gameId);

      // Validate response
      const validatedActiveGame = v.parse(ActiveGameSchema, activeGame);

      set((state) => ({
        game: {
          ...state.game,
          activeRunningGame: validatedActiveGame,
          isLaunching: false,
        },
      }));

      toast.gameStarted(validatedActiveGame.game.title);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to launch game';
      set((state) => ({
        game: { ...state.game, error: errorMessage, isLaunching: false },
      }));
      toast.gameError('Game', errorMessage);
    }
  },

  // Clear active running game (when watchdog detects game ended)
  clearActiveGame: () => {
    set((state) => ({
      game: { ...state.game, activeRunningGame: null },
    }));
  },

  // Kill running game
  killGame: async (pid: number) => {
    try {
      set((state) => ({
        game: { ...state.game, error: null },
      }));

      await repository.kill(pid);

      set((state) => ({
        game: { ...state.game, activeRunningGame: null },
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to kill game';
      set((state) => ({
        game: { ...state.game, error: errorMessage },
      }));
    }
  },

  // Add manual game
  addManualGame: async (title: string, exePath: string) => {
    try {
      set((state) => ({
        game: { ...state.game, error: null },
      }));

      const newGame = await repository.addManual(title, exePath);

      // Validate response
      const validatedGame = v.parse(GameSchema, newGame);

      set((state) => ({
        game: {
          ...state.game,
          games: [...state.game.games, validatedGame],
        },
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add game';
      set((state) => ({
        game: { ...state.game, error: errorMessage },
      }));
    }
  },

  // Remove game by ID
  removeGame: async (gameId: string) => {
    try {
      set((state) => ({
        game: { ...state.game, error: null },
      }));

      await repository.remove(gameId);

      set((state) => ({
        game: {
          ...state.game,
          games: state.game.games.filter((g: Game) => g.id !== gameId),
        },
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove game';
      set((state) => ({
        game: { ...state.game, error: errorMessage },
      }));
    }
  },

  // Clear error message
  clearGameError: () => {
    set((state) => ({
      game: { ...state.game, error: null },
    }));
  },
});
