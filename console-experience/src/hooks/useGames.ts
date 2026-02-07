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

  const loadGames = useCallback(async () => {
    try {
      const g = await invoke<Game[]>('get_games');
      if (g.length) setGames(g);

      // Perform background scan to update cache
      const updated = await invoke<Game[]>('scan_games');
      if (updated.length) setGames(updated);
    } catch (error) {
      console.error('Failed to load games:', error);
    }
  }, []);

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
      } catch (error) {
        console.error('Launch failed:', error);
        await getCurrentWindow().show();
        await getCurrentWindow().setFocus();
        setActiveRunningGame(null);
      } finally {
        setIsLaunching(false);
      }
    },
    [activeRunningGame]
  );

  const killGame = useCallback(async (game: Game) => {
    if (!game) return;

    try {
      await invoke('kill_game', { path: game.path });
      setActiveRunningGame(null);
      const win = getCurrentWindow();
      await win.show();
      await win.setFocus();
    } catch (error) {
      console.error('Failed to kill game:', error);
    }
  }, []);

  const addManualGame = useCallback(async (path: string, title: string) => {
    try {
      const newGame = await invoke<Game>('add_game_manually', { path, title });
      setGames((prev) => [...prev, newGame]);
      return newGame;
    } catch (error) {
      console.error('Failed to add manual game:', error);
      throw error;
    }
  }, []);

  const removeGame = useCallback(async (id: string) => {
    try {
      await invoke('remove_game', { id });
      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch (error) {
      console.error('Failed to remove game:', error);
      throw error;
    }
  }, []);

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
