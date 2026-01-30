/**
 * Virtual Keyboard Layouts
 *
 * Defines keyboard layouts for different input types.
 * Separated for clarity and maintainability.
 */

export type KeyboardLayout = string[][];

export const QWERTY_LOWER: KeyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'BACK'],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '-', 'ENTER'],
    ['SYMBOLS', '@', 'SPACE', '.', '.com']
];

export const QWERTY_UPPER: KeyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'BACK'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '_', 'ENTER'],
    ['SYMBOLS', '@', 'SPACE', '!', '?']
];

export const SYMBOLS: KeyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['-', '_', '=', '+', '[', ']', '{', '}', '\\', 'BACK'],
    [':', ';', '"', "'", '<', '>', ',', '.', '/', 'ENTER'],
    ['QWERTY', 'SPACE', '?', '|']
];

export const NUMERIC: KeyboardLayout = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['BACK', '0', 'ENTER']
];

export const EMAIL_LAYOUT: KeyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'BACK'],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '_', 'ENTER'],
    ['@', 'SPACE', '.', '.com', '.net']
];

export type LayoutMode = 'qwerty' | 'symbols' | 'numeric' | 'email';

export const getLayout = (mode: LayoutMode, shift: boolean): KeyboardLayout => {
    switch (mode) {
        case 'symbols':
            return SYMBOLS;
        case 'numeric':
            return NUMERIC;
        case 'email':
            return EMAIL_LAYOUT;
        case 'qwerty':
        default:
            return shift ? QWERTY_UPPER : QWERTY_LOWER;
    }
};

export const getDisplayKey = (key: string): string => {
    const displayMap: Record<string, string> = {
        'BACK': '⌫',
        'ENTER': '↵',
        'SHIFT': '⇧',
        'SPACE': '___'
    };
    return displayMap[key] || key;
};

export const isSpecialKey = (key: string): boolean => {
    return ['BACK', 'ENTER', 'SHIFT', 'SPACE', 'SYMBOLS', 'QWERTY', '@', '.com', '.net'].includes(key);
};
