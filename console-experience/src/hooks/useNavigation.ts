/**
 * @module hooks/useNavigation
 *
 * Centralized navigation state management using reducer pattern.
 * Handles keyboard/gamepad navigation across all UI areas.
 */

import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { inputAdapter } from '../adapters/input/InputAdapter';
import type { ActiveGame } from '../domain/entities/game';
import { NavigationAction } from '../domain/input/NavigationEvent';

/**
 * Focus areas in the application
 */
export type FocusArea =
  | 'SIDEBAR'
  | 'LIBRARY'
  | 'HERO'
  | 'INGAME_MENU'
  | 'VIRTUAL_KEYBOARD'
  | 'QUICK_SETTINGS'
  | 'SEARCH';

interface NavState {
  focusArea: FocusArea;
  isSidebarOpen: boolean;
  isInGameMenuOpen: boolean;
  isQuickSettingsOpen: boolean;
  activeIndex: number;
  sidebarIndex: number;
  gameMenuIndex: number;
  quickSettingsSliderIndex: number;
}

type Action =
  | {
      type: 'MOVE';
      direction: NavigationAction;
      itemCount: number;
      sidebarItemCount: number;
      quickSettingsSliderCount: number;
    }
  | { type: 'SET_FOCUS'; area: FocusArea }
  | { type: 'SET_SIDEBAR'; open: boolean }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'SET_SIDEBAR_INDEX'; index: number }
  | { type: 'SET_GAME_MENU_INDEX'; index: number }
  | { type: 'SET_QUICK_SETTINGS_SLIDER_INDEX'; index: number }
  | { type: 'OPEN_INGAME_MENU' }
  | { type: 'CLOSE_INGAME_MENU' }
  | { type: 'OPEN_QUICK_SETTINGS' }
  | { type: 'CLOSE_QUICK_SETTINGS' };

const initialState: NavState = {
  focusArea: 'LIBRARY', // Start in LIBRARY so games are immediately navigable
  isSidebarOpen: false,
  isInGameMenuOpen: false,
  isQuickSettingsOpen: false,
  activeIndex: 0,
  sidebarIndex: 0,
  gameMenuIndex: 0,
  quickSettingsSliderIndex: 0,
};

