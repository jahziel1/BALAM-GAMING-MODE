/**
 * Performance Overlay Zustand Store
 *
 * Global state management for performance overlay configuration.
 * Replaces the local useState approach with centralized Zustand store.
 *
 * ## Why Zustand?
 * - Fixes issue where SettingsPanel and App.tsx had separate hook instances
 * - Changes in SettingsPanel now immediately reflect in App.tsx
 * - Automatic localStorage persistence
 * - Type-safe state management
 *
 * @module stores/performance-overlay-store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PerformanceOverlayMode = 'minimal' | 'compact' | 'full';
export type PerformanceOverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PerformanceOverlayConfig {
  enabled: boolean;
  mode: PerformanceOverlayMode;
  position: PerformanceOverlayPosition;
  autoStartFPS: boolean;
  updateInterval: number; // milliseconds
}

interface PerformanceOverlayStore {
  // State
  config: PerformanceOverlayConfig;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: PerformanceOverlayMode) => void;
  setPosition: (position: PerformanceOverlayPosition) => void;
  setAutoStartFPS: (autoStartFPS: boolean) => void;
  setUpdateInterval: (updateInterval: number) => void;
  resetToDefaults: () => void;
}

const DEFAULT_CONFIG: PerformanceOverlayConfig = {
  enabled: false,
  mode: 'compact',
  position: 'top-right',
  autoStartFPS: true,
  updateInterval: 1000,
};

/**
 * Performance Overlay Zustand Store
 *
 * Global store for performance overlay configuration with automatic persistence.
 *
 * @example
 * ```tsx
 * import { usePerformanceOverlayStore } from '@/stores';
 *
 * function MyComponent() {
 *   const { config, setMode } = usePerformanceOverlayStore();
 *
 *   return (
 *     <button onClick={() => setMode('full')}>
 *       Current: {config.mode}
 *     </button>
 *   );
 * }
 * ```
 */
export const usePerformanceOverlayStore = create<PerformanceOverlayStore>()(
  persist(
    (set) => ({
      // Initial state
      config: DEFAULT_CONFIG,

      // Actions
      setEnabled: (enabled) =>
        set((state) => ({
          config: { ...state.config, enabled },
        })),

      setMode: (mode) =>
        set((state) => ({
          config: { ...state.config, mode },
        })),

      setPosition: (position) =>
        set((state) => ({
          config: { ...state.config, position },
        })),

      setAutoStartFPS: (autoStartFPS) =>
        set((state) => ({
          config: { ...state.config, autoStartFPS },
        })),

      setUpdateInterval: (updateInterval) =>
        set((state) => ({
          config: { ...state.config, updateInterval },
        })),

      resetToDefaults: () =>
        set(() => ({
          config: DEFAULT_CONFIG,
        })),
    }),
    {
      name: 'balam_performance_overlay_config', // localStorage key
    }
  )
);
