/**
 * Domain: Navigation Events
 *
 * Defines navigation actions that can be performed regardless of input device.
 * These are device-agnostic domain events.
 */

export enum NavigationAction {
    UP = 'UP',
    DOWN = 'DOWN',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
    CONFIRM = 'CONFIRM',
    BACK = 'BACK',
    MENU = 'MENU',
    QUICK_SETTINGS = 'QUICK_SETTINGS',
    // Virtual Keyboard shortcuts (Steam-style)
    VK_BACKSPACE = 'VK_BACKSPACE',     // L Bumper
    VK_SHIFT = 'VK_SHIFT',             // R Bumper
    VK_SPACE = 'VK_SPACE',             // Left Trigger
    VK_SYMBOLS = 'VK_SYMBOLS'          // Right Trigger
}

export interface NavigationEvent {
    action: NavigationAction;
    source: 'GAMEPAD' | 'KEYBOARD' | 'MOUSE' | 'NATIVE';
    timestamp: number;
}

export const createNavigationEvent = (
    action: NavigationAction,
    source: NavigationEvent['source']
): NavigationEvent => ({
    action,
    source,
    timestamp: Date.now()
});
