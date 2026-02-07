/**
 * Audio Hook
 *
 * React hook for native audio feedback.
 * Wraps the singleton AudioService with React lifecycle.
 *
 * @module hooks/useAudio
 */

import { useCallback, useEffect, useState } from 'react';

import { type AudioEffect, audioService } from '../services/audio';

/**
 * Audio hook
 *
 * Provides audio feedback control with React integration.
 *
 * @returns Audio control methods and status
 *
 * @example
 * ```tsx
 * const { play, audioNav, audioSelect, enabled, setEnabled, volume, setVolume } = useAudio();
 *
 * // Navigation sound
 * audioNav(); // Light click
 *
 * // Confirm action
 * audioSelect(); // Two-tone beep
 *
 * // Custom sound
 * play('whoosh'); // Transition sound
 *
 * // Settings control
 * <Slider value={volume} onChange={setVolume} />
 * <Switch checked={enabled} onChange={setEnabled} />
 * ```
 */
export function useAudio() {
  const [enabled, setEnabledState] = useState(audioService.isEnabled());
  const [volume, setVolumeState] = useState(audioService.getVolume());

  /**
   * Resume AudioContext on mount
   *
   * Required for browsers that suspend AudioContext by default.
   * Called once on component mount to prepare audio system.
   */
  useEffect(() => {
    const resumeAudio = async () => {
      try {
        await audioService.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    };

    void resumeAudio();
  }, []);

  /**
   * Play sound effect by name
   *
   * @param effect - Sound effect to play
   */
  const play = useCallback((effect: AudioEffect) => {
    audioService.play(effect);
  }, []);

  /**
   * Play navigation sound (light click)
   * Use for: menu navigation, focus changes
   */
  const audioNav = useCallback(() => {
    audioService.navigation();
  }, []);

  /**
   * Play select/confirm sound (two-tone beep)
   * Use for: button presses, confirmations
   */
  const audioSelect = useCallback(() => {
    audioService.select();
  }, []);

  /**
   * Play back/cancel sound (descending tone)
   * Use for: cancellations, going back
   */
  const audioBack = useCallback(() => {
    audioService.back();
  }, []);

  /**
   * Play whoosh sound (white noise burst)
   * Use for: screen transitions, panel opens
   */
  const audioWhoosh = useCallback(() => {
    audioService.whoosh();
  }, []);

  /**
   * Play launch sound (power-up)
   * Use for: game launches, important events
   */
  const audioLaunch = useCallback(() => {
    audioService.launch();
  }, []);

  /**
   * Play error sound (harsh buzz)
   * Use for: errors, warnings, failed actions
   */
  const audioError = useCallback(() => {
    audioService.error();
  }, []);

  /**
   * Set master volume
   *
   * @param newVolume - Volume level (0.0 - 1.0)
   */
  const setVolume = useCallback((newVolume: number) => {
    audioService.setVolume(newVolume);
    setVolumeState(newVolume);
  }, []);

  /**
   * Toggle audio on/off
   *
   * @param newEnabled - Whether audio is enabled
   */
  const setEnabled = useCallback((newEnabled: boolean) => {
    audioService.setEnabled(newEnabled);
    setEnabledState(newEnabled);
  }, []);

  return {
    /** Play sound effect by name */
    play,
    /** Play navigation sound (light click) */
    audioNav,
    /** Play select/confirm sound (two-tone beep) */
    audioSelect,
    /** Play back/cancel sound (descending tone) */
    audioBack,
    /** Play whoosh sound (white noise burst) */
    audioWhoosh,
    /** Play launch sound (power-up) */
    audioLaunch,
    /** Play error sound (harsh buzz) */
    audioError,
    /** Whether audio is enabled */
    enabled,
    /** Set audio enabled/disabled */
    setEnabled,
    /** Current master volume (0.0 - 1.0) */
    volume,
    /** Set master volume (0.0 - 1.0) */
    setVolume,
  };
}
