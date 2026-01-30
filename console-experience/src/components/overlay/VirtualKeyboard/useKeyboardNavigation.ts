/**
 * Hook: useKeyboardNavigation
 *
 * Manages internal navigation and text input logic for virtual keyboard.
 * Extracted from VirtualKeyboard component for Single Responsibility.
 */

import { useState, useCallback, useEffect } from 'react';
import { LayoutMode, getLayout } from './layouts';

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
    onTextChange
}: UseKeyboardNavigationProps) => {
    const [text, setText] = useState(initialValue);
    const [shift, setShift] = useState(false);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('qwerty');

    // Helper to update text and notify parent
    const updateText = useCallback((newText: string) => {
        setText(newText);
        onTextChange?.(newText);
    }, [onTextChange]);
    const [focusedRow, setFocusedRow] = useState(0);
    const [focusedCol, setFocusedCol] = useState(0);

    // Initialize layout based on input type
    useEffect(() => {
        if (inputType === 'email') setLayoutMode('email');
        else if (inputType === 'number') setLayoutMode('numeric');
        else setLayoutMode('qwerty');
    }, [inputType]);

    // Reset text when initialValue changes
    useEffect(() => {
        setText(initialValue);
    }, [initialValue]);

    const currentLayout = getLayout(layoutMode, shift);

    const handleNavigation = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
        const maxRow = currentLayout.length - 1;
        const maxCol = currentLayout[focusedRow]?.length - 1 || 0;

        switch (direction) {
            case 'UP':
                setFocusedRow(prev => Math.max(0, prev - 1));
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

    const handleKeyPress = useCallback((key: string) => {
        // Special keys
        if (key === 'BACK') {
            updateText(text.slice(0, -1));
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
            updateText(text + ' ');
            return;
        }

        // Regular key
        if (maxLength && text.length >= maxLength) return;
        updateText(text + key);

        // Auto-disable shift after typing a letter
        if (shift && key.match(/[a-zA-Z]/)) {
            setShift(false);
        }
    }, [text, shift, maxLength, onSubmit, onClose, updateText]);

    // Keyboard event listener for physical keyboard and gamepad events
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyboard = (e: KeyboardEvent) => {
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

                // Actions
                case 'Enter':
                    const currentKey = currentLayout[focusedRow]?.[focusedCol];
                    if (currentKey) handleKeyPress(currentKey);
                    break;
                case 'Escape':
                    onClose();
                    break;

                // Steam-style shortcuts (gamepad bumpers/triggers)
                case 'Backspace':
                    handleKeyPress('BACK');
                    break;
                case 'Shift':
                    handleKeyPress('SHIFT');
                    break;
                case ' ':
                    handleKeyPress('SPACE');
                    break;
                case 'F1':
                    handleKeyPress('SYMBOLS');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [isOpen, handleNavigation, handleKeyPress, currentLayout, focusedRow, focusedCol, onClose]);

    return {
        text,
        setText,
        shift,
        layoutMode,
        currentLayout,
        focusedRow,
        focusedCol,
        handleKeyPress,
        clearText: () => updateText('')
    };
};
