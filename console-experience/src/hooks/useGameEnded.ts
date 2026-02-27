import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect } from 'react';

import type { Game } from '../domain/entities/game';
import { addPlayTime } from '../services/database';
import { useToast } from './useToast';

interface UseGameEndedOptions {
  games: Game[];
  isOverlayWindow: boolean;
  clearActiveGame: () => void;
  loadGames: () => Promise<void>;
}

/**
 * Listens for the game-ended Tauri event and handles:
 * - Play time persistence in the database
 * - Clearing active game state
 * - Window routing: hides overlay and restores main window, or shows main window directly
 */
export function useGameEnded({
  games,
  isOverlayWindow,
  clearActiveGame,
  loadGames,
}: UseGameEndedOptions) {
  const { error: showErrorToast } = useToast();

  useEffect(() => {
    const unlisten = listen<{ game_id: string; play_time_seconds: number }>(
      'game-ended',
      (event) => {
        void (async () => {
          const { game_id, play_time_seconds } = event.payload;
          console.warn(
            `Game ended: ${game_id} (played ${play_time_seconds}s = ${(play_time_seconds / 60).toFixed(1)}min)`
          );

          const game = games.find((g) => g.id === game_id);
          if (game && play_time_seconds > 0) {
            try {
              await addPlayTime(game.path, play_time_seconds);
              console.warn(`Play time updated: +${play_time_seconds}s for ${game.title}`);
              await loadGames();
            } catch {
              showErrorToast(
                'Failed to update play time',
                'Your play session may not have been saved'
              );
            }
          }

          clearActiveGame();
          if (isOverlayWindow) {
            void invoke('hide_game_overlay');
            void invoke('show_main_window');
          } else {
            void getCurrentWindow().show();
          }
        })();
      }
    );

    return () => {
      void unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearActiveGame, games, loadGames]);
}
