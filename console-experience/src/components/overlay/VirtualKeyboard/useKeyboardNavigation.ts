/**
 * Hook: useKeyboardNavigation
 *
 * Manages internal navigation and text input logic for virtual keyboard.
 * Extracted from VirtualKeyboard component for Single Responsibility.
 *
 * FIXES:
 * - #3: Conditional preventDefault (only block handled keys)
 * - #13: Tab navigation support
 * - #19: Caps Lock implementation (double-tap SHIFT)
 * - #24: Reset state on close
 * - #25: Visual feedback animation trigger
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { getLayout, LayoutMode, SPECIAL_KEYS } from './layouts';

interface UseKeyboardNavigationProps {
  isOpen: boolean;
  initialValue?: string;
  inputType?: 'text' | 'email' | 'password' | 'number' | 'url';
  maxLength?: number;
  onSubmit: (text: string) => void;
  onClose: () => void;
  onTextChange?: (text: string) => void;
}

export const useKeyboardNavigation = ({
  isOpen,
  initialValue = '',
  inputType = 'text',
  maxLength,
  onSubmit,
  onClose,
  onTextChange,
}: UseKeyboardNavigationProps) => {
  const [text, setText] = useState(initialValue);
  const [shift, setShift] = useState(false);
  const [capsLock, setCapsLock] = useState(false); // Fix #19: Caps Lock state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('qwerty');
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedCol, setFocusedCol] = useState(0);
  const [lastPressedKey, setLastPressedKey] = useState<string | null>(null); // Fix #25: For animation
  const [pressAnimation, setPressAnimation] = useState(false); // Fix #25: Press feedback

  // Fix #19: Track last shift press time for double-tap detection
  const lastShiftPress = useRef<number>(0);

  // Helper to update text and notify parent
  const updateText = useCallback(
    (newText: string) => {
      setText(newText);
      onTextChange?.(newText);
    },
    [onTextChange]
  );

  // Fix #24: Reset all state when keyboard opens
  useEffect(() => {
    if (isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      // Intentional state initialization on keyboard open
      setText(initialValue);
      setShift(false);
      setCapsLock(false);
      setFocusedRow(0);
      setFocusedCol(0);
      setLastPressedKey(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen, initialValue]);

  // Fix #24: Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      // Intentional state cleanup on keyboard close
      setText('');
      setShift(false);
      setCapsLock(false);
      setLayoutMode('qwerty');
      setFocusedRow(0);
      setFocusedCol(0);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen]);

  // Initialize layout based on input type
  useEffect(() => {
    if (!isOpen) return;

    /* eslint-disable react-hooks/set-state-in-effect */
    // Derived state from inputType prop
    if (inputType === 'email') setLayoutMode('email');
    else if (inputType === 'number') setLayoutMode('numeric');
    else if (inputType === 'url') setLayoutMode('url');
    else setLayoutMode('qwerty');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [inputType, isOpen]);

  const currentLayout = getLayout(layoutMode, shift, capsLock);

  const handleNavigation = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      const maxRow = currentLayout.length - 1;

      switch (direction) {
        case 'UP': {
          const newRow = Math.max(0, focusedRow - 1);
          setFocusedRow(newRow);
          setFocusedCol((prev) => Math.min(prev, currentLayout[newRow]?.length - 1 || 0));
          break;
        }
        case 'DOWN': {
          const newRow = Math.min(maxRow, focusedRow + 1);
          setFocusedRow(newRow);
          setFocusedCol((prev) => Math.min(prev, currentLayout[newRow]?.length - 1 || 0));
          break;
        }
        case 'LEFT':
          setFocusedCol((prev) => Math.max(0, prev - 1));
          break;
        case 'RIGHT': {
          const maxCol = currentLayout[focusedRow]?.length - 1 || 0;
          setFocusedCol((prev) => Math.min(maxCol, prev + 1));
          break;
        }
      }
    },
    [currentLayout, focusedRow]
  );

  // Fix #13: Tab navigation
  const handleTabNavigation = useCallback(
    (forward: boolean) => {
      const totalKeys = currentLayout.reduce((sum, row) => sum + row.length, 0);
      let currentIndex = 0;

      // Calculate current index
      for (let i = 0; i < focusedRow; i++) {
        currentIndex += currentLayout[i].length;
      }
      currentIndex += focusedCol;

      // Move to next/previous key
      const newIndex = forward
        ? (currentIndex + 1) % totalKeys
        : (currentIndex - 1 + totalKeys) % totalKeys;

      // Convert back to row/col
      let remainingIndex = newIndex;
      for (let row = 0; row < currentLayout.length; row++) {
        if (remainingIndex < currentLayout[row].length) {
          setFocusedRow(row);
          setFocusedCol(remainingIndex);
          break;
        }
        remainingIndex -= currentLayout[row].length;
      }
    },
    [currentLayout, focusedRow, focusedCol]
  );

  const handleKeyPress = useCallback(
    (key: string) => {
      // Fix #25: Trigger animation
      setLastPressedKey(key);
      setPressAnimation(true);
      setTimeout(() => setPressAnimation(false), 200);

      // Special keys
      if (key === SPECIAL_KEYS.BACK) {
        updateText(text.slice(0, -1));
        return;
      }

      if (key === SPECIAL_KEYS.ENTER) {
        onSubmit(text);
        onClose();
        return;
      }

      if (key === SPECIAL_KEYS.SHIFT) {
        // Fix #19: Double-tap detection for Caps Lock
        const now = Date.now();
        if (now - lastShiftPress.current < 300) {
          // Double tap detected
          setCapsLock((prev) => !prev);
          setShift(false); // Clear shift when activating caps
        } else {
          // Single tap
          if (!capsLock) {
            setShift((prev) => !prev);
          }
        }
        lastShiftPress.current = now;
        return;
      }

      if (key === SPECIAL_KEYS.CAPS) {
        // Fix #19: Explicit Caps Lock toggle
        setCapsLock((prev) => !prev);
        setShift(false);
        return;
      }

      if (key === SPECIAL_KEYS.SYMBOLS) {
        setLayoutMode((prev) => (prev === 'symbols' ? 'qwerty' : 'symbols'));
        return;
      }

      if (key === SPECIAL_KEYS.QWERTY) {
        setLayoutMode('qwerty');
        return;
      }

      if (key === SPECIAL_KEYS.SPACE) {
        if (maxLength && text.length >= maxLength) return;
        updateText(text + ' ');
        return;
      }

      // Regular key or multi-char keys (.com, etc.)
      if (maxLength && text.length >= maxLength) return;
      updateText(text + key);

      // Auto-disable shift after typing a letter (but not caps lock)
      if (shift && !capsLock && /[a-zA-Z]/.exec(key)) {
        setShift(false);
      }
    },
    [text, shift, capsLock, maxLength, onSubmit, onClose, updateText]
  );

  // Keyboard event listener for physical keyboard and gamepad events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyboard = (e: KeyboardEvent) => {
      // Fix #3: Only preventDefault for keys we actually handle
      const handledKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'Escape',
        'Backspace',
        'Shift',
        ' ',
        'F1',
        'Tab',
      ];

      if (!handledKeys.includes(e.key) && e.key !== 'Tab') {
        // Allow unhandled keys to bubble (browser shortcuts, etc.)
        return;
      }

      // Prevent default only for handled keys
      e.preventDefault();

      switch (e.key) {
        // Navigation
        case 'ArrowUp':
          handleNavigation('UP');
          break;
        case 'ArrowDown':
          handleNavigation('DOWN');
          break;
        case 'ArrowLeft':
          handleNavigation('LEFT');
          break;
        case 'ArrowRight':
          handleNavigation('RIGHT');
          break;

        // Fix #13: Tab navigation
        case 'Tab':
          handleTabNavigation(!e.shiftKey);
          break;

        // Actions
        case 'Enter': {
          const currentKey = currentLayout[focusedRow]?.[focusedCol];
          if (currentKey) handleKeyPress(currentKey);
          break;
        }
        case 'Escape':
          onClose();
          break;

        // Steam-style shortcuts (gamepad bumpers/triggers)
        case 'Backspace':
          handleKeyPress(SPECIAL_KEYS.BACK);
          break;
        case 'Shift':
          handleKeyPress(SPECIAL_KEYS.SHIFT);
          break;
        case ' ':
          handleKeyPress(SPECIAL_KEYS.SPACE);
          break;
        case 'F1':
          handleKeyPress(SPECIAL_KEYS.SYMBOLS);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [
    isOpen,
    handleNavigation,
    handleTabNavigation,
    handleKeyPress,
    currentLayout,
    focusedRow,
    focusedCol,
    onClose,
  ]);

  return {
    text,
    setText,
    shift,
    capsLock, // Fix #19: Expose caps lock state
    layoutMode,
    currentLayout,
    focusedRow,
    focusedCol,
    lastPressedKey, // Fix #25: For animation
    pressAnimation, // Fix #25: Animation state
    handleKeyPress,
    clearText: () => updateText(''),
  };
};
