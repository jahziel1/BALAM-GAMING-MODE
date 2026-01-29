import { useReducer, useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

export type NavAction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK' | 'MENU';
export type FocusArea = 'SIDEBAR' | 'LIBRARY' | 'HERO' | 'INGAME_MENU';

interface NavState {
    focusArea: FocusArea;
    isSidebarOpen: boolean;
    isInGameMenuOpen: boolean;
    activeIndex: number;
    sidebarIndex: number;
    gameMenuIndex: number;
    gamepadInfo: string;
}

type Action =
    | { type: 'MOVE'; direction: NavAction; itemCount: number; sidebarItemCount: number }
    | { type: 'SET_FOCUS'; area: FocusArea }
    | { type: 'SET_SIDEBAR'; open: boolean }
    | { type: 'SET_INDEX'; index: number }
    | { type: 'SET_SIDEBAR_INDEX'; index: number }
    | { type: 'SET_GAME_MENU_INDEX'; index: number }
    | { type: 'SET_GAMEPAD_INFO'; info: string }
    | { type: 'OPEN_INGAME_MENU' }
    | { type: 'CLOSE_INGAME_MENU' };

const initialState: NavState = {
    focusArea: 'HERO',
    isSidebarOpen: false,
    isInGameMenuOpen: false,
    activeIndex: 0,
    sidebarIndex: 0,
    gameMenuIndex: 0,
    gamepadInfo: "Waiting for Input...",
};

function navReducer(state: NavState, action: Action): NavState {
    switch (action.type) {
        case 'SET_FOCUS': return { ...state, focusArea: action.area };
        case 'SET_SIDEBAR': return { ...state, isSidebarOpen: action.open };
        case 'SET_INDEX': return { ...state, activeIndex: action.index };
        case 'SET_SIDEBAR_INDEX': return { ...state, sidebarIndex: action.index };
        case 'SET_GAME_MENU_INDEX': return { ...state, gameMenuIndex: action.index };
        case 'SET_GAMEPAD_INFO': return { ...state, gamepadInfo: action.info };
        case 'OPEN_INGAME_MENU': return { ...state, isInGameMenuOpen: true, gameMenuIndex: 0 };
        case 'CLOSE_INGAME_MENU': return { ...state, isInGameMenuOpen: false };

        case 'MOVE': {
            const { direction, itemCount, sidebarItemCount } = action;

            if (state.isInGameMenuOpen) {
                if (direction === 'UP') return { ...state, gameMenuIndex: Math.max(0, state.gameMenuIndex - 1) };
                if (direction === 'DOWN') return { ...state, gameMenuIndex: Math.min(2, state.gameMenuIndex + 1) };
                return state;
            }

            if (state.isSidebarOpen) {
                if (direction === 'UP') return { ...state, sidebarIndex: Math.max(0, state.sidebarIndex - 1) };
                if (direction === 'DOWN') return { ...state, sidebarIndex: Math.min(sidebarItemCount - 1, state.sidebarIndex + 1) };
                if (direction === 'RIGHT') return { ...state, isSidebarOpen: false };
                return state;
            }

            // Main Navigation
            switch (direction) {
                case 'UP':
                    if (state.focusArea === 'LIBRARY') return { ...state, focusArea: 'HERO' };
                    return state;
                case 'DOWN':
                    if (state.focusArea === 'HERO') return { ...state, focusArea: 'LIBRARY' };
                    return state;
                case 'LEFT':
                    if (state.activeIndex > 0) return { ...state, activeIndex: state.activeIndex - 1 };
                    return { ...state, isSidebarOpen: true };
                case 'RIGHT':
                    if (state.activeIndex < itemCount - 1) return { ...state, activeIndex: state.activeIndex + 1, focusArea: 'LIBRARY' };
                    return state;
                default: return state;
            }
        }
        default: return state;
    }
}

export const useNavigation = (
    itemCount: number,
    sidebarItemCount: number,
    onLaunch: (index: number) => void,
    onQuit: () => void,
    activeRunningGame: any
) => {
    const [state, dispatch] = useReducer(navReducer, initialState);
    const lastActionTime = useRef(0);

    // Ref for callbacks to avoid re-running effect on every render
    const callbacks = useRef({ onLaunch, onQuit });
    useEffect(() => { callbacks.current = { onLaunch, onQuit }; }, [onLaunch, onQuit]);

    const handleAction = useCallback((navAction: NavAction, source: string = 'UNKNOWN') => {
        const now = Date.now();
        if (now - lastActionTime.current < 120) return;
        lastActionTime.current = now;

        if (source !== 'UNKNOWN') {
            dispatch({ type: 'SET_GAMEPAD_INFO', info: `Input: ${source} (${navAction})` });
        }

        // Logic requiring side effects or external state
        if (navAction === 'CONFIRM') {
            if (state.isInGameMenuOpen) {
                if (state.gameMenuIndex === 0) { // Resume
                    dispatch({ type: 'CLOSE_INGAME_MENU' });
                    getCurrentWindow().hide();
                } else if (state.gameMenuIndex === 1) { // Library
                    dispatch({ type: 'CLOSE_INGAME_MENU' });
                    dispatch({ type: 'SET_FOCUS', area: 'LIBRARY' });
                    getCurrentWindow().show();
                } else if (state.gameMenuIndex === 2) { // Quit
                    callbacks.current.onQuit();
                }
            } else if (state.isSidebarOpen) {
                // Sidebar actions handled by App via state.sidebarIndex
                dispatch({ type: 'SET_SIDEBAR', open: false });
            } else {
                callbacks.current.onLaunch(state.activeIndex);
            }
            return;
        }

        if (navAction === 'BACK' || (navAction === 'MENU' && activeRunningGame)) {
            if (state.isInGameMenuOpen) {
                dispatch({ type: 'CLOSE_INGAME_MENU' });
                getCurrentWindow().hide();
            } else if (activeRunningGame) {
                dispatch({ type: 'OPEN_INGAME_MENU' });
            } else if (state.isSidebarOpen) {
                dispatch({ type: 'SET_SIDEBAR', open: false });
            } else {
                dispatch({ type: 'SET_FOCUS', area: 'HERO' });
            }
            return;
        }

        if (navAction === 'MENU' && !activeRunningGame) {
            dispatch({ type: 'SET_SIDEBAR', open: !state.isSidebarOpen });
            return;
        }

        // Standard Movement
        dispatch({ type: 'MOVE', direction: navAction, itemCount, sidebarItemCount });
    }, [state, itemCount, sidebarItemCount, activeRunningGame]);

    useEffect(() => {
        const unlistenNav = listen<string>('nav', (e) => {
            handleAction(e.payload as NavAction, 'NATIVE');
        });

        const unlistenWake = listen('tauri://focus', () => {
            if (activeRunningGame) dispatch({ type: 'OPEN_INGAME_MENU' });
        });

        let raf: number;
        let lastAxis = 0;
        const btnStates = new Array(20).fill(false);

        const checkInput = (time: number) => {
            const gamepads = navigator.getGamepads();
            const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
            if (gp) {
                gp.buttons.forEach((b, i) => {
                    if (b.pressed && !btnStates[i]) {
                        btnStates[i] = true;
                        const map: Record<number, NavAction> = {
                            0: 'CONFIRM', 1: 'BACK', 9: 'MENU', 8: 'MENU', 16: 'MENU',
                            12: 'UP', 13: 'DOWN', 14: 'LEFT', 15: 'RIGHT'
                        };
                        if (map[i]) handleAction(map[i], 'WEB');
                    } else if (!b.pressed) btnStates[i] = false;
                });

                if (time - lastAxis > 200) {
                    if (gp.axes[1] < -0.5) { handleAction('UP', 'WEB'); lastAxis = time; }
                    else if (gp.axes[1] > 0.5) { handleAction('DOWN', 'WEB'); lastAxis = time; }
                    else if (gp.axes[0] > 0.5) { handleAction('RIGHT', 'WEB'); lastAxis = time; }
                    else if (gp.axes[0] < -0.5) { handleAction('LEFT', 'WEB'); lastAxis = time; }
                }
            }
            raf = requestAnimationFrame(checkInput);
        };
        raf = requestAnimationFrame(checkInput);

        const onKey = (e: KeyboardEvent) => {
            const keys: Record<string, NavAction> = {
                'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
                'Enter': 'CONFIRM', 'Escape': 'MENU', 'Backspace': 'BACK'
            };
            if (keys[e.key]) handleAction(keys[e.key], 'KEYBOARD');
        };
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('keydown', onKey);
            cancelAnimationFrame(raf);
            unlistenNav.then(f => f());
            unlistenWake.then(f => f());
        };
    }, [handleAction, activeRunningGame]);

    return {
        ...state,
        setFocusArea: (area: FocusArea) => dispatch({ type: 'SET_FOCUS', area }),
        setSidebarOpen: (open: boolean) => dispatch({ type: 'SET_SIDEBAR', open }),
        setInGameMenuOpen: (open: boolean) => dispatch(open ? { type: 'OPEN_INGAME_MENU' } : { type: 'CLOSE_INGAME_MENU' }),
        setActiveIndex: (index: number) => dispatch({ type: 'SET_INDEX', index }),
        setSidebarIndex: (index: number) => dispatch({ type: 'SET_SIDEBAR_INDEX', index }),
    };
};