function navReducer(state: NavState, action: Action): NavState {
  switch (action.type) {
    case 'SET_FOCUS':
      return { ...state, focusArea: action.area };
    case 'SET_SIDEBAR':
      return { ...state, isSidebarOpen: action.open };
    case 'SET_INDEX':
      return { ...state, activeIndex: action.index };
    case 'SET_SIDEBAR_INDEX':
      return { ...state, sidebarIndex: action.index };
    case 'SET_GAME_MENU_INDEX':
      return { ...state, gameMenuIndex: action.index };
    case 'SET_QUICK_SETTINGS_SLIDER_INDEX':
      return { ...state, quickSettingsSliderIndex: action.index };
    case 'OPEN_INGAME_MENU':
      return { ...state, isInGameMenuOpen: true, gameMenuIndex: 0 };
    case 'CLOSE_INGAME_MENU':
      return { ...state, isInGameMenuOpen: false };
    case 'OPEN_QUICK_SETTINGS':
      return {
        ...state,
        isQuickSettingsOpen: true,
        focusArea: 'QUICK_SETTINGS',
        quickSettingsSliderIndex: 0,
      };
    case 'CLOSE_QUICK_SETTINGS':
      return { ...state, isQuickSettingsOpen: false, focusArea: 'HERO' };

    case 'MOVE': {
      const { direction, itemCount, sidebarItemCount, quickSettingsSliderCount } = action;

      // Quick Settings navigation
      if (state.isQuickSettingsOpen) {
        if (direction === NavigationAction.UP)
          return {
            ...state,
            quickSettingsSliderIndex: Math.max(0, state.quickSettingsSliderIndex - 1),
          };
        if (direction === NavigationAction.DOWN)
          return {
            ...state,
            quickSettingsSliderIndex: Math.min(
              quickSettingsSliderCount - 1,
              state.quickSettingsSliderIndex + 1
            ),
          };
        return state;
      }

      // In-Game Menu navigation
      if (state.isInGameMenuOpen) {
        if (direction === NavigationAction.UP)
          return { ...state, gameMenuIndex: Math.max(0, state.gameMenuIndex - 1) };
        if (direction === NavigationAction.DOWN)
          return { ...state, gameMenuIndex: Math.min(2, state.gameMenuIndex + 1) };
        return state;
      }

      // Virtual Keyboard & Search: handled internally by components
      if (state.focusArea === 'VIRTUAL_KEYBOARD' || state.focusArea === 'SEARCH') {
        return state;
      }

      // Sidebar navigation
      if (state.isSidebarOpen) {
        if (direction === NavigationAction.UP)
          return { ...state, sidebarIndex: Math.max(0, state.sidebarIndex - 1) };
        if (direction === NavigationAction.DOWN)
          return { ...state, sidebarIndex: Math.min(sidebarItemCount - 1, state.sidebarIndex + 1) };
        if (direction === NavigationAction.RIGHT) return { ...state, isSidebarOpen: false };
        if (direction === NavigationAction.LEFT) return state;
        return state;
      }

      // Main library navigation (Steam Big Picture style)
      switch (direction) {
        case NavigationAction.UP:
          if (state.focusArea === 'LIBRARY') return { ...state, focusArea: 'HERO' };
          return state;
        case NavigationAction.DOWN:
          if (state.focusArea === 'HERO') return { ...state, focusArea: 'LIBRARY' };
          return state;
        case NavigationAction.LEFT:
          // Stop at first item (no wrap-around, like Steam)
          if (state.activeIndex > 0) return { ...state, activeIndex: state.activeIndex - 1 };
          return state; // Stay at first item
        case NavigationAction.RIGHT:
          // Stop at last item (no wrap-around, like Steam)
          if (state.activeIndex < itemCount - 1)
            return { ...state, activeIndex: state.activeIndex + 1, focusArea: 'LIBRARY' };
          return state; // Stay at last item
        default:
          return state;
      }
    }
    default:
      return state;
  }
}

/**
 * Custom hook for application navigation
 *
 * Centralized navigation state management using reducer pattern.
 * Handles keyboard, gamepad, and mouse navigation across all UI areas:
 * - Library grid navigation
 * - Sidebar menu navigation
 * - In-game menu navigation
 * - Quick settings navigation
 * - Virtual keyboard focus
 *
 * ## Navigation Flow
 * 1. Listens to input adapter navigation events
 * 2. Dispatches actions to reducer based on current focus area
 * 3. Updates state and calls appropriate callbacks
 * 4. Manages overlay states (sidebar, in-game menu, quick settings)
 *
 * ## Key Features
 * - Debounced navigation to prevent rapid firing
 * - Context-aware CONFIRM/BACK actions
 * - Auto-open in-game menu on window focus (when game running)
 * - Quick settings toggle (Select + Start)
 *
 * @param itemCount - Number of items in library grid
 * @param sidebarItemCount - Number of items in sidebar menu
 * @param onLaunch - Callback when game is launched from library
 * @param onSidebarSelect - Callback when sidebar item is selected
 * @param onQuit - Callback when quit is selected
 * @param activeRunningGame - Currently running game (if any)
 * @param isDisabled - Whether navigation is disabled
 * @param onQuickSettingsAdjust - Callback for quick settings slider adjustment
 * @returns Navigation state and control functions
 *
 * @example
 * ```tsx
 * const navigation = useNavigation(
 *   games.length,
 *   menuItems.length,
 *   handleLaunch,
 *   handleSidebarAction,
 *   handleQuit,
 *   activeRunningGame
 * );
 *
 * <GameLibrary
 *   activeIndex={navigation.activeIndex}
 *   focusArea={navigation.focusArea}
 * />
 * ```
 */
