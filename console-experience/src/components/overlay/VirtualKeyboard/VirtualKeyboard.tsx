/**
 * Component: VirtualKeyboard (Refactored)
 *
 * Pure presentational component for virtual keyboard.
 * All logic delegated to useKeyboardNavigation hook.
 */

import React from 'react';
import './VirtualKeyboard.css';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { getDisplayKey, isSpecialKey } from './layouts';

export interface VirtualKeyboardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string) => void;
    initialValue?: string;
    placeholder?: string;
    inputType?: 'text' | 'email' | 'password' | 'number' | 'url';
    maxLength?: number;
    onTextChange?: (text: string) => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = (props) => {
    const {
        isOpen,
        placeholder = 'Type here...',
    } = props;

    const {
        text,
        shift,
        currentLayout,
        focusedRow,
        focusedCol,
        handleKeyPress,
        clearText
    } = useKeyboardNavigation(props);

    if (!isOpen) return null;

    return (
        <div className="virtual-keyboard-overlay">
            {/* Compact Text Preview */}
            <div className="keyboard-input-preview" style={{ padding: '12px 20px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.85rem'
                }}>
                    <span style={{
                        color: 'var(--color-text-tertiary)',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        minWidth: '60px'
                    }}>
                        Typing:
                    </span>
                    <div style={{
                        flex: 1,
                        color: 'var(--color-text-primary)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {text || <span style={{ color: 'var(--color-text-tertiary)' }}>{placeholder}</span>}
                    </div>
                    <button
                        className="keyboard-action-btn"
                        onClick={clearText}
                        disabled={text.length === 0}
                        style={{ padding: '0 16px', height: '36px', fontSize: '0.85rem' }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Keyboard Layout */}
            <div className="keyboard-container">
                {currentLayout.map((row, rowIndex) => (
                    <div key={rowIndex} className="keyboard-row">
                        {row.map((key, colIndex) => {
                            const isFocused = rowIndex === focusedRow && colIndex === focusedCol;
                            const isSpecial = isSpecialKey(key);
                            const isActive = (key === 'SHIFT' && shift);

                            return (
                                <button
                                    key={`${rowIndex}-${colIndex}`}
                                    className={`key-btn ${isSpecial ? 'special' : ''} ${isFocused ? 'focused' : ''} ${isActive ? 'active' : ''} ${key === 'SPACE' ? 'space' : ''}`}
                                    onClick={() => handleKeyPress(key)}
                                    data-key={key}
                                >
                                    {getDisplayKey(key)}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Helper Text - Steam Style Controls */}
            <div className="keyboard-hints">
                <span className="hint-item">D-Pad: Navigate</span>
                <span className="hint-separator">•</span>
                <span className="hint-item">Ⓐ: Select</span>
                <span className="hint-separator">•</span>
                <span className="hint-item">LB: Backspace</span>
                <span className="hint-separator">•</span>
                <span className="hint-item">RB: Shift</span>
                <span className="hint-separator">•</span>
                <span className="hint-item">LT: Space</span>
                <span className="hint-separator">•</span>
                <span className="hint-item">RT: Symbols</span>
            </div>
        </div>
    );
};

export default VirtualKeyboard;
