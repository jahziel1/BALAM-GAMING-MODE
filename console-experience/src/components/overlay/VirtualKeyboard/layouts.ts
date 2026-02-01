/**
 * Virtual Keyboard Layouts
 *
 * Defines keyboard layouts for different input types.
 * Separated for clarity and maintainability.
 *
 * FIXES:
 * - #10: Normalized layouts (consistent column counts)
 * - #17: Email layout with @ in accessible position
 * - #18: Numeric layout with decimal point
 * - #29: Constants instead of magic numbers
 */

// Special key constants
export const SPECIAL_KEYS = {
  BACK: 'BACK',
  ENTER: 'ENTER',
  SHIFT: 'SHIFT',
  CAPS: 'CAPS',
  SPACE: 'SPACE',
  SYMBOLS: 'SYMBOLS',
  QWERTY: 'QWERTY',
  TAB: 'TAB',
} as const;

export type KeyboardLayout = string[][];

/**
 * QWERTY lowercase layout (normalized to 10 columns)
 * Fix #10: All rows have same width for consistent layout
 */
export const QWERTY_LOWER: KeyboardLayout = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'BACK'],
  ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '-', 'ENTER'],
  ['SYMBOLS', '@', '.', 'SPACE', '!', '?', '.com', '_', '/', 'CAPS'], // Fix #10: Normalized to 10 keys
];

/**
 * QWERTY uppercase layout (normalized to 10 columns)
 */
export const QWERTY_UPPER: KeyboardLayout = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'BACK'],
  ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '_', 'ENTER'],
  ['SYMBOLS', '@', '.', 'SPACE', '!', '?', '.COM', '-', '/', 'CAPS'], // Fix #10: Normalized to 10 keys
];

/**
 * Symbols layout (normalized to 10 columns)
 */
export const SYMBOLS: KeyboardLayout = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
  ['-', '_', '=', '+', '[', ']', '{', '}', '\\', 'BACK'],
  [':', ';', '"', "'", '<', '>', ',', '.', '/', 'ENTER'],
  ['QWERTY', '~', '`', 'SPACE', '?', '|', '€', '£', '¥', 'CAPS'], // Fix #10: Normalized to 10 keys
];

/**
 * Numeric layout with decimal point (Fix #18)
 * Optimized for number entry
 */
export const NUMERIC: KeyboardLayout = [
  ['1', '2', '3', 'BACK'],
  ['4', '5', '6', '.'], // Fix #18: Added decimal point
  ['7', '8', '9', '-'],
  ['0', '00', '.', 'ENTER'],
];

/**
 * Email layout with @ in row 2 for easy access (Fix #17)
 * Optimized for email addresses
 */
export const EMAIL_LAYOUT: KeyboardLayout = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', '@', 't', 'y', 'u', 'i', 'o', 'p'], // Fix #17: @ in row 2, column 4
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'BACK'],
  ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '_', 'ENTER'],
  ['.com', '.net', '.', 'SPACE', '-', '@', '.org', '.edu', '.gov', 'CAPS'], // Fix #10: Normalized, Fix #17: Extra @
];

/**
 * URL layout optimized for web addresses
 */
export const URL_LAYOUT: KeyboardLayout = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'BACK'],
  ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '/', 'ENTER'],
  ['https://', 'www.', '.', 'SPACE', '-', '_', '.com', '.net', '.org', 'CAPS'],
];

export type LayoutMode = 'qwerty' | 'symbols' | 'numeric' | 'email' | 'url';

/**
 * Get keyboard layout based on mode and shift state
 */
export const getLayout = (mode: LayoutMode, shift: boolean, capsLock = false): KeyboardLayout => {
  // Caps lock overrides shift for letter layouts
  const shouldUppercase = capsLock || shift;

  switch (mode) {
    case 'symbols':
      return SYMBOLS;
    case 'numeric':
      return NUMERIC;
    case 'email':
      return EMAIL_LAYOUT;
    case 'url':
      return URL_LAYOUT;
    case 'qwerty':
    default:
      return shouldUppercase ? QWERTY_UPPER : QWERTY_LOWER;
  }
};

/**
 * Get display representation of a key
 */
export const getDisplayKey = (key: string): string => {
  const displayMap: Record<string, string> = {
    BACK: '⌫',
    ENTER: '↵',
    SHIFT: '⇧',
    CAPS: '⇪',
    SPACE: '___',
    TAB: '⇥',
  };
  return displayMap[key] || key;
};

/**
 * Check if a key is special (not a regular character)
 */
export const isSpecialKey = (key: string): boolean => {
  const specialKeys = [
    'BACK',
    'ENTER',
    'SHIFT',
    'CAPS',
    'SPACE',
    'SYMBOLS',
    'QWERTY',
    'TAB',
    '@',
    '.com',
    '.COM',
    '.net',
    '.org',
    '.edu',
    '.gov',
    'https://',
    'www.',
    '00',
  ];
  return specialKeys.includes(key);
};