export const useNavigation = (
  itemCount: number,
  sidebarItemCount: number,
  onLaunch: (index: number) => void,
  onSidebarSelect: (index: number) => void,
  onQuit: () => void,
  activeRunningGame: ActiveGame | null,
  isDisabled = false,
  onQuickSettingsAdjust?: (direction: number) => void
) => {
  const [state, dispatch] = useReducer(navReducer, initialState);
  const lastActionTime = useRef(0);

  const callbacks = useRef({ onLaunch, onSidebarSelect, onQuit });
  useEffect(() => {
    callbacks.current = { onLaunch, onSidebarSelect, onQuit };
  }, [onLaunch, onSidebarSelect, onQuit]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleAction = useCallback(
    (navAction: NavigationAction) => {
      const currentState = stateRef.current;

      // isDisabled blocks library navigation but NOT virtual keyboard navigation
      if (isDisabled && currentState.focusArea !== 'VIRTUAL_KEYBOARD') {
        return;
      }
      const now = Date.now();
      if (now - lastActionTime.current < 75) return;
      lastActionTime.current = now;

      // Handle CONFIRM action
      if (navAction === NavigationAction.CONFIRM) {
        if (currentState.isQuickSettingsOpen) return;
        if (currentState.isInGameMenuOpen) {
          if (currentState.gameMenuIndex === 0) {
            dispatch({ type: 'CLOSE_INGAME_MENU' });
            void getCurrentWindow().hide();
          } else if (currentState.gameMenuIndex === 1) {
            dispatch({ type: 'CLOSE_INGAME_MENU' });
            dispatch({ type: 'SET_FOCUS', area: 'LIBRARY' });
            void getCurrentWindow().show();
          } else if (currentState.gameMenuIndex === 2) {
            callbacks.current.onQuit();
          }
        } else if (currentState.focusArea === 'SEARCH') {
          // Dispatch Enter key for search overlay
          inputAdapter.dispatchKeyEvent('Enter');
          return;
        } else if (currentState.focusArea === 'VIRTUAL_KEYBOARD') {
          // Dispatch Enter key for virtual keyboard
          inputAdapter.dispatchKeyEvent('Enter');
          return;
        } else if (currentState.isSidebarOpen) {
          callbacks.current.onSidebarSelect(currentState.sidebarIndex);
        } else {
          callbacks.current.onLaunch(currentState.activeIndex);
        }
        return;
      }

      // Handle BACK action
      if (
        navAction === NavigationAction.BACK ||
        (navAction === NavigationAction.MENU && activeRunningGame)
      ) {
        if (currentState.isQuickSettingsOpen) {
          dispatch({ type: 'CLOSE_QUICK_SETTINGS' });
        } else if (currentState.focusArea === 'SEARCH') {
          inputAdapter.dispatchKeyEvent('Escape');
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        } else if (currentState.focusArea === 'VIRTUAL_KEYBOARD') {
          inputAdapter.dispatchKeyEvent('Escape');
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        } else if (currentState.isSidebarOpen) {
          dispatch({ type: 'SET_SIDEBAR', open: false });
        } else if (currentState.isInGameMenuOpen) {
          dispatch({ type: 'CLOSE_INGAME_MENU' });
          void getCurrentWindow().hide();
        } else if (activeRunningGame) {
          dispatch({ type: 'OPEN_INGAME_MENU' });
        } else {
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        }
        return;
      }

      // Handle QUICK_SETTINGS toggle
      if (navAction === NavigationAction.QUICK_SETTINGS) {
        if (currentState.isQuickSettingsOpen) {
          dispatch({ type: 'CLOSE_QUICK_SETTINGS' });
        } else if (!currentState.isInGameMenuOpen) {
          dispatch({ type: 'OPEN_QUICK_SETTINGS' });
        }
        return;
      }

      // Handle MENU action
      if (navAction === NavigationAction.MENU && !activeRunningGame) {
        if (currentState.isQuickSettingsOpen) return;
        if (currentState.focusArea === 'VIRTUAL_KEYBOARD') return;
        if (currentState.focusArea === 'SEARCH') return;
        dispatch({ type: 'SET_SIDEBAR', open: !currentState.isSidebarOpen });
        return;
      }

      // Search Overlay: Convert gamepad UP/DOWN to keyboard events for cmdk navigation
      if (currentState.focusArea === 'SEARCH') {
        if (navAction === NavigationAction.UP) {
          inputAdapter.dispatchKeyEvent('ArrowUp');
        } else if (navAction === NavigationAction.DOWN) {
          inputAdapter.dispatchKeyEvent('ArrowDown');
        }
        return;
      }

      // Virtual Keyboard: Convert gamepad inputs to keyboard events (Steam-style)
      if (currentState.focusArea === 'VIRTUAL_KEYBOARD') {
        const keyMap: Record<NavigationAction, string> = {
          // Navigation
          [NavigationAction.UP]: 'ArrowUp',
          [NavigationAction.DOWN]: 'ArrowDown',
          [NavigationAction.LEFT]: 'ArrowLeft',
          [NavigationAction.RIGHT]: 'ArrowRight',
          // Steam-style shortcuts
          [NavigationAction.VK_BACKSPACE]: 'Backspace',
          [NavigationAction.VK_SHIFT]: 'Shift',
          [NavigationAction.VK_SPACE]: ' ',
          [NavigationAction.VK_SYMBOLS]: 'F1', // F1 para toggle símbolos
          // Unused
          [NavigationAction.CONFIRM]: '',
          [NavigationAction.BACK]: '',
          [NavigationAction.MENU]: '',
          [NavigationAction.QUICK_SETTINGS]: '',
        };
        const key = keyMap[navAction];
        if (key) {
          inputAdapter.dispatchKeyEvent(key);
        }
        return;
      }

      // Quick Settings slider adjustment
      if (
        currentState.isQuickSettingsOpen &&
        (navAction === NavigationAction.LEFT || navAction === NavigationAction.RIGHT)
      ) {
        const direction = navAction === NavigationAction.LEFT ? -1 : 1;
        onQuickSettingsAdjust?.(direction);
      }

      // Standard movement
      dispatch({
        type: 'MOVE',
        direction: navAction,
        itemCount,
        sidebarItemCount,
        quickSettingsSliderCount: 4,
      });
    },
    [itemCount, sidebarItemCount, activeRunningGame, isDisabled, onQuickSettingsAdjust]
  );

  // Listen to navigation events from input adapter
  useEffect(() => {
    const unsubscribe = inputAdapter.onNavigationEvent((event) => {
      handleAction(event.action);
    });

    return unsubscribe;
  }, [handleAction]);

  // Listen for window focus to open in-game menu
  useEffect(() => {
    const unlisten = getCurrentWindow().listen('tauri://focus', () => {
      if (activeRunningGame) dispatch({ type: 'OPEN_INGAME_MENU' });
    });

    return () => {
      void unlisten.then((f) => f());
    };
  }, [activeRunningGame]);

  return {
    ...state,
    setFocusArea: (area: FocusArea) => dispatch({ type: 'SET_FOCUS', area }),
    setSidebarOpen: (open: boolean) => dispatch({ type: 'SET_SIDEBAR', open }),
    setInGameMenuOpen: (open: boolean) =>
      dispatch(open ? { type: 'OPEN_INGAME_MENU' } : { type: 'CLOSE_INGAME_MENU' }),
    setQuickSettingsOpen: (open: boolean) =>
      dispatch(open ? { type: 'OPEN_QUICK_SETTINGS' } : { type: 'CLOSE_QUICK_SETTINGS' }),
    setActiveIndex: (index: number) => dispatch({ type: 'SET_INDEX', index }),
    setSidebarIndex: (index: number) => dispatch({ type: 'SET_SIDEBAR_INDEX', index }),
    setQuickSettingsSliderIndex: (index: number) =>
      dispatch({ type: 'SET_QUICK_SETTINGS_SLIDER_INDEX', index }),
  };
};
