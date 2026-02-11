import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useState } from 'react';

import { useGameStore } from '../application/providers/StoreProvider';
import { ActiveGame, Game } from '../domain/entities/game';
import { useAudio } from './useAudio';
import { useHaptic } from './useHaptic';

interface UseGameLauncherProps {
  games: Game[]; // Should be the filtered list of games
  activeRunningGame: ActiveGame | null;
  setInGameMenuOpen: (open: boolean) => void;
}

/**
 * Hook to manage game launching logic
 * - Handles immediate launch or confirmation (if switching games)
 * - Manages launch confirmation state
 * - Provides haptic & audio feedback on launch
 * - Hides window on launch
 */
export function useGameLauncher({
  games,
  activeRunningGame,
  setInGameMenuOpen,
}: UseGameLauncherProps) {
  const { launchGame } = useGameStore(); // launchGame accepts ID (string)
  const { hapticEvent } = useHaptic();
  const { audioLaunch } = useAudio();
  const [pendingLaunchIndex, setPendingLaunchIndex] = useState<number | null>(null);

  /**
   * Pending launch game object, derived from index and games list
   * Safe access in case index is out of bounds (though UI shouldn't allow it)
   */
  const pendingLaunchGame =
    pendingLaunchIndex !== null && games[pendingLaunchIndex] ? games[pendingLaunchIndex] : null;

  const handleLaunch = useCallback(
    (index: number) => {
      const gameToLaunch = games[index];
      if (!gameToLaunch) return;

      // If clicking on currently running game, resume instead
      if (activeRunningGame && String(activeRunningGame.game.id) === String(gameToLaunch.id)) {
        console.warn('Launch requested for running game -> Resuming instead.');
        setInGameMenuOpen(false);
        void getCurrentWindow().hide();
        return;
      }

      // If switching games, ask for confirmation
      if (activeRunningGame && activeRunningGame.game.id !== gameToLaunch.id) {
        setPendingLaunchIndex(index);
        return;
      }

      // Otherwise launch immediately
      void launchGame(gameToLaunch.id);
      void hapticEvent();
      audioLaunch();
      void getCurrentWindow().hide();
    },
    [games, activeRunningGame, launchGame, setInGameMenuOpen, hapticEvent, audioLaunch]
  );

  const confirmLaunch = useCallback(() => {
    if (pendingLaunchGame) {
      void launchGame(pendingLaunchGame.id);
      void hapticEvent();
      audioLaunch();
      void getCurrentWindow().hide();
      setPendingLaunchIndex(null);
    }
  }, [launchGame, pendingLaunchGame, hapticEvent, audioLaunch]);

  const cancelLaunch = useCallback(() => {
    setPendingLaunchIndex(null);
  }, []);

  return {
    handleLaunch,
    confirmLaunch,
    cancelLaunch,
    pendingLaunchGame,
  };
}
