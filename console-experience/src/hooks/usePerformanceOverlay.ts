/**
 * Performance Overlay Configuration Hook
 *
 * Manages performance overlay settings with localStorage persistence.
 *
 * ## Features
 * - Persistent settings (survives app restart)
 * - Type-safe configuration
 * - Default values
 * - Auto-save on change
 *
 * ## Settings
 * - enabled: Toggle overlay on/off
 * - mode: Display mode (minimal/compact/full)
 * - position: Corner position (4 options)
 * - autoStartFPS: Auto-start FPS monitoring when game launches
 *
 * @module hooks/usePerformanceOverlay
 */

import { useCallback, useEffect, useState } from 'react';

export type PerformanceOverlayMode = 'minimal' | 'compact' | 'full';
export type PerformanceOverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PerformanceOverlayConfig {
  enabled: boolean;
  mode: PerformanceOverlayMode;
  position: PerformanceOverlayPosition;
  autoStartFPS: boolean;
  updateInterval: number; // milliseconds
}

const STORAGE_KEY = 'balam_performance_overlay_config';

const DEFAULT_CONFIG: PerformanceOverlayConfig = {
  enabled: false,
  mode: 'compact',
  position: 'top-right',
  autoStartFPS: true,
  updateInterval: 1000,
};

/**
 * Loads configuration from localStorage.
 *
 * @returns Parsed config or default if not found/invalid
 */
function loadConfig(): PerformanceOverlayConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_CONFIG;

    const parsed = JSON.parse(stored) as Partial<PerformanceOverlayConfig>;

    // Merge with defaults (in case new settings added)
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch (error) {
    console.error('Failed to load performance overlay config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Saves configuration to localStorage.
 *
 * @param config Configuration to save
 */
function saveConfig(config: PerformanceOverlayConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save performance overlay config:', error);
  }
}

/**
 * Custom hook for performance overlay configuration.
 *
 * Provides state management and persistence for overlay settings.
 *
 * @returns Configuration state and update functions
 *
 * @example
 * ```tsx
 * const { config, setEnabled, setMode, setPosition } = usePerformanceOverlay();
 *
 * return (
 *   <>
 *     <PerformanceOverlay {...config} />
 *     <button onClick={() => setEnabled(!config.enabled)}>Toggle</button>
 *   </>
 * );
 * ```
 */
export function usePerformanceOverlay() {
  const [config, setConfig] = useState<PerformanceOverlayConfig>(loadConfig);

  // Auto-save on config change
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const setEnabled = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, enabled }));
  }, []);

  const setMode = useCallback((mode: PerformanceOverlayMode) => {
    setConfig((prev) => ({ ...prev, mode }));
  }, []);

  const setPosition = useCallback((position: PerformanceOverlayPosition) => {
    setConfig((prev) => ({ ...prev, position }));
  }, []);

  const setAutoStartFPS = useCallback((autoStartFPS: boolean) => {
    setConfig((prev) => ({ ...prev, autoStartFPS }));
  }, []);

  const setUpdateInterval = useCallback((updateInterval: number) => {
    setConfig((prev) => ({ ...prev, updateInterval }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    setEnabled,
    setMode,
    setPosition,
    setAutoStartFPS,
    setUpdateInterval,
    resetToDefaults,
  };
}
