/**
 * System Slice
 *
 * Zustand slice for system status monitoring using dependency injection.
 * Part of the app-store using the Slices Pattern.
 *
 * ## Architecture
 * - **Pattern**: Zustand Slices + Dependency Injection
 * - **State**: System status (battery, volume, brightness, etc.)
 * - **Actions**: Refresh status
 *
 * @module stores/slices/system-slice
 */

import * as v from 'valibot';

import type { SystemStatus } from '../../../domain/entities/system-status';
import type { SystemRepository } from '../../../domain/repositories/system-repository';
import { SystemStatusSchema } from '../../../domain/validation/system-schemas';

/**
 * System slice state
 */
export interface SystemSlice {
  system: {
    status: SystemStatus | null;
    error: string | null;
  };

  // Actions
  refreshSystemStatus: () => Promise<void>;
  clearSystemError: () => void;
}

/**
 * Create system slice with injected repository
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param repository - System repository implementation (Tauri or Mock)
 * @returns System slice state and actions
 */
export const createSystemSlice = (
  set: (fn: (state: SystemSlice) => Partial<SystemSlice>) => void,
  _get: () => SystemSlice,
  repository: SystemRepository
): SystemSlice => ({
  // Initial state
  system: {
    status: null,
    error: null,
  },

  // Refresh system status
  refreshSystemStatus: async () => {
    try {
      set((state) => ({
        system: { ...state.system, error: null },
      }));

      const status = await repository.getStatus();

      // Validate response
      const validatedStatus = v.parse(SystemStatusSchema, status);

      set((state) => ({
        system: { ...state.system, status: validatedStatus },
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get system status';
      set((state) => ({
        system: { ...state.system, error: errorMessage },
      }));
    }
  },

  // Clear error message
  clearSystemError: () => {
    set((state) => ({
      system: { ...state.system, error: null },
    }));
  },
});
