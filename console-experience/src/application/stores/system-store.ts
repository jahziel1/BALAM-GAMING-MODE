/**
 * Application Store: System Store
 *
 * Zustand store for system status monitoring using dependency injection.
 *
 * @module application/stores/system-store
 */

import * as v from 'valibot';
import { create } from 'zustand';

import type { SystemStatus } from '../../domain/entities/system-status';
import type { SystemRepository } from '../../domain/repositories/system-repository';
import { SystemStatusSchema } from '../../domain/validation/system-schemas';

/**
 * System store state interface
 */
interface SystemStoreState {
  // State
  status: SystemStatus | null;
  error: string | null;

  // Actions
  refreshStatus: () => Promise<void>;
  clearError: () => void;
}

/**
 * Factory function to create system store with injected repository
 *
 * @param repository - System repository implementation (Tauri or Mock)
 * @returns Zustand store hook
 */
export function createSystemStore(repository: SystemRepository) {
  return create<SystemStoreState>((set) => ({
    // Initial state
    status: null,
    error: null,

    // Refresh system status
    refreshStatus: async () => {
      try {
        set({ error: null });
        const status = await repository.getStatus();

        // Validate response
        const validatedStatus = v.parse(SystemStatusSchema, status);

        set({ status: validatedStatus });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get system status';
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
 * Type for the system store hook
 */
export type SystemStore = ReturnType<typeof createSystemStore>;
