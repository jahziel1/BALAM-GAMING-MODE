import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect } from 'react';

import { useGameStore } from '../application/providers/StoreProvider';
import { addPlayTime, initDatabase, toggleFavorite } from '../services/database';

/**
 * Hook to manage game data synchronization
 * - Initializes database
 * - Loads games
 * - Listens for game-ended events to update playtime
 * - Handles favorite toggling
 */
export function useGameDataSync() {
  const { games, loadGames, clearActiveGame } = useGameStore();

  // Initialize database on mount
  useEffect(() => {
    void initDatabase().catch((error) => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  // Load games on mount
  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  // Listen for game-ended events from backend
  useEffect(() => {
    const unlisten = listen<{ game_id: string; play_time_seconds: number }>(
      'game-ended',
      (event) => {
        void (async () => {
          const { game_id, play_time_seconds } = event.payload;
          console.warn(
            `🎮 Game ended: ${game_id} (played ${play_time_seconds}s = ${(play_time_seconds / 60).toFixed(1)}min)`
          );

          // Find the game in the current games list to get the path
          const game = games.find((g) => g.id === game_id);

          if (game && play_time_seconds > 0) {
            try {
              // Update play time in database
              await addPlayTime(game.path, play_time_seconds);
              console.warn(`✅ Play time updated: +${play_time_seconds}s for ${game.title}`);

              // Reload games to reflect updated stats
              await loadGames();
            } catch (error) {
              console.error('Failed to update play time:', error);
            }
          }

          clearActiveGame();
        })();
      }
    );

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [clearActiveGame, games, loadGames]);

  const handleToggleFavorite = useCallback(
    async (gameId: string) => {
      const game = games.find((g) => g.id === gameId);
      if (!game) return;

      try {
        // Toggle favorite in database
        await toggleFavorite(game.path);
        // Reload games to reflect the change
        await loadGames();
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      }
    },
    [games, loadGames]
  );

  return {
    handleToggleFavorite,
  };
}
