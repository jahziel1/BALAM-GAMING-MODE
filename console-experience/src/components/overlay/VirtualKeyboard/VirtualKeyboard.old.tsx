import React, { useState, useEffect, useCallback } from 'react';
import './VirtualKeyboard.css';

export interface VirtualKeyboardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string) => void;
    initialValue?: string;
    placeholder?: string;
    inputType?: 'text' | 'email' | 'password' | 'number' | 'url';
    maxLength?: number;
}

// Layout definitions
const QWERTY_LOWER = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'BACK'],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '.', 'ENTER'],
    ['SYMBOLS', 'SPACE', '@', '.com']
];

const QWERTY_UPPER = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'BACK'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '?', 'ENTER'],
    ['SYMBOLS', 'SPACE', '@', '.com']
];

const SYMBOLS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['-', '_', '=', '+', '[', ']', '{', '}', '\\', '|'],
    ['QWERTY', ':', ';', '"', "'", '<', '>', ',', '.', '?'],
    ['/', 'SPACE', 'BACK', 'ENTER']
];

const NUMERIC = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['BACK', '0', 'ENTER']
];

const EMAIL_LAYOUT = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'BACK'],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '_', 'ENTER'],
    ['@', 'SPACE', '.', '.com', '.net']
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialValue = '',
    placeholder = 'Type here...',
    inputType = 'text',
    maxLength
}) => {
    const [text, setText] = useState(initialValue);
    const [shift, setShift] = useState(false);
    const [layoutMode, setLayoutMode] = useState<'qwerty' | 'symbols' | 'numeric' | 'email'>('qwerty');
    const [focusedRow, setFocusedRow] = useState(0);
    const [focusedCol, setFocusedCol] = useState(0);

    // Initialize layout based on input type
    useEffect(() => {
        if (inputType === 'email') setLayoutMode('email');
        else if (inputType === 'number') setLayoutMode('numeric');
        else setLayoutMode('qwerty');
    }, [inputType]);

    // Get current layout
    const getCurrentLayout = useCallback(() => {
        if (layoutMode === 'symbols') return SYMBOLS;
        if (layoutMode === 'numeric') return NUMERIC;
        if (layoutMode === 'email') return EMAIL_LAYOUT;
        return shift ? QWERTY_UPPER : QWERTY_LOWER;
    }, [layoutMode, shift]);

    const currentLayout = getCurrentLayout();

    // Navigation handlers
    const handleNavigation = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
        const maxRow = currentLayout.length - 1;
        const maxCol = currentLayout[focusedRow]?.length - 1 || 0;

        switch (direction) {
            case 'UP':
                setFocusedRow(prev => Math.max(0, prev - 1));
                // Adjust column if new row has fewer keys
                setFocusedCol(prev => Math.min(prev, currentLayout[Math.max(0, focusedRow - 1)]?.length - 1 || 0));
                break;
            case 'DOWN':
                setFocusedRow(prev => Math.min(maxRow, prev + 1));
                setFocusedCol(prev => Math.min(prev, currentLayout[Math.min(maxRow, focusedRow + 1)]?.length - 1 || 0));
                break;
            case 'LEFT':
                setFocusedCol(prev => Math.max(0, prev - 1));
                break;
            case 'RIGHT':
                setFocusedCol(prev => Math.min(maxCol, prev + 1));
                break;
        }
    }, [currentLayout, focusedRow]);

    // Key press handler
    const handleKeyPress = useCallback((key: string) => {
        // Special keys
        if (key === 'BACK') {
            setText(prev => prev.slice(0, -1));
            return;
        }

        if (key === 'ENTER') {
            onSubmit(text);
            onClose();
            return;
        }

        if (key === 'SHIFT') {
            setShift(prev => !prev);
            return;
        }

        if (key === 'SYMBOLS') {
            setLayoutMode(prev => prev === 'symbols' ? 'qwerty' : 'symbols');
            return;
        }

        if (key === 'QWERTY') {
            setLayoutMode('qwerty');
            return;
        }

        if (key === 'SPACE') {
            if (maxLength && text.length >= maxLength) return;
            setText(prev => prev + ' ');
            return;
        }

        // Regular key
        if (maxLength && text.length >= maxLength) return;
        setText(prev => prev + key);

        // Auto-disable shift after typing a letter
        if (shift && key.match(/[a-zA-Z]/)) {
            setShift(false);
        }
    }, [text, shift, maxLength, onSubmit, onClose]);

    // Keyboard event listener
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyboard = (e: KeyboardEvent) => {
            e.preventDefault();

            switch (e.key) {
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
                case 'Enter':
                    const currentKey = currentLayout[focusedRow]?.[focusedCol];
                    if (currentKey) handleKeyPress(currentKey);
                    break;
                case 'Escape':
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [isOpen, handleNavigation, handleKeyPress, currentLayout, focusedRow, focusedCol, onClose]);

    // Gamepad A button is already handled by the keyboard event listener above
    // which maps Enter key to pressing the focused key

    if (!isOpen) return null;

    return (
        <div className="virtual-keyboard-overlay">
            {/* Input Preview */}
            <div className="keyboard-input-preview">
                <input
                    type="text"
                    value={text}
                    placeholder={placeholder}
                    readOnly
                    className="keyboard-input"
                />
                <div className="keyboard-input-actions">
                    <button
                        className="keyboard-action-btn"
                        onClick={() => setText('')}
                        disabled={text.length === 0}
                    >
                        Clear
                    </button>
                    <button
                        className="keyboard-action-btn primary"
                        onClick={() => {
                            onSubmit(text);
                            onClose();
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>

            {/* Keyboard Layout */}
            <div className="keyboard-container">
                {currentLayout.map((row, rowIndex) => (
                    <div key={rowIndex} className="keyboard-row">
                        {row.map((key, colIndex) => {
                            const isFocused = rowIndex === focusedRow && colIndex === focusedCol;
                            const isSpecial = ['BACK', 'ENTER', 'SHIFT', 'SPACE', 'SYMBOLS', 'QWERTY', '@', '.com', '.net'].includes(key);
                            const isActive = (key === 'SHIFT' && shift);

                            let displayKey = key;
                            if (key === 'BACK') displayKey = '⌫';
                            if (key === 'ENTER') displayKey = '↵';
                            if (key === 'SHIFT') displayKey = '⇧';
                            if (key === 'SPACE') displayKey = '___';

                            return (
                                <button
                                    key={`${rowIndex}-${colIndex}`}
                                    className={`key-btn ${isSpecial ? 'special' : ''} ${isFocused ? 'focused' : ''} ${isActive ? 'active' : ''} ${key === 'SPACE' ? 'space' : ''}`}
                                    onClick={() => handleKeyPress(key)}
                                    data-key={key}
                                >
                                    {displayKey}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Helper Text */}
            <div className="keyboard-hints">
                <span className="hint-item">D-Pad: Navigate</span>
                <span className="hint-separator">•</span>
                <span className="hint-item">Ⓐ: Select</span>
                <span className="hint-separator">•</span>
                <span className="hint-item">Ⓑ: Close</span>
            </div>
        </div>
    );
};

export default VirtualKeyboard;
