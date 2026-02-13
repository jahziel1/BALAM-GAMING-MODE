/**
 * @module hooks/useGames
 *
 * Hook for managing game library state and operations.
 * Provides functions for loading, launching, killing, and managing games.
 */

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useEffect, useState } from 'react';

import { Game } from '../domain/entities/game';
import { useToast } from './useToast';

/**
 * Custom hook for game management
 *
 * Manages the complete lifecycle of games including:
 * - Loading games from backend
 * - Launching and killing games
 * - Adding/removing manual games
 * - Tracking active running game
 *
 * @returns Game management state and functions
 *
 * @example
 * ```tsx
 * function GameLibrary() {
 *   const { games, launchGame, isLaunching } = useGames();
 *
 *   return (
 *     <div>
 *       {games.map(game => (
 *         <button onClick={() => launchGame(game)}>
 *           {game.title}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [activeRunningGame, setActiveRunningGame] = useState<Game | null>(null);

  // Toast notifications
  const { success, error: showErrorToast } = useToast();

  const loadGames = useCallback(async () => {
    try {
      const g = await invoke<Game[]>('get_games');
      if (g.length) setGames(g);

      // Perform background scan to update cache
      const updated = await invoke<Game[]>('scan_games');
      if (updated.length) setGames(updated);
    } catch (error) {
      console.error('Failed to load games:', error);
      showErrorToast(
        'Failed to load game library',
        'Check if game directories are accessible and try restarting the app'
      );
    }
  }, [showErrorToast]);

  const launchGame = useCallback(
    async (game: Game) => {
      if (!game || game.id === 'empty') return;

      try {
        // AUTO-SWITCH PROTOCOL:
        // If another game is already running, kill it first to prevent conflicts.
        if (activeRunningGame && activeRunningGame.id !== game.id) {
          // eslint-disable-next-line no-console
          console.log(`Switching games: Killing ${activeRunningGame.title} first...`);
          try {
            await invoke('kill_game', { path: activeRunningGame.path });
          } catch (e) {
            console.warn('Failed to auto-kill previous game, proceeding anyway...', e);
          }
        }

        setActiveRunningGame(game);
        setIsLaunching(true);
        await getCurrentWindow().hide();

        await invoke('launch_game', { id: game.id, path: game.path });
        success(`Launching ${game.title}`, 'Game started successfully');
      } catch (error) {
        console.error('Launch failed:', error);

        // User-friendly error messages
        const baseErrorMsg = `Failed to launch ${game.title}`;
        let hint = 'The game executable may be missing or corrupted';

        const errorStr = error instanceof Error ? error.message : String(error);
        if (errorStr.includes('not found') || errorStr.includes('does not exist')) {
          hint = 'The game file was not found. Try reinstalling the game';
        } else if (errorStr.includes('permission') || errorStr.includes('access denied')) {
          hint = 'Permission denied. Try running as administrator';
        } else if (errorStr.includes('already running')) {
          hint = 'The game is already running. Close it first';
        }

        showErrorToast(baseErrorMsg, hint);
        await getCurrentWindow().show();
        await getCurrentWindow().setFocus();
        setActiveRunningGame(null);
      } finally {
        setIsLaunching(false);
      }
    },
    [activeRunningGame, success, showErrorToast]
  );

  const killGame = useCallback(
    async (game: Game) => {
      if (!game) return;

      try {
        await invoke('kill_game', { path: game.path });
        setActiveRunningGame(null);
        const win = getCurrentWindow();
        await win.show();
        await win.setFocus();
        success(`Closed ${game.title}`, 'Game closed successfully');
      } catch (error) {
        console.error('Failed to kill game:', error);
        showErrorToast(
          `Failed to close ${game.title}`,
          'The game process may have already exited or require force termination'
        );
      }
    },
    [success, showErrorToast]
  );

  const addManualGame = useCallback(
    async (path: string, title: string) => {
      try {
        const newGame = await invoke<Game>('add_game_manually', { path, title });
        setGames((prev) => [...prev, newGame]);
        success(`Added ${title}`, 'Game added to your library');
        return newGame;
      } catch (error) {
        console.error('Failed to add manual game:', error);

        const errorMsg = 'Failed to add game to library';
        let hint = 'Make sure the file path is valid and the file exists';

        const errorStr = error instanceof Error ? error.message : String(error);
        if (errorStr.includes('not found') || errorStr.includes('does not exist')) {
          hint = 'The selected file does not exist. Check the file path';
        } else if (errorStr.includes('invalid') || errorStr.includes('not executable')) {
          hint = 'The file is not a valid game executable';
        } else if (errorStr.includes('already exists') || errorStr.includes('duplicate')) {
          hint = 'This game is already in your library';
        }

        showErrorToast(errorMsg, hint);
        throw error;
      }
    },
    [success, showErrorToast]
  );

  const removeGame = useCallback(
    async (id: string) => {
      try {
        await invoke('remove_game', { id });
        setGames((prev) => prev.filter((g) => g.id !== id));
        success('Game removed', 'Game removed from your library');
      } catch (error) {
        console.error('Failed to remove game:', error);
        showErrorToast(
          'Failed to remove game',
          'The game may be currently running or the database is locked'
        );
        throw error;
      }
    },
    [success, showErrorToast]
  );

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  return {
    games,
    isLaunching,
    activeRunningGame,
    setActiveRunningGame,
    launchGame,
    killGame,
    addManualGame,
    removeGame,
    refreshGames: loadGames,
  };
};
