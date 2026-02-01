/**
 * Store Provider
 *
 * Initializes Zustand stores with Tauri repositories.
 * Provides stores to entire app via context.
 * Sets up event listeners for Tauri backend events.
 */

import { listen } from '@tauri-apps/api/event';
import { createContext, ReactNode, useContext, useEffect } from 'react';

import type { GameLaunchError } from '../../domain';
import { getFailureDescription } from '../../domain';
import { TauriGameRepository, TauriSystemRepository } from '../../infrastructure/repositories';
import { toast } from '../../utils/toast';
import { createGameStore, type GameStore } from '../stores/game-store';
import { createSystemStore, type SystemStore } from '../stores/system-store';

/**
 * Store context type
 */
interface StoreContextType {
  gameStore: GameStore;
  systemStore: SystemStore;
}

const StoreContext = createContext<StoreContextType | null>(null);

/**
 * Initialize stores with Tauri repositories
 */
const gameRepository = new TauriGameRepository();
const systemRepository = new TauriSystemRepository();

const gameStore = createGameStore(gameRepository);
const systemStore = createSystemStore(systemRepository);

/**
 * Provider component with event listeners
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  // Setup event listener for game launch failures
  useEffect(() => {
    const setupListeners = async () => {
      // Listener 1: Game launch failures
      const unlistenLaunchFailed = await listen<GameLaunchError>('game-launch-failed', (event) => {
        const error = event.payload;

        console.error('Game launch failed:', error);

        // Show error toast with description and first suggested action
        const description = getFailureDescription(error.reason);
        const suggestion = error.suggested_actions[0] || 'Intenta de nuevo más tarde';

        toast.gameError(error.game_title, `${description}\n\n💡 ${suggestion}`);

        // Clear launching state in store
        gameStore.setState({ isLaunching: false, activeRunningGame: null });
      });

      // Listener 2: Launcher process started (WMI Process Monitor)
      const unlistenProcessStarted = await listen<string>('launcher-process-started', (event) => {
        const launcher = event.payload;
        // Silent monitoring - no user notification needed
        void launcher;
      });

      // Listener 3: Launcher process stopped normally (WMI Process Monitor)
      const unlistenProcessStopped = await listen<string>('launcher-process-stopped', (event) => {
        const launcher = event.payload;
        // Silent monitoring - no user notification needed
        void launcher;
      });

      // Listener 4: Launcher quick exit detected (WMI Process Monitor)
      const unlistenQuickExit = await listen<string>('launcher-quick-exit', (event) => {
        const launcher = event.payload;
        console.warn(`[WMI] ${launcher} quick exit detected (<3s) - likely error`);

        // User might have cancelled or launcher had error
        const state = gameStore.getState();
        if (state.isLaunching && !state.activeRunningGame) {
          console.warn('Quick exit detected but game not running - launcher error');

          // Show warning
          toast.error(
            `${launcher} se cerró inesperadamente. Verifica que el juego no esté corriendo en otro lugar.`
          );

          // Clear launching state after short delay
          setTimeout(() => {
            const currentState = gameStore.getState();
            if (currentState.isLaunching && !currentState.activeRunningGame) {
              gameStore.setState({ isLaunching: false });
            }
          }, 2000);
        }
      });

      return () => {
        void unlistenLaunchFailed();
        void unlistenProcessStarted();
        void unlistenProcessStopped();
        void unlistenQuickExit();
      };
    };

    const cleanup = setupListeners();

    return () => {
      void cleanup.then((fn) => fn());
    };
  }, []);

  return (
    <StoreContext.Provider value={{ gameStore, systemStore }}>{children}</StoreContext.Provider>
  );
}

/**
 * Hook to access game store
 */
export function useGameStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useGameStore must be used within StoreProvider');
  }
  return context.gameStore();
}

/**
 * Hook to access system store
 */
export function useSystemStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useSystemStore must be used within StoreProvider');
  }
  return context.systemStore();
}
