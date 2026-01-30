/**
 * Domain: Virtual Keyboard State
 *
 * Defines the state and behavior of the virtual keyboard.
 * Pure domain logic without UI concerns.
 */

export interface VirtualKeyboardState {
    isOpen: boolean;
    focusedRow: number;
    focusedCol: number;
    text: string;
    shift: boolean;
    layoutMode: KeyboardLayoutMode;
}

export enum KeyboardLayoutMode {
    QWERTY = 'qwerty',
    SYMBOLS = 'symbols',
    NUMERIC = 'numeric',
    EMAIL = 'email'
}

export const createInitialKeyboardState = (): VirtualKeyboardState => ({
    isOpen: false,
    focusedRow: 0,
    focusedCol: 0,
    text: '',
    shift: false,
    layoutMode: KeyboardLayoutMode.QWERTY
});

export interface KeyboardNavigationCommand {
    type: 'MOVE' | 'PRESS_KEY' | 'TOGGLE_SHIFT' | 'CHANGE_LAYOUT' | 'CLEAR' | 'SUBMIT';
    direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
    key?: string;
    layout?: KeyboardLayoutMode;
}

/**
 * Pure domain logic for keyboard navigation
 */
export const navigateKeyboard = (
    state: VirtualKeyboardState,
    command: KeyboardNavigationCommand,
    currentLayout: string[][]
): VirtualKeyboardState => {
    switch (command.type) {
        case 'MOVE': {
            if (!command.direction) return state;

            const maxRow = currentLayout.length - 1;
            const currentMaxCol = currentLayout[state.focusedRow]?.length - 1 || 0;

            let newRow = state.focusedRow;
            let newCol = state.focusedCol;

            switch (command.direction) {
                case 'UP':
                    newRow = Math.max(0, state.focusedRow - 1);
                    newCol = Math.min(state.focusedCol, currentLayout[newRow]?.length - 1 || 0);
                    break;
                case 'DOWN':
                    newRow = Math.min(maxRow, state.focusedRow + 1);
                    newCol = Math.min(state.focusedCol, currentLayout[newRow]?.length - 1 || 0);
                    break;
                case 'LEFT':
                    newCol = Math.max(0, state.focusedCol - 1);
                    break;
                case 'RIGHT':
                    newCol = Math.min(currentMaxCol, state.focusedCol + 1);
                    break;
            }

            return { ...state, focusedRow: newRow, focusedCol: newCol };
        }

        case 'TOGGLE_SHIFT':
            return { ...state, shift: !state.shift };

        case 'CHANGE_LAYOUT':
            if (!command.layout) return state;
            return { ...state, layoutMode: command.layout };

        case 'CLEAR':
            return { ...state, text: '' };

        default:
            return state;
    }
};
