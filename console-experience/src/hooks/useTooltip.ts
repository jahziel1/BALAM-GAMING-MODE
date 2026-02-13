/**
 * useTooltip Hook
 *
 * Provides tooltip logic for managing show/hide state with delays.
 * Supports both mouse hover and keyboard focus modes.
 *
 * @example
 * ```tsx
 * const { showTooltip, hideTooltip, isVisible } = useTooltip();
 * <button onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
 *   Hover me
 * </button>
 * ```
 */

import { useCallback, useRef, useState } from 'react';

export interface UseTooltipOptions {
  /** Delay before showing tooltip (ms) */
  showDelay?: number;
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number;
  /** Whether to use gamepad focus mode (longer delay) */
  gamepadMode?: boolean;
}

export interface UseTooltipReturn {
  /** Whether tooltip is visible */
  isVisible: boolean;
  /** Show tooltip after delay */
  showTooltip: () => void;
  /** Hide tooltip immediately */
  hideTooltip: () => void;
  /** Props to spread on target element */
  tooltipProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

/**
 * Hook for managing tooltip visibility with delays
 *
 * @param options - Configuration options
 * @returns Tooltip state and handlers
 */
export const useTooltip = (options: UseTooltipOptions = {}): UseTooltipReturn => {
  const { showDelay = 500, hideDelay = 0, gamepadMode = false } = options;

  const [isVisible, setIsVisible] = useState(false);
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  /**
   * Clear all pending timeouts
   */
  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  /**
   * Show tooltip after configured delay
   * Gamepad mode uses longer delay (1s) vs hover (500ms default)
   */
  const showTooltip = useCallback(() => {
    clearTimeouts();

    const delay = gamepadMode ? 1000 : showDelay;

    showTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [clearTimeouts, showDelay, gamepadMode]);

  /**
   * Hide tooltip after configured delay
   */
  const hideTooltip = useCallback(() => {
    clearTimeouts();

    if (hideDelay === 0) {
      setIsVisible(false);
    } else {
      hideTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);
    }
  }, [clearTimeouts, hideDelay]);

  /**
   * Mouse enter handler
   */
  const handleMouseEnter = useCallback(() => {
    showTooltip();
  }, [showTooltip]);

  /**
   * Mouse leave handler
   */
  const handleMouseLeave = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  /**
   * Focus handler (keyboard/gamepad navigation)
   */
  const handleFocus = useCallback(() => {
    showTooltip();
  }, [showTooltip]);

  /**
   * Blur handler
   */
  const handleBlur = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  return {
    isVisible,
    showTooltip,
    hideTooltip,
    tooltipProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
};
