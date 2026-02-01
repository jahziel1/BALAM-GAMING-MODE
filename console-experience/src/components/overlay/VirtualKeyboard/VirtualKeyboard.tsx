/**
 * Component: VirtualKeyboard (Complete Refactor)
 *
 * Pure presentational component for virtual keyboard.
 * All logic delegated to useKeyboardNavigation hook.
 *
 * FIXES:
 * - #2: Memoized props calculations (no function calls in render)
 * - #5: Exit animation support
 * - #6: Moved inline styles to CSS
 * - #7: Password masking with bullets
 * - #8: Shift/Caps Lock indicator badges
 * - #9: Layout mode indicator
 * - #11: Complete ARIA labels
 * - #20: maxLength counter display
 * - #21: Removed Clear button from preview (moved to layout)
 * - #25: Visual press feedback animation
 * - #26: Dynamic hints based on controller type
 */

import './VirtualKeyboard.css';

import React, { useMemo, useState } from 'react';

import { getDisplayKey, isSpecialKey } from './layouts';
import { useKeyboardNavigation } from './useKeyboardNavigation';

export interface VirtualKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  initialValue?: string;
  placeholder?: string;
  inputType?: 'text' | 'email' | 'password' | 'number' | 'url';
  maxLength?: number;
  onTextChange?: (text: string) => void;
  controllerType?: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC'; // Fix #26
}

/**
 * Fix #7: Mask password text with bullets
 */
const maskPassword = (text: string): string => {
  return '•'.repeat(text.length);
};

/**
 * Fix #26: Get controller-specific hints
 */
