/**
 * Haptic Feedback Hook
 *
 * Provides haptic feedback (gamepad rumble) for UI interactions.
 * Follows best practices:
 * - Dual-motor rumble patterns (strong + weak)
 * - Persistent user preference (localStorage)
 * - Graceful degradation (no error if gamepad disconnected)
 *
 * @module hooks/useHaptic
 */

import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';

/**
 * Haptic intensity levels
 * - weak: Light feedback for navigation (0.3 magnitude, 200ms)
 * - medium: Medium feedback for actions (0.5 magnitude, 300ms)
 * - strong: Strong feedback for events (0.8 magnitude, 500ms)
 */
export type HapticIntensity = 'weak' | 'medium' | 'strong';

/**
 * Haptic feedback configuration
 */
interface HapticConfig {
  /** Whether haptic feedback is enabled globally */
  enabled: boolean;
  /** Whether hardware supports haptic feedback */
  supported: boolean;
}

/**
 * Haptic feedback hook
 *
 * @returns Haptic control methods and status
 *
 * @example
 * ```tsx
 * const { trigger, hapticNav, hapticAction, enabled, setEnabled } = useHaptic();
 *
 * // Navigation feedback
 * hapticNav(); // Weak, 200ms
 *
 * // Action feedback
 * hapticAction(); // Medium, 300ms
 *
 * // Custom feedback
 * trigger('strong', 500); // Strong, 500ms
 *
 * // Toggle haptic in settings
 * <Switch checked={enabled} onChange={setEnabled} />
 * ```
 */
export function useHaptic() {
  const [config, setConfig] = useState<HapticConfig>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('hapticEnabled') : null;
    return {
      enabled: stored === null ? true : stored === 'true',
      supported: false,
    };
  });

  /**
   * Check hardware support on mount
   */
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await invoke<boolean>('is_haptic_supported');
        setConfig((prev) => ({ ...prev, supported }));
      } catch (error) {
        console.warn('Failed to check haptic support:', error);
        setConfig((prev) => ({ ...prev, supported: false }));
      }
    };

    void checkSupport();
  }, []);

  /**
   * Trigger haptic feedback with custom intensity and duration
   *
   * @param intensity - Rumble intensity ('weak' | 'medium' | 'strong')
   * @param duration_ms - Duration in milliseconds (50-2000ms)
   */
  const trigger = useCallback(
    async (intensity: HapticIntensity, duration_ms: number) => {
      // Skip if disabled or unsupported
      if (!config.enabled || !config.supported) {
        return;
      }

      try {
        await invoke('trigger_haptic', { intensity, duration_ms });
      } catch (error) {
        // Graceful degradation - don't show errors to user
        console.debug('Haptic feedback failed (gamepad may be disconnected):', error);
      }
    },
    [config.enabled, config.supported]
  );

  /**
   * Trigger navigation feedback (weak, 200ms)
   * Use for: menu navigation, focus changes, scrolling
   */
  const hapticNav = useCallback(async () => {
    if (!config.enabled || !config.supported) return;

    try {
      await invoke('haptic_navigation');
    } catch (error) {
      console.debug('Haptic nav failed:', error);
    }
  }, [config.enabled, config.supported]);

  /**
   * Trigger action feedback (medium, 300ms)
   * Use for: button presses, confirmations, selections
   */
  const hapticAction = useCallback(async () => {
    if (!config.enabled || !config.supported) return;

    try {
      await invoke('haptic_action');
    } catch (error) {
      console.debug('Haptic action failed:', error);
    }
  }, [config.enabled, config.supported]);

  /**
   * Trigger event feedback (strong, 500ms)
   * Use for: game launch, achievements, important notifications
   */
  const hapticEvent = useCallback(async () => {
    if (!config.enabled || !config.supported) return;

    try {
      await invoke('haptic_event');
    } catch (error) {
      console.debug('Haptic event failed:', error);
    }
  }, [config.enabled, config.supported]);

  /**
   * Toggle haptic feedback on/off
   * Persists to localStorage
   */
  const setEnabled = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, enabled }));
    localStorage.setItem('hapticEnabled', enabled.toString());
  }, []);

  return {
    /** Trigger custom haptic feedback */
    trigger,
    /** Trigger navigation feedback (weak, 200ms) */
    hapticNav,
    /** Trigger action feedback (medium, 300ms) */
    hapticAction,
    /** Trigger event feedback (strong, 500ms) */
    hapticEvent,
    /** Whether haptic feedback is enabled */
    enabled: config.enabled,
    /** Whether hardware supports haptic feedback */
    supported: config.supported,
    /** Toggle haptic feedback on/off */
    setEnabled,
  };
}
