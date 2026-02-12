/**
 * Performance Slice
 *
 * Zustand slice for performance overlay configuration.
 * Part of the app-store using the Slices Pattern.
 *
 * ## Architecture
 * - **Pattern**: Zustand Slices
 * - **State**: Performance overlay config (level 0-4, opacity)
 * - **Actions**: Configure overlay display settings
 *
 * ## Overlay Levels (Steam Deck style)
 * - **0**: Hidden
 * - **1**: Minimal (FPS only)
 * - **2**: Basic (FPS + Frame time)
 * - **3**: Standard (FPS + Frame time + CPU/GPU usage)
 * - **4**: Full (All metrics: temps, RAM, GPU power)
 *
 * @module stores/slices/performance-slice
 */

export type OverlayLevel = 0 | 1 | 2 | 3 | 4;
export type PerformanceOverlayMode = 'minimal' | 'compact' | 'full'; // Deprecated, kept for compatibility
export type PerformanceOverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PerformanceOverlayConfig {
  /** Overlay detail level (0-4, Steam Deck style) */
  level: OverlayLevel;
  /** Overlay opacity (0-1) */
  opacity: number;
  /** @deprecated Legacy field, use level instead */
  enabled: boolean;
  /** @deprecated Legacy field, use level instead */
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
  setPerformanceLevel: (level: OverlayLevel) => void;
  setPerformanceOpacity: (opacity: number) => void;
  /** @deprecated Use setPerformanceLevel instead */
  setPerformanceEnabled: (enabled: boolean) => void;
  /** @deprecated Use setPerformanceLevel instead */
  setPerformanceMode: (mode: PerformanceOverlayMode) => void;
  setPerformancePosition: (position: PerformanceOverlayPosition) => void;
  setPerformanceAutoStartFPS: (autoStartFPS: boolean) => void;
  setPerformanceUpdateInterval: (updateInterval: number) => void;
  resetPerformanceToDefaults: () => void;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceOverlayConfig = {
  level: 1, // Minimal (FPS only)
  opacity: 0.9,
  enabled: false, // Deprecated
  mode: 'compact', // Deprecated
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
  setPerformanceLevel: (level) =>
    set((state) => ({
      performance: {
        ...state.performance,
        config: { ...state.performance.config, level },
      },
    })),

  setPerformanceOpacity: (opacity) =>
    set((state) => ({
      performance: {
        ...state.performance,
        config: { ...state.performance.config, opacity },
      },
    })),

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