const getControllerHints = (controllerType: string) => {
  switch (controllerType) {
    case 'XBOX':
      return {
        navigate: 'D-Pad/Left Stick: Navigate',
        select: 'Ⓐ: Select',
        back: 'LB: Backspace',
        shift: 'RB: Shift',
        space: 'LT: Space',
        symbols: 'RT: Symbols',
      };
    case 'PLAYSTATION':
      return {
        navigate: 'D-Pad/Left Stick: Navigate',
        select: '✕: Select',
        back: 'L1: Backspace',
        shift: 'R1: Shift',
        space: 'L2: Space',
        symbols: 'R2: Symbols',
      };
    case 'KEYBOARD':
      return {
        navigate: 'Arrow Keys/Tab: Navigate',
        select: 'Enter: Select',
        back: 'Backspace',
        shift: 'Shift: Toggle',
        space: 'Space',
        symbols: 'F1: Symbols',
      };
    default:
      return {
        navigate: 'Navigate: D-Pad',
        select: 'Select: Ⓐ',
        back: 'Back: LB',
        shift: 'Shift: RB',
        space: 'Space: LT',
        symbols: 'Symbols: RT',
      };
  }
};

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = (props) => {
  const {
    isOpen,
    placeholder = 'Type here...',
    inputType = 'text',
    maxLength,
    controllerType = 'GENERIC',
  } = props;

  // Fix #5: Track closing animation state
  const [isClosing, setIsClosing] = useState(false);

  const {
    text,
    shift,
    capsLock,
    layoutMode,
    currentLayout,
    focusedRow,
    focusedCol,
    lastPressedKey,
    pressAnimation,
    handleKeyPress,
  } = useKeyboardNavigation(props);

  // Fix #26: Memoize controller hints
  const hints = useMemo(() => getControllerHints(controllerType), [controllerType]);

  // Fix #2: Memoize display text (password masking)
  const displayText = useMemo(() => {
    if (inputType === 'password') {
      return maskPassword(text); // Fix #7
    }
    return text;
  }, [text, inputType]);

  // Fix #20: Calculate remaining characters
  const remainingChars = useMemo(() => {
    if (!maxLength) return null;
    return maxLength - text.length;
  }, [text.length, maxLength]);

  // Fix #5: Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      props.onClose();
    }, 200); // Match CSS animation duration
  };

  // Fix #5: Don't render if not open and not closing
  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`virtual-keyboard-overlay ${isClosing ? 'closing' : ''}`}
      role="dialog" // Fix #11
      aria-modal="true" // Fix #11
      aria-label="Virtual Keyboard" // Fix #11
    >
      {/* Text Preview - Fix #6: Moved inline styles to CSS */}
      <div className="keyboard-input-preview">
        <div className="preview-content">
          {/* Fix #8: Status Indicators */}
          <div className="preview-indicators">
            {shift && !capsLock ? (
              <span className="indicator-badge shift-badge">⇧ Shift</span>
            ) : null}
            {capsLock ? <span className="indicator-badge caps-badge">⇪ Caps Lock</span> : null}
            {/* Fix #9: Layout indicator */}
            {layoutMode !== 'qwerty' ? (
              <span className="indicator-badge layout-badge">{layoutMode.toUpperCase()}</span>
            ) : null}
          </div>

          <div className="preview-text-container">
            <span className="preview-label">Typing:</span>
            <div className="preview-text" aria-live="polite">
              {/* Fix #7: Password masking */}
              {displayText || <span className="preview-placeholder">{placeholder}</span>}
            </div>
          </div>

          {/* Fix #20: Character counter */}
          {maxLength ? (
            <div
              className={`preview-counter ${remainingChars === 0 ? 'counter-limit' : ''}`}
              aria-label={`${remainingChars} characters remaining`}
            >
              {text.length}/{maxLength}
            </div>
          ) : null}
        </div>
      </div>

      {/* Keyboard Layout */}
      <div className="keyboard-container" role="group" aria-label="Keyboard keys">
        {currentLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="keyboard-row" role="row">
            {row.map((key, colIndex) => {
              const isFocused = rowIndex === focusedRow && colIndex === focusedCol;
              const isSpecial = isSpecialKey(key);
              const isActive = key === 'SHIFT' && (shift || capsLock);
              const isCapsActive = key === 'CAPS' && capsLock;
              // Fix #25: Animation for pressed key
              const isPressed = pressAnimation && key === lastPressedKey;

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    key-btn
                    ${isSpecial ? 'special' : ''}
                    ${isFocused ? 'focused' : ''}
                    ${isActive || isCapsActive ? 'active' : ''}
                    ${isPressed ? 'pressed' : ''}
                    ${key === 'SPACE' ? 'space' : ''}
                    ${key === 'BACK' ? 'back' : ''}
                    ${key === 'ENTER' ? 'enter' : ''}
                  `.trim()}
                  onClick={() => handleKeyPress(key)}
                  data-key={key}
                  aria-label={`Key ${getDisplayKey(key)}`} // Fix #11
                  role="button"
                  tabIndex={-1} // Prevent tab focus (use arrow keys)
                >
                  {getDisplayKey(key)}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Helper Text - Fix #26: Dynamic based on controller */}
      <div className="keyboard-hints" role="status" aria-label="Keyboard controls">
        <span className="hint-item">{hints.navigate}</span>
        <span className="hint-separator">•</span>
        <span className="hint-item">{hints.select}</span>
        <span className="hint-separator">•</span>
        <span className="hint-item">{hints.back}</span>
        <span className="hint-separator">•</span>
        <span className="hint-item">{hints.shift}</span>
        {controllerType !== 'KEYBOARD' && (
          <>
            <span className="hint-separator">•</span>
            <span className="hint-item">{hints.space}</span>
            <span className="hint-separator">•</span>
            <span className="hint-item">{hints.symbols}</span>
          </>
        )}
      </div>

      {/* Close button for accessibility */}
      <button
        className="keyboard-close-btn"
        onClick={handleClose}
        aria-label="Close virtual keyboard"
      >
        ✕ Close (ESC)
      </button>
    </div>
  );
};

export default VirtualKeyboard;
