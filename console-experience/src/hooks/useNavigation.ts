/**
 * @module hooks/useNavigation
 *
 * Centralized navigation state management using reducer pattern.
 * Handles keyboard/gamepad navigation across all UI areas.
 */

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { inputAdapter } from '../adapters/input/InputAdapter';
import { useAppStore } from '../application/providers/StoreProvider';
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
  | 'SEARCH'
  | 'OVERLAY';

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
      /** Flat start-index of each carousel, e.g. [0, 10, 25]. Empty = no carousel structure. */
      carouselOffsets: number[];
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
      const { direction, itemCount, carouselOffsets, sidebarItemCount, quickSettingsSliderCount } =
        action;

      // Quick Settings navigation (NOTE: rightSidebarOpen state comes from app-store, but slider index managed here)
      // The actual check happens in handleAction, this just handles UP/DOWN for slider navigation
      if (direction === NavigationAction.UP || direction === NavigationAction.DOWN) {
        // Check if we should handle this as Quick Settings navigation
        // (This will be skipped if Quick Settings is closed, handled by earlier logic in handleAction)
        if (state.focusArea === 'QUICK_SETTINGS') {
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
        }
      }

      // In-Game Menu navigation (NOTE: leftSidebarOpen state comes from app-store, but menu index managed here)
      if (state.focusArea === 'INGAME_MENU') {
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
      // Uses carouselOffsets for row-aware UP/DOWN and boundary-clamped LEFT/RIGHT
      const hasCarousels = carouselOffsets.length > 1;
      const cIdx = hasCarousels
        ? carouselOffsets.reduce((f, o, i) => (state.activeIndex >= o ? i : f), 0)
        : 0;

      switch (direction) {
        case NavigationAction.UP:
          if (state.focusArea === 'LIBRARY') {
            if (hasCarousels && cIdx > 0) {
              // Move to same column in the previous carousel
              const localIdx = state.activeIndex - carouselOffsets[cIdx];
              const prevStart = carouselOffsets[cIdx - 1];
              const prevSize = carouselOffsets[cIdx] - prevStart;
              return { ...state, activeIndex: prevStart + Math.min(localIdx, prevSize - 1) };
            }
            return { ...state, focusArea: 'HERO' };
          }
          return state;

        case NavigationAction.DOWN:
          if (state.focusArea === 'HERO') return { ...state, focusArea: 'LIBRARY' };
          if (state.focusArea === 'LIBRARY' && hasCarousels && cIdx < carouselOffsets.length - 1) {
            // Move to same column in the next carousel
            const localIdx = state.activeIndex - carouselOffsets[cIdx];
            const nextStart = carouselOffsets[cIdx + 1];
            const nextEnd =
              cIdx + 2 < carouselOffsets.length ? carouselOffsets[cIdx + 2] - 1 : itemCount - 1;
            const nextSize = nextEnd - nextStart + 1;
            return { ...state, activeIndex: nextStart + Math.min(localIdx, nextSize - 1) };
          }
          return state;

        case NavigationAction.LEFT:
          // Sequential: move back one game across all carousels
          if (state.activeIndex > 0) return { ...state, activeIndex: state.activeIndex - 1 };
          return state;

        case NavigationAction.RIGHT:
          // Sequential: move forward one game across all carousels
          if (state.activeIndex < itemCount - 1)
            return { ...state, activeIndex: state.activeIndex + 1, focusArea: 'LIBRARY' };
          return state;

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
  carouselOffsets: number[],
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
  // Tracks which element the GAMEPAD has selected inside the current modal.
  // Using a dedicated ref (not document.activeElement) decouples gamepad selection
  // from mouse focus — the mouse cannot affect what A/CONFIRM acts on.
  const gamepadModalFocusRef = useRef<HTMLElement | null>(null);
  // Stable ref so handleAction doesn't need carouselOffsets in its dep array
  const carouselOffsetsRef = useRef(carouselOffsets);
  useEffect(() => {
    carouselOffsetsRef.current = carouselOffsets;
  }, [carouselOffsets]);

  // Get sidebar states and actions from app-store
  const { overlay, openLeftSidebar, closeLeftSidebar, openRightSidebar, closeRightSidebar } =
    useAppStore();

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

      // isDisabled blocks library navigation but NOT virtual keyboard or overlay panel navigation
      if (
        isDisabled &&
        currentState.focusArea !== 'VIRTUAL_KEYBOARD' &&
        currentState.focusArea !== 'OVERLAY'
      ) {
        return;
      }
      const now = Date.now();
      if (now - lastActionTime.current < 75) return;
      lastActionTime.current = now;

      // --- Overlay / modal panel navigation (fully DOM-based, no async state dependency) ---
      // Pick the topmost open dialog. Evaluated at action-time so it is always
      // accurate — no ~16ms React-state lag.
      const activeOverlayModal = [
        ...document.querySelectorAll<HTMLElement>(
          '[role="dialog"][aria-modal="true"],[role="alertdialog"][aria-modal="true"]'
        ),
      ].at(-1);

      // When no modal is open, clear the gamepad selection ref so stale data
      // from a previous modal doesn't affect future sessions.
      if (!activeOverlayModal) {
        gamepadModalFocusRef.current = null;
      }

      // QuickSettings (right sidebar) uses a custom props-based slider navigation system
      // (quickSettingsSliderIndex → isFocused prop on RadixSlider). Intercepting it here
      // with moveFocus() would move DOM focus without updating quickSettingsSliderIndex,
      // breaking the visual highlight and LEFT/RIGHT slider adjustment entirely.
      // InGameMenu (left sidebar) is fine — its buttons have onClick handlers that work
      // correctly when CONFIRM calls target.click().
      if (activeOverlayModal && !overlay.rightSidebarOpen) {
        const FOCUSABLE =
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
          'textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

        // Reset gamepad selection if the tracked element left the current modal
        // (e.g. modal closed and a different one opened).
        if (
          gamepadModalFocusRef.current &&
          !activeOverlayModal.contains(gamepadModalFocusRef.current)
        ) {
          gamepadModalFocusRef.current = null;
        }

        // Read active element AFTER the stale-ref check so we get the real current one.
        const activeEl = document.activeElement as HTMLElement | null;

        // When a text input or textarea has focus (e.g. the search field), route the
        // D-pad as arrow-key presses so the component navigates its own list.
        // This avoids the bug where ArrowDown inside the search box also moved games.
        // NOTE: we check document.activeElement here (not the gamepad ref) because
        // the input was explicitly focused by the user or by useModalFocus.
        const isTextInput =
          (activeEl?.tagName === 'INPUT' &&
            (activeEl as HTMLInputElement).type !== 'range' &&
            (activeEl as HTMLInputElement).type !== 'checkbox' &&
            (activeEl as HTMLInputElement).type !== 'radio') ||
          activeEl?.tagName === 'TEXTAREA';

        if (isTextInput) {
          const textKeyMap: Partial<Record<NavigationAction, string>> = {
            [NavigationAction.UP]: 'ArrowUp',
            [NavigationAction.DOWN]: 'ArrowDown',
            [NavigationAction.LEFT]: 'ArrowLeft',
            [NavigationAction.RIGHT]: 'ArrowRight',
            [NavigationAction.CONFIRM]: 'Enter',
            [NavigationAction.BACK]: 'Escape',
          };
          const k = textKeyMap[navAction];
          if (k) inputAdapter.dispatchKeyEvent(k);
          return;
        }

        // Determine which element the gamepad considers "selected".
        // Priority: gamepad-tracked ref → document.activeElement (if inside modal).
        // The mouse sets document.activeElement via clicks, so we prefer the
        // gamepad-tracked ref to avoid executing actions on wherever the mouse last was.
        const gamepadEl =
          gamepadModalFocusRef.current ??
          (activeEl && activeOverlayModal.contains(activeEl) ? activeEl : null);

        // For range sliders and selects, LEFT/RIGHT send arrow keys to adjust the value.
        // For all other elements, LEFT/RIGHT move focus to the adjacent item
        // (critical for navigating the Virtual Keyboard button grid).
        const isRangeOrSelect =
          (gamepadEl?.tagName === 'INPUT' && (gamepadEl as HTMLInputElement).type === 'range') ||
          gamepadEl?.tagName === 'SELECT';

        /** Move gamepad focus to the next (+1) or previous (-1) focusable element in the dialog. */
        const moveFocus = (direction: 1 | -1) => {
          const modal =
            gamepadEl?.closest<HTMLElement>(
              '[role="dialog"][aria-modal="true"],[role="alertdialog"][aria-modal="true"]'
            ) ?? activeOverlayModal;
          if (!modal) return;
          const focusable = [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)];
          if (!focusable.length) return;
          const currentIdx = gamepadEl ? focusable.indexOf(gamepadEl) : -1;
          let nextIdx =
            currentIdx < 0 ? (direction > 0 ? 0 : focusable.length - 1) : currentIdx + direction;
          if (nextIdx < 0) nextIdx = focusable.length - 1;
          if (nextIdx >= focusable.length) nextIdx = 0;
          const next = focusable[nextIdx];
          if (next) {
            next.focus();
            gamepadModalFocusRef.current = next; // gamepad owns this selection
          }
        };

        switch (navAction) {
          case NavigationAction.DOWN:
            moveFocus(+1);
            break;
          case NavigationAction.UP:
            moveFocus(-1);
            break;
          case NavigationAction.RIGHT:
            if (isRangeOrSelect) {
              inputAdapter.dispatchKeyEvent('ArrowRight');
            } else {
              moveFocus(+1);
            }
            break;
          case NavigationAction.LEFT:
            if (isRangeOrSelect) {
              inputAdapter.dispatchKeyEvent('ArrowLeft');
            } else {
              moveFocus(-1);
            }
            break;
          case NavigationAction.CONFIRM: {
            // Use the gamepad-tracked element — NOT document.activeElement — so that
            // mouse hover/click cannot hijack what A/CONFIRM acts on.
            const target = gamepadEl ?? activeOverlayModal.querySelector<HTMLElement>(FOCUSABLE);
            if (target) {
              target.focus();
              gamepadModalFocusRef.current = target;
              target.click();
            }
            break;
          }
          case NavigationAction.BACK:
            // Escape bubbles to window where useModalFocus closes the modal
            inputAdapter.dispatchKeyEvent('Escape');
            break;
          // Virtual Keyboard special keys (gamepad bumpers / triggers)
          case NavigationAction.VK_BACKSPACE:
            inputAdapter.dispatchKeyEvent('Backspace');
            break;
          case NavigationAction.VK_SHIFT:
            inputAdapter.dispatchKeyEvent('Shift');
            break;
          case NavigationAction.VK_SPACE:
            inputAdapter.dispatchKeyEvent(' ');
            break;
          case NavigationAction.VK_SYMBOLS:
            inputAdapter.dispatchKeyEvent('F1');
            break;
          case NavigationAction.QUICK_SETTINGS:
            if (overlay.rightSidebarOpen) {
              closeRightSidebar();
            } else if (!overlay.leftSidebarOpen) {
              openRightSidebar();
            }
            break;
          default:
            break;
        }
        return;
      }

      // Handle CONFIRM action
      if (navAction === NavigationAction.CONFIRM) {
        const logMsg = `🎮 CONFIRM action - Left:${overlay.leftSidebarOpen} Right:${overlay.rightSidebarOpen} MenuIdx:${currentState.gameMenuIndex}`;
        console.log(logMsg);
        void invoke('log_message', { message: logMsg });

        if (overlay.rightSidebarOpen) {
          const blockMsg = '⚠️ QuickSettings open - blocking CONFIRM';
          console.log(blockMsg);
          void invoke('log_message', { message: blockMsg });
          return; // Quick Settings open - block confirms
        }
        if (overlay.leftSidebarOpen) {
          // InGameMenu open - handle menu item selection
          // IMPORTANT: Don't handle if QuickSettings is open (user is interacting with it)
          if (overlay.rightSidebarOpen) {
            return; // Ignore navigation when QuickSettings is open
          }

          if (currentState.gameMenuIndex === 0) {
            // Resume Game
            const resumeMsg = '🔴 RESUME GAME - Hiding window from CONFIRM action';
            console.log(resumeMsg);
            void invoke('log_message', { message: resumeMsg });
            closeLeftSidebar();
            void getCurrentWindow().hide();
          } else if (currentState.gameMenuIndex === 1) {
            // Return to Dashboard
            closeLeftSidebar();
            dispatch({ type: 'SET_FOCUS', area: 'LIBRARY' });
            void getCurrentWindow().show();
          } else if (currentState.gameMenuIndex === 2) {
            // Close Game
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
        const backMsg = `🎮 ${navAction} action - Left:${overlay.leftSidebarOpen} Right:${overlay.rightSidebarOpen}`;
        console.log(backMsg);
        void invoke('log_message', { message: backMsg });

        if (overlay.rightSidebarOpen) {
          closeRightSidebar();
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        } else if (currentState.focusArea === 'SEARCH') {
          inputAdapter.dispatchKeyEvent('Escape');
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        } else if (currentState.focusArea === 'VIRTUAL_KEYBOARD') {
          inputAdapter.dispatchKeyEvent('Escape');
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        } else if (currentState.isSidebarOpen) {
          dispatch({ type: 'SET_SIDEBAR', open: false });
        } else if (overlay.leftSidebarOpen) {
          // InGameMenu open - close it and hide window
          // IMPORTANT: Don't hide window if QuickSettings is open
          const closeMsg = '🔴 Closing InGameMenu from BACK';
          console.log(closeMsg);
          void invoke('log_message', { message: closeMsg });
          closeLeftSidebar();
          if (!overlay.rightSidebarOpen) {
            const hideMsg = '🔴 HIDING WINDOW from BACK (QuickSettings not open)';
            console.log(hideMsg);
            void invoke('log_message', { message: hideMsg });
            void getCurrentWindow().hide();
          } else {
            const skipMsg = '⚠️ NOT hiding window - QuickSettings is open';
            console.log(skipMsg);
            void invoke('log_message', { message: skipMsg });
          }
        } else if (activeRunningGame) {
          // No menu open but game running - open InGameMenu
          openLeftSidebar();
        } else {
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        }
        return;
      }

      // Handle QUICK_SETTINGS toggle
      if (navAction === NavigationAction.QUICK_SETTINGS) {
        if (overlay.rightSidebarOpen) {
          closeRightSidebar();
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        } else if (!overlay.leftSidebarOpen) {
          // Only open Quick Settings if InGameMenu is NOT open
          openRightSidebar();
          dispatch({ type: 'SET_FOCUS', area: 'QUICK_SETTINGS' });
          dispatch({ type: 'SET_QUICK_SETTINGS_SLIDER_INDEX', index: 0 });
        }
        return;
      }

      // Handle MENU action
      if (navAction === NavigationAction.MENU && !activeRunningGame) {
        if (overlay.rightSidebarOpen) return; // Block menu if Quick Settings open
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
        overlay.rightSidebarOpen &&
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
        carouselOffsets: carouselOffsetsRef.current,
        sidebarItemCount,
        quickSettingsSliderCount: 4,
      });
    },
    [
      itemCount,
      sidebarItemCount,
      activeRunningGame,
      isDisabled,
      onQuickSettingsAdjust,
      overlay,
      openLeftSidebar,
      closeLeftSidebar,
      openRightSidebar,
      closeRightSidebar,
    ]
  );

  // Listen to navigation events from input adapter
  useEffect(() => {
    const unsubscribe = inputAdapter.onNavigationEvent((event) => {
      handleAction(event.action);
    });

    return unsubscribe;
  }, [handleAction]);

  // Listen for window focus to open in-game menu
  // ROBUST: Only open menu if window is BOTH focused AND visible
  useEffect(() => {
    const unlistenPromise = getCurrentWindow().listen('tauri://focus', () => {
      void (async () => {
        if (!activeRunningGame) return;

        // CRITICAL: Check if window is actually visible before opening sidebar
        // This prevents opening menu when window is hidden during game launch
        const isVisible = await getCurrentWindow().isVisible();
        if (!isVisible) {
          console.log('⚠️ Window focused but not visible - skipping InGameMenu open');
          return;
        }

        console.log('✅ Window focused and visible - opening InGameMenu');
        openLeftSidebar();
        dispatch({ type: 'SET_FOCUS', area: 'INGAME_MENU' });
      })();
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [activeRunningGame, openLeftSidebar]);

  return {
    ...state,
    // Override sidebar states with app-store values (for backward compatibility)
    isInGameMenuOpen: overlay.leftSidebarOpen,
    isQuickSettingsOpen: overlay.rightSidebarOpen,
    setFocusArea: (area: FocusArea) => dispatch({ type: 'SET_FOCUS', area }),
    setSidebarOpen: (open: boolean) => dispatch({ type: 'SET_SIDEBAR', open }),
    setInGameMenuOpen: (open: boolean) => {
      if (open) {
        openLeftSidebar();
        dispatch({ type: 'SET_FOCUS', area: 'INGAME_MENU' });
        dispatch({ type: 'SET_GAME_MENU_INDEX', index: 0 });
      } else {
        closeLeftSidebar();
        dispatch({ type: 'SET_FOCUS', area: 'HERO' });
      }
    },
    setQuickSettingsOpen: (open: boolean) => {
      if (open) {
        openRightSidebar();
        dispatch({ type: 'SET_FOCUS', area: 'QUICK_SETTINGS' });
        dispatch({ type: 'SET_QUICK_SETTINGS_SLIDER_INDEX', index: 0 });
      } else {
        closeRightSidebar();
        dispatch({ type: 'SET_FOCUS', area: 'HERO' });
      }
    },
    setActiveIndex: (index: number) => dispatch({ type: 'SET_INDEX', index }),
    setSidebarIndex: (index: number) => dispatch({ type: 'SET_SIDEBAR_INDEX', index }),
    setQuickSettingsSliderIndex: (index: number) =>
      dispatch({ type: 'SET_QUICK_SETTINGS_SLIDER_INDEX', index }),
  };
};
