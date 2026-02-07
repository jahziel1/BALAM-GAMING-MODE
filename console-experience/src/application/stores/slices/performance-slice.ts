/**
 * Performance Slice
 *
 * Zustand slice for performance overlay configuration.
 * Part of the app-store using the Slices Pattern.
 *
 * ## Architecture
 * - **Pattern**: Zustand Slices
 * - **State**: Performance overlay config (mode, position, enabled)
 * - **Actions**: Configure overlay display settings
 *
 * @module stores/slices/performance-slice
 */

export type PerformanceOverlayMode = 'minimal' | 'compact' | 'full';
export type PerformanceOverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PerformanceOverlayConfig {
  enabled: boolean;
  mode: PerformanceOverlayMode;
  position: PerformanceOverlayPosition;
  autoStartFPS: boolean;
  updateInterval: number; // milliseconds
}

/**
 * Performance slice state
 */
export interface PerformanceSlice {
  performance: {
    config: PerformanceOverlayConfig;
  };

  // Actions
  setPerformanceEnabled: (enabled: boolean) => void;
  setPerformanceMode: (mode: PerformanceOverlayMode) => void;
  setPerformancePosition: (position: PerformanceOverlayPosition) => void;
  setPerformanceAutoStartFPS: (autoStartFPS: boolean) => void;
  setPerformanceUpdateInterval: (updateInterval: number) => void;
  resetPerformanceToDefaults: () => void;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceOverlayConfig = {
  enabled: false,
  mode: 'compact',
  position: 'top-right',
  autoStartFPS: true,
  updateInterval: 1000,
};

/**
 * Create performance slice
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @returns Performance slice state and actions
 */
export const createPerformanceSlice = (
  set: (fn: (state: PerformanceSlice) => Partial<PerformanceSlice>) => void,
  _get: () => PerformanceSlice
): PerformanceSlice => ({
  // Initial state
  performance: {
    config: DEFAULT_PERFORMANCE_CONFIG,
  },

  // Actions
  setPerformanceEnabled: (enabled) =>
    set((state) => ({
      performance: {
        ...state.performance,
        config: { ...state.performance.config, enabled },
      },
    })),

  setPerformanceMode: (mode) =>
    set((state) => ({
      performance: {
        ...state.performance,
        config: { ...state.performance.config, mode },
      },
    })),

  setPerformancePosition: (position) =>
    set((state) => ({
      performance: {
        ...state.performance,
        config: { ...state.performance.config, position },
      },
    })),

  setPerformanceAutoStartFPS: (autoStartFPS) =>
    set((state) => ({
      performance: {
        ...state.performance,
        config: { ...state.performance.config, autoStartFPS },
      },
    })),

  setPerformanceUpdateInterval: (updateInterval) =>
    set((state) => ({
      performance: {
        ...state.performance,
        config: { ...state.performance.config, updateInterval },
      },
    })),

  resetPerformanceToDefaults: () =>
    set((state) => ({
      performance: {
        ...state.performance,
        config: DEFAULT_PERFORMANCE_CONFIG,
      },
    })),
});
