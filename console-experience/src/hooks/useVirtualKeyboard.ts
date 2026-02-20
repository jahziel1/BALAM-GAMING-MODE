/**
 * @module hooks/useVirtualKeyboard
 *
 * Hook for managing virtual keyboard visibility and behavior.
 * Automatically opens keyboard for gamepad/mouse, closes for physical keyboard.
 *
 * FIXES:
 * - #4: Properly filter input types (exclude checkbox, radio, range, etc.)
 * - #23: Debounce onTextChange to prevent excessive re-renders
 * - #24: Reset state when closed
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { InputDeviceType } from '../domain/input/InputDevice';
import { useInputDevice } from './useInputDevice';

/**
 * Options for useVirtualKeyboard hook
 */
interface UseVirtualKeyboardOptions {
  /** Callback when keyboard opens */
  onOpen?: () => void;
  /** Callback when keyboard closes */
  onClose?: () => void;
  /** Callback when text changes (debounced) */
  onTextChange?: (text: string) => void;
  /** Debounce delay for text change (ms) - Fix #23 */
  debounceMs?: number;
  /** Optional: Target input ref for custom input components */
  targetInputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

/**
 * Return type of useVirtualKeyboard hook
 */
export type VirtualKeyboardHook = ReturnType<typeof useVirtualKeyboard>;

/**
 * Fix #4: Input types that should NOT open virtual keyboard
 */
const EXCLUDED_INPUT_TYPES = [
  'file',
  'checkbox',
  'radio',
  'range',
  'color',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
  'submit',
  'button',
  'reset',
  'image',
  'hidden',
];

/**
 * Fix #4: Check if element should open virtual keyboard
 */
const shouldOpenKeyboard = (element: Element): boolean => {
  // Check if it's an input
  if (element instanceof HTMLInputElement) {
    return !EXCLUDED_INPUT_TYPES.includes(element.type);
  }

  // Textarea should open keyboard
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  return false;
};

/**
 * Custom hook for virtual keyboard management
 *
 * Manages virtual keyboard state based on input device:
 * - Opens when gamepad/mouse focuses an input (no physical keyboard)
 * - Closes when physical keyboard is detected
 * - Provides text submission and initial value retrieval
 *
 * ## Automatic Behavior
 * - Auto-opens on input focus (gamepad/mouse only)
 * - Auto-closes when switching to physical keyboard
 * - Auto-reopens when switching back to gamepad
 *
 * @param options - Configuration callbacks
 * @returns Keyboard state and control functions
 *
 * @example
 * ```tsx
 * function SearchBar() {
 *   const keyboard = useVirtualKeyboard({
 *     onTextChange: (text) => console.log(text),
 *     debounceMs: 300,
 *   });
 *
 *   return (
 *     <>
 *       <input type="text" />
 *       <VirtualKeyboard {...keyboard} />
 *     </>
 *   );
 * }
 * ```
 */
export const useVirtualKeyboard = (options?: UseVirtualKeyboardOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const { deviceType } = useInputDevice();

  // Fix #23: Debounce timer
  const debounceTimer = useRef<number | null>(null);
  const debounceMs = options?.debounceMs ?? 150; // Default 150ms debounce

  // Suppress auto-reopen after an explicit user close (prevents the VK from
  // immediately reopening when close() blurs the targetInput while deviceType=GAMEPAD)
  const closedByUserRef = useRef(false);

  // Use refs to avoid recreating effects on every callback change
  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  // Helper to get the target input element
  const getTargetInput = useCallback((): HTMLInputElement | HTMLTextAreaElement | null => {
    // Prefer targetInputRef if provided
    if (callbacksRef.current?.targetInputRef?.current) {
      return callbacksRef.current.targetInputRef.current;
    }
    // Fall back to activeElement
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      return activeElement;
    }
    return null;
  }, []);

  // Fix #24: Clean up state when unmounting
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Handle input focus events
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;

