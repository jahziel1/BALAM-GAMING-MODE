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
import { type AppStoreHook, createAppStore } from '../stores/app-store';

// TypeScript interface for dev-mode window globals
declare global {
  interface Window {
    __STORE__?: AppStoreHook;
  }
}

/**
 * Store context type
 */
interface StoreContextType {
  appStore: AppStoreHook;
}

const StoreContext = createContext<StoreContextType | null>(null);

/**
 * Initialize consolidated app store with Tauri repositories
 * Using Slices Pattern for modular state management
 */
const gameRepository = new TauriGameRepository();
const systemRepository = new TauriSystemRepository();

const appStore = createAppStore(gameRepository, systemRepository);

if (import.meta.env.DEV) {
  window.__STORE__ = appStore;
}

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
        appStore.setState((state) => ({
          game: { ...state.game, isLaunching: false, activeRunningGame: null },
        }));
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
        const state = appStore.getState();
        if (state.game.isLaunching && !state.game.activeRunningGame) {
          console.warn('Quick exit detected but game not running - launcher error');

          // Show warning
          toast.error(
            `${launcher} se cerró inesperadamente. Verifica que el juego no esté corriendo en otro lugar.`
          );

          // Clear launching state after short delay
          setTimeout(() => {
            const currentState = appStore.getState();
            if (currentState.game.isLaunching && !currentState.game.activeRunningGame) {
              appStore.setState((state) => ({
                game: { ...state.game, isLaunching: false },
              }));
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

  return <StoreContext.Provider value={{ appStore }}>{children}</StoreContext.Provider>;
}

/**
 * Hook to access app store
 * Provides access to all slices: overlay, game, performance, system
 *
 * @example
 * ```tsx
 * const { overlay, game, showOverlay, launchGame } = useAppStore();
 * ```
 */
export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within StoreProvider');
  }
  return context.appStore();
}

/**
 * Hook to access game slice (backward compatibility)
 * @deprecated Use useAppStore() instead and access game slice directly
 */
export function useGameStore() {
  const store = useAppStore();
  return {
    games: store.game.games,
    activeRunningGame: store.game.activeRunningGame,
    isLaunching: store.game.isLaunching,
    error: store.game.error,
    loadGames: store.loadGames,
    launchGame: store.launchGame,
    clearActiveGame: store.clearActiveGame,
    killGame: store.killGame,
    addManualGame: store.addManualGame,
    removeGame: store.removeGame,
    clearError: store.clearGameError,
  };
}

/**
 * Hook to access system slice (backward compatibility)
 * @deprecated Use useAppStore() instead and access system slice directly
 */
export function useSystemStore() {
  const store = useAppStore();
  return {
    status: store.system.status,
    error: store.system.error,
    refreshStatus: store.refreshSystemStatus,
    clearError: store.clearSystemError,
  };
}
