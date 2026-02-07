/**
 * Application Store (Consolidated)
 *
 * Main Zustand store using the Slices Pattern.
 * Consolidates all application state in a single store with modular slices.
 *
 * ## Architecture
 * - **Pattern**: Zustand Slices (official recommendation 2024-2026)
 * - **Benefits**: Single source of truth, atomic transactions, easier testing
 * - **Organization**: Code split into slice files, combined here
 *
 * ## Slices
 * - **overlay**: UI overlay visibility and navigation
 * - **game**: Game state management with dependency injection
 * - **performance**: Performance overlay configuration
 *
 * ## Why Slices Pattern?
 * - ✅ Maintains separation of concerns (code in separate files)
 * - ✅ Single source of truth (one store)
 * - ✅ Atomic updates (consistent state)
 * - ✅ Simple reset logic (logout, clear state)
 * - ✅ Official Zustand recommendation
 *
 * @module stores/app-store
 * @see https://zustand.docs.pmnd.rs/guides/slices-pattern
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { GameRepository } from '../../domain/repositories/game-repository';
import type { SystemRepository } from '../../domain/repositories/system-repository';
import { createGameSlice, type GameSlice } from './slices/game-slice';
import { createOverlaySlice, type OverlaySlice } from './slices/overlay-slice';
import {
  createPerformanceSlice,
  DEFAULT_PERFORMANCE_CONFIG,
  type PerformanceSlice,
} from './slices/performance-slice';
import { createSystemSlice, type SystemSlice } from './slices/system-slice';

/**
 * Combined app store type
 */
export type AppStore = OverlaySlice & GameSlice & PerformanceSlice & SystemSlice;

/**
 * Factory function to create app store with injected dependencies
 *
 * @param gameRepository - Game repository implementation (Tauri or Mock)
 * @param systemRepository - System repository implementation (Tauri or Mock)
 * @returns Zustand store hook
 *
 * @example
 * ```tsx
 * // In StoreProvider.tsx
 * const gameRepo = new TauriGameRepository();
 * const systemRepo = new TauriSystemRepository();
 * const useAppStore = createAppStore(gameRepo, systemRepo);
 *
 * // In component
 * const { overlay, game, system, showOverlay, launchGame } = useAppStore();
 * ```
 */
export function createAppStore(gameRepository: GameRepository, systemRepository: SystemRepository) {
  return create<AppStore>()(
    persist(
      (set, get) => ({
        // Combine all slices
        ...createOverlaySlice(set, get),
        ...createGameSlice(set, get, gameRepository),
        ...createPerformanceSlice(set, get),
        ...createSystemSlice(set, get, systemRepository),
      }),
      {
        name: 'balam_app_store', // localStorage key
        // Only persist performance config (overlay and game are runtime state)
        partialize: (state) => ({
          performance: state.performance,
        }),
        // Merge persisted state with initial state
        merge: (persisted, current) => {
          const p = persisted as { performance?: { config?: Record<string, unknown> } } | undefined;
          return {
            ...current,
            performance: {
              config: {
                ...DEFAULT_PERFORMANCE_CONFIG,
                ...(p?.performance?.config ?? {}),
              } as AppStore['performance']['config'],
            },
          };
        },
      }
    )
  );
}

/**
 * Type for the app store hook
 */
export type AppStoreHook = ReturnType<typeof createAppStore>;