      // Fix #4: Proper input type filtering
      if (shouldOpenKeyboard(target)) {
        // Open keyboard if using gamepad or mouse (NOT physical keyboard)
        if (deviceType === InputDeviceType.GAMEPAD || deviceType === InputDeviceType.MOUSE) {
          // A real focus event means the user explicitly focused an input — allow reopen
          closedByUserRef.current = false;
          setIsOpen(true);
          callbacksRef.current?.onOpen?.();
        }
      }
    };

    window.addEventListener('focus', handleFocus, true);
    return () => window.removeEventListener('focus', handleFocus, true);
  }, [deviceType]);

  // Auto-close keyboard when switching to physical keyboard
  useEffect(() => {
    if (isOpen && deviceType === InputDeviceType.KEYBOARD) {
      /* eslint-disable react-hooks/set-state-in-effect */
      // Intentional auto-close when physical keyboard detected
      setIsOpen(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      callbacksRef.current?.onClose?.();
    }
  }, [deviceType, isOpen]);

  // Auto-reopen keyboard when switching to gamepad/mouse if input is focused.
  // Suppressed for one cycle after an explicit close() to prevent the VK from
  // immediately reopening when close() blurs the targetInput.
  useEffect(() => {
    if (
      !isOpen &&
      (deviceType === InputDeviceType.GAMEPAD || deviceType === InputDeviceType.MOUSE)
    ) {
      if (closedByUserRef.current) {
        // Consume the suppress flag — subsequent device-change cycles will behave normally
        closedByUserRef.current = false;
        return;
      }
      // Check targetInputRef first, then activeElement
      const targetInput = getTargetInput();
      const activeElement = targetInput ?? document.activeElement;
      if (activeElement && shouldOpenKeyboard(activeElement)) {
        /* eslint-disable react-hooks/set-state-in-effect */
        // Intentional auto-open when gamepad/mouse detected with focused input
        setIsOpen(true);
        /* eslint-enable react-hooks/set-state-in-effect */
        callbacksRef.current?.onOpen?.();
      }
    }
  }, [deviceType, isOpen, getTargetInput]);

  const close = useCallback(() => {
    closedByUserRef.current = true; // Suppress immediate auto-reopen
    setIsOpen(false);
    callbacksRef.current?.onClose?.();

    // Fix #24: Clear debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    // Blur target element
    const targetInput = getTargetInput();
    if (targetInput) {
      targetInput.blur();
    }
  }, [getTargetInput]);

  const handleSubmit = useCallback(
    (text: string) => {
      // Update the target input field
      const targetInput = getTargetInput();

      if (targetInput) {
        // Use React's internal value setter for controlled components
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(targetInput, text);
        } else {
          targetInput.value = text;
        }

        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      close();
    },
    [close, getTargetInput]
  );

  // Fix #23: Debounced text change handler with real-time input update
  const handleTextChange = useCallback(
    (text: string) => {
      // Update the input value immediately (real-time feedback)
      const targetInput = getTargetInput();

      if (targetInput) {
        // FIX: Use React's internal value setter for controlled components
        // This is required because Command.Input (and other controlled inputs)
        // won't detect manual value changes without triggering React's internal setter
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(targetInput, text);
          // Dispatch both 'input' and 'change' events to ensure React detects the change
          const inputEvent = new Event('input', { bubbles: true });
          const changeEvent = new Event('change', { bubbles: true });
          targetInput.dispatchEvent(inputEvent);
          targetInput.dispatchEvent(changeEvent);
        } else {
          // Fallback for non-standard inputs
          targetInput.value = text;
          targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else {
        console.error('❌ NO TARGET INPUT FOUND!');
      }

      // Call debounced callback if provided
      if (callbacksRef.current?.onTextChange) {
        // Clear existing timer
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        // Set new timer
        debounceTimer.current = window.setTimeout(() => {
          callbacksRef.current?.onTextChange?.(text);
        }, debounceMs);
      }
    },
    [debounceMs, getTargetInput]
  );

  // Manual open method for explicit control
  const open = useCallback(() => {
    closedByUserRef.current = false; // Allow reopen when explicitly triggered
    setIsOpen(true);
    callbacksRef.current?.onOpen?.();
  }, []);

  return {
    isOpen,
    open, // Manual open method
    close,
    handleSubmit,
    handleTextChange, // Fix #23: Debounced version
    getInitialValue: () => {
      const targetInput = getTargetInput();
      return targetInput?.value ?? '';
    },
    getInputType: () => {
      const targetInput = getTargetInput();
      if (targetInput instanceof HTMLInputElement) {
        return targetInput.type;
      }
      return 'text';
    },
    getTargetInput, // Expose helper for OverlayManager
  };
};
