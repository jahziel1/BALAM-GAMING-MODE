/**
 * @module hooks/useNavigation
 *
 * Centralized navigation state management using reducer pattern.
 * Handles keyboard/gamepad navigation across all UI areas.
 *
 * Manual focus approach:
 * - When any overlay/sidebar is open, gamepad D-pad moves DOM focus between
 *   focusable elements within the topmost overlay container.
 * - useModalFocus (in OverlayPanel) auto-focuses the first element when a panel opens.
 * - LIBRARY/HERO carousel navigation uses the reducer when no overlay is open.
 */

import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { inputAdapter } from '../adapters/input/InputAdapter';
import { useAppStore } from '../application/providers/StoreProvider';
import type { ActiveGame } from '../domain/entities/game';
import { NavigationAction } from '../domain/input/NavigationEvent';

/**
 * Focus areas in the application
 */
export type FocusArea = 'LIBRARY' | 'HERO' | 'VIRTUAL_KEYBOARD' | 'SEARCH' | 'TOPBAR';

interface NavState {
  focusArea: FocusArea;
  isSidebarOpen: boolean;
  activeIndex: number;
}

type Action =
  | {
      type: 'MOVE';
      direction: NavigationAction;
      itemCount: number;
      /** Flat start-index of each carousel, e.g. [0, 10, 25]. Empty = no carousel structure. */
      carouselOffsets: number[];
    }
  | { type: 'SET_FOCUS'; area: FocusArea }
  | { type: 'SET_SIDEBAR'; open: boolean }
  | { type: 'SET_INDEX'; index: number };

const initialState: NavState = {
  focusArea: 'LIBRARY',
  isSidebarOpen: false,
  activeIndex: 0,
};

function navReducer(state: NavState, action: Action): NavState {
  switch (action.type) {
    case 'SET_FOCUS':
      return { ...state, focusArea: action.area };
    case 'SET_SIDEBAR':
      return { ...state, isSidebarOpen: action.open };
    case 'SET_INDEX':
      return { ...state, activeIndex: action.index };

    case 'MOVE': {
      const { direction, itemCount, carouselOffsets } = action;

      // Virtual Keyboard & Search: handled internally by components
      if (state.focusArea === 'VIRTUAL_KEYBOARD' || state.focusArea === 'SEARCH') {
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
              const localIdx = state.activeIndex - carouselOffsets[cIdx];
              const prevStart = carouselOffsets[cIdx - 1];
              const prevSize = carouselOffsets[cIdx] - prevStart;
              return { ...state, activeIndex: prevStart + Math.min(localIdx, prevSize - 1) };
            }
            return { ...state, focusArea: 'HERO' };
          }
          if (state.focusArea === 'HERO') return { ...state, focusArea: 'TOPBAR' };
          return state;

        case NavigationAction.DOWN:
          if (state.focusArea === 'HERO') return { ...state, focusArea: 'LIBRARY' };
          if (state.focusArea === 'LIBRARY' && hasCarousels && cIdx < carouselOffsets.length - 1) {
            const localIdx = state.activeIndex - carouselOffsets[cIdx];
            const nextStart = carouselOffsets[cIdx + 1];
            const nextEnd =
              cIdx + 2 < carouselOffsets.length ? carouselOffsets[cIdx + 2] - 1 : itemCount - 1;
            const nextSize = nextEnd - nextStart + 1;
            return { ...state, activeIndex: nextStart + Math.min(localIdx, nextSize - 1) };
          }
          return state;

        case NavigationAction.LEFT:
          if (state.activeIndex > 0) return { ...state, activeIndex: state.activeIndex - 1 };
          return state;

        case NavigationAction.RIGHT:
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

/** Focusable element selector for overlay navigation */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

/**
 * Move DOM focus up or down within the topmost active overlay or sidebar.
 * Called when gamepad D-pad is used while any overlay is open.
 */
function moveFocusInOverlay(direction: 'up' | 'down'): void {
  // Dialog takes priority (aria-modal overlays)
  const allDialogs = document.querySelectorAll<HTMLElement>(
    '[role="dialog"][aria-modal="true"],[role="alertdialog"][aria-modal="true"]'
  );
  const dialog = allDialogs.item(allDialogs.length - 1) ?? null;

  // Fallback to sidebar
  const sidebar = document.querySelector<HTMLElement>('.sidebar.expanded');

  const container = dialog ?? sidebar;
  if (!container) return;

  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null
  );

  if (!focusable.length) return;

  const currentIdx = focusable.indexOf(document.activeElement as HTMLElement);

  if (currentIdx === -1) {
    // Nothing focused yet — go to first or last
    focusable[direction === 'down' ? 0 : focusable.length - 1]?.focus();
    return;
  }

  const nextIdx =
    direction === 'down'
      ? (currentIdx + 1) % focusable.length
      : (currentIdx - 1 + focusable.length) % focusable.length;

  focusable[nextIdx]?.focus();
}

/**
 * Custom hook for application navigation
 *
 * Manual focus approach:
 * - When any overlay is open: D-pad moves DOM focus via moveFocusInOverlay()
 * - When no overlay is open: LIBRARY/HERO carousel navigation via reducer
 * - CONFIRM: dispatches Enter to focused element (or launches game in LIBRARY/HERO)
 * - BACK/MENU/QUICK_SETTINGS: always handled here
 */
export const useNavigation = (
  itemCount: number,
  carouselOffsets: number[],
  _sidebarItemCount: number,
  onLaunch: (index: number) => void,
  onSidebarSelect: (index: number) => void,
  onQuit: () => void,
  activeRunningGame: ActiveGame | null,
  isDisabled = false,
  isSearchOpen = false,
  isOverlayWindow = false
) => {
  const [state, dispatch] = useReducer(navReducer, initialState);
  const lastActionTime = useRef(0);
  const carouselOffsetsRef = useRef(carouselOffsets);
  useEffect(() => {
    carouselOffsetsRef.current = carouselOffsets;
  }, [carouselOffsets]);

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

  const isSearchOpenRef = useRef(isSearchOpen);
  useEffect(() => {
    isSearchOpenRef.current = isSearchOpen;
  }, [isSearchOpen]);

  // Focus first sidebar item when sidebar opens
  useEffect(() => {
    if (state.isSidebarOpen) {
      requestAnimationFrame(() => {
        const firstItem = document.querySelector<HTMLElement>(
          '.sidebar.expanded [tabindex="0"], .sidebar.expanded button'
        );
        firstItem?.focus();
      });
    }
  }, [state.isSidebarOpen]);

  // Focus first TopBar button when TOPBAR becomes active
  useEffect(() => {
    if (state.focusArea === 'TOPBAR') {
      requestAnimationFrame(() => {
        const firstBtn = document.querySelector<HTMLElement>(
          '.top-bar [tabindex="0"], .top-bar button'
        );
        firstBtn?.focus();
      });
    }
  }, [state.focusArea]);

  const handleAction = useCallback(
    (navAction: NavigationAction) => {
      const currentState = stateRef.current;

      if (
        isDisabled &&
        currentState.focusArea !== 'VIRTUAL_KEYBOARD' &&
        navAction !== NavigationAction.TOGGLE_OVERLAY
      ) {
        return;
      }
      const now = Date.now();
      if (now - lastActionTime.current < 75) return;
      lastActionTime.current = now;

      // --- Handle TOGGLE_OVERLAY (LB+RB+Start) ---
      if (navAction === NavigationAction.TOGGLE_OVERLAY) {
        const debugMsg = `🎮 TOGGLE_OVERLAY: activeRunningGame=${activeRunningGame ? 'YES' : 'NO'}`;
        console.log(debugMsg);
        void invoke('log_message', { message: debugMsg });

        if (activeRunningGame) {
          // With game running: toggle native overlay
          console.log('🔍 Calling toggle_game_overlay...');
          void invoke('log_message', { message: '🔍 Calling toggle_game_overlay...' });

          invoke('toggle_game_overlay')
            .then(() => {
              console.log('✅ toggle_game_overlay SUCCESS');
              void invoke('log_message', { message: '✅ toggle_game_overlay SUCCESS' });
            })
            .catch((err) => {
              console.error('❌ toggle_game_overlay ERROR:', err);
              void invoke('log_message', { message: `❌ toggle_game_overlay ERROR: ${err}` });
            });
        } else {
          // Without game: show main window (wakeup)
          void (async () => {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const win = getCurrentWindow();
            const isVisible = await win.isVisible();
            if (!isVisible) {
              await win.show();
              await win.setAlwaysOnTop(true);
              await win.setFocus();
            }
          })();
        }
        return;
      }

      // --- Handle BACK ---
      // DEBUG: Log MENU action
      if (navAction === NavigationAction.MENU) {
        const debugMsg = `🔍 DEBUG MENU: activeRunningGame=${activeRunningGame ? 'YES' : 'NO'}, leftSidebarOpen=${overlay.leftSidebarOpen}`;
        console.log(debugMsg);
        void invoke('log_message', { message: debugMsg });
      }

      if (
        navAction === NavigationAction.BACK ||
        (navAction === NavigationAction.MENU && activeRunningGame)
      ) {
        const backMsg = `🎮 ${navAction} action - Left:${overlay.leftSidebarOpen} Right:${overlay.rightSidebarOpen}, activeRunningGame:${activeRunningGame ? 'YES' : 'NO'}`;
        console.log(backMsg);
        void invoke('log_message', { message: backMsg });

        // If any modal/overlay is open, dispatch Escape to close it
        const activeModals = [
          ...document.querySelectorAll<HTMLElement>(
            '[role="dialog"][aria-modal="true"],[role="alertdialog"][aria-modal="true"]'
          ),
        ];
        const topmostModal = activeModals.at(-1);
        if (topmostModal) {
          inputAdapter.dispatchKeyEvent('Escape');
          return;
        }

        if (currentState.focusArea === 'SEARCH') {
          inputAdapter.dispatchKeyEvent('Escape');
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        } else if (currentState.focusArea === 'VIRTUAL_KEYBOARD') {
          inputAdapter.dispatchKeyEvent('Escape');
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        } else if (currentState.isSidebarOpen) {
          dispatch({ type: 'SET_SIDEBAR', open: false });
        } else if (overlay.leftSidebarOpen && (activeRunningGame || isOverlayWindow)) {
          // With game running OR inside overlay window: close native overlay window
          const closeMsg = '🔴 Closing native overlay from BACK';
          console.log(closeMsg);
          void invoke('log_message', { message: closeMsg });
          void invoke('toggle_game_overlay');
        } else if (overlay.leftSidebarOpen && !activeRunningGame) {
          // Without game in MAIN window: close sidebar
          const closeMsg = '🔴 Closing sidebar from BACK';
          console.log(closeMsg);
          void invoke('log_message', { message: closeMsg });
          closeLeftSidebar();
        } else if (activeRunningGame) {
          // Use native overlay (same as Ctrl+Shift+Q)
          void invoke('toggle_game_overlay');
        } else {
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        }
        return;
      }

      // --- Handle CONFIRM ---
      if (navAction === NavigationAction.CONFIRM) {
        if (currentState.focusArea === 'SEARCH') {
          // Dispatch directly to the cmdk input so it works even when the input is
          // blurred (e.g. after the VK closed and blurred it).
          const searchInput = document.querySelector<HTMLInputElement>('.search-overlay input');
          if (searchInput) {
            searchInput.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
            );
          } else {
            inputAdapter.dispatchKeyEvent('Enter');
          }
          return;
        }
        if (currentState.focusArea === 'VIRTUAL_KEYBOARD') {
          // Dispatch to window so VK's window.addEventListener catches it,
          // not to document.activeElement (e.g. search input)
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
          );
          return;
        }

        // If any overlay/sidebar is open, dispatch Enter to the currently focused element
        // isSearchOpenRef guards the race window where sidebar=false but search hasn't rendered yet
        const dialogInDom = document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
        const anyOverlayOpen =
          currentState.isSidebarOpen ||
          isSearchOpenRef.current ||
          overlay.leftSidebarOpen ||
          overlay.rightSidebarOpen ||
          dialogInDom;

        const activeEl = document.activeElement;
        void invoke('log_message', {
          message: `🎮 CONFIRM: focusArea=${currentState.focusArea} isSidebarOpen=${currentState.isSidebarOpen} leftSidebar=${overlay.leftSidebarOpen} rightSidebar=${overlay.rightSidebarOpen} dialogInDom=${dialogInDom} anyOverlayOpen=${anyOverlayOpen} activeElement=${activeEl?.tagName ?? 'null'}#${activeEl?.id ?? ''}[${activeEl?.className ?? ''}] text="${(activeEl as HTMLElement)?.innerText?.slice(0, 30) ?? ''}"`,
        });

        if (anyOverlayOpen || currentState.focusArea === 'TOPBAR') {
          void invoke('log_message', { message: `🎮 CONFIRM: dispatching Enter to activeElement` });
          inputAdapter.dispatchKeyEvent('Enter');
          return;
        }

        if (
          (currentState.focusArea === 'LIBRARY' || currentState.focusArea === 'HERO') &&
          !overlay.rightSidebarOpen &&
          !overlay.leftSidebarOpen
        ) {
          callbacks.current.onLaunch(currentState.activeIndex);
        }
        return;
      }

      // --- Handle QUICK_SETTINGS toggle ---
      if (navAction === NavigationAction.QUICK_SETTINGS) {
        if (overlay.rightSidebarOpen) {
          closeRightSidebar();
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        } else if (!overlay.leftSidebarOpen) {
          openRightSidebar();
        }
        return;
      }

      // --- Handle MENU action ---
      if (navAction === NavigationAction.MENU && !activeRunningGame) {
        if (overlay.rightSidebarOpen) return;
        if (currentState.focusArea === 'VIRTUAL_KEYBOARD') return;
        if (currentState.focusArea === 'SEARCH') return;
        const newOpen = !currentState.isSidebarOpen;
        dispatch({ type: 'SET_SIDEBAR', open: newOpen });
        return;
      }

      // --- Search Overlay: Convert gamepad directional inputs to keyboard events ---
      // UP/DOWN dispatch directly to the cmdk input (works even when blurred).
      // LEFT/RIGHT dispatch to window (VK only — avoids moving cursor in search input).
      if (currentState.focusArea === 'SEARCH') {
        const searchInput = document.querySelector<HTMLInputElement>('.search-overlay input');
        if (navAction === NavigationAction.UP) {
          searchInput?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
          );
        } else if (navAction === NavigationAction.DOWN) {
          searchInput?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
          );
        } else if (navAction === NavigationAction.LEFT) {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
          );
        } else if (navAction === NavigationAction.RIGHT) {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
          );
        }
        return;
      }

      // --- Virtual Keyboard ---
      if (currentState.focusArea === 'VIRTUAL_KEYBOARD') {
        const keyMap: Record<NavigationAction, string> = {
          [NavigationAction.UP]: 'ArrowUp',
          [NavigationAction.DOWN]: 'ArrowDown',
          [NavigationAction.LEFT]: 'ArrowLeft',
          [NavigationAction.RIGHT]: 'ArrowRight',
          [NavigationAction.VK_BACKSPACE]: 'Backspace',
          [NavigationAction.VK_SHIFT]: 'Shift',
          [NavigationAction.VK_SPACE]: ' ',
          [NavigationAction.VK_SYMBOLS]: 'F1',
          [NavigationAction.CONFIRM]: '',
          [NavigationAction.BACK]: '',
          [NavigationAction.MENU]: '',
          [NavigationAction.QUICK_SETTINGS]: '',
          [NavigationAction.TOGGLE_OVERLAY]: '',
        };
        const key = keyMap[navAction];
        if (key) {
          // Dispatch directly to window so VK's window.addEventListener catches it,
          // without the event reaching document.activeElement (e.g. the Search input)
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
          );
        }
        return;
      }

      // --- TopBar navigation ---
      // Only intercept when no overlay/dialog is open; otherwise fall through to overlay handler
      if (currentState.focusArea === 'TOPBAR') {
        const anyDialogOpen =
          currentState.isSidebarOpen ||
          overlay.leftSidebarOpen ||
          overlay.rightSidebarOpen ||
          document.querySelector('[role="dialog"][aria-modal="true"]') !== null;

        if (!anyDialogOpen) {
          if (navAction === NavigationAction.DOWN) {
            dispatch({ type: 'SET_FOCUS', area: 'HERO' });
            return;
          }
          if (navAction === NavigationAction.LEFT || navAction === NavigationAction.RIGHT) {
            const topBar = document.querySelector<HTMLElement>('.top-bar');
            if (topBar) {
              const focusable = Array.from(
                topBar.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
              ).filter((el) => el.offsetParent !== null);
              if (focusable.length) {
                const currentIdx = focusable.indexOf(document.activeElement as HTMLElement);
                if (currentIdx === -1) {
                  focusable[0]?.focus();
                } else {
                  const nextIdx =
                    navAction === NavigationAction.RIGHT
                      ? Math.min(currentIdx + 1, focusable.length - 1)
                      : Math.max(currentIdx - 1, 0);
                  focusable[nextIdx]?.focus();
                }
              }
            }
            return;
          }
          // UP in TOPBAR → no-op (already at top)
          return;
        }
        // anyDialogOpen=true: fall through to overlay navigation below
      }

      // --- Directional navigation ---
      const isDirectional =
        navAction === NavigationAction.UP ||
        navAction === NavigationAction.DOWN ||
        navAction === NavigationAction.LEFT ||
        navAction === NavigationAction.RIGHT;

      if (isDirectional) {
        // Sidebar RIGHT: close sidebar
        if (currentState.isSidebarOpen && navAction === NavigationAction.RIGHT) {
          dispatch({ type: 'SET_SIDEBAR', open: false });
          return;
        }

        // If any overlay is open, move DOM focus within it
        const anyOverlayOpen =
          currentState.isSidebarOpen ||
          overlay.leftSidebarOpen ||
          overlay.rightSidebarOpen ||
          document.querySelector('[role="dialog"][aria-modal="true"]') !== null;

        if (anyOverlayOpen) {
          // For range sliders, arrow keys change the value — keep dispatching ArrowLeft/Right.
          // For everything else (buttons, links), move DOM focus so .click() can activate them.
          const activeEl = document.activeElement as HTMLElement | null;
          const isRangeInput = activeEl instanceof HTMLInputElement && activeEl.type === 'range';

          if (navAction === NavigationAction.UP) {
            moveFocusInOverlay('up');
          } else if (navAction === NavigationAction.DOWN) {
            moveFocusInOverlay('down');
          } else if (navAction === NavigationAction.LEFT) {
            if (isRangeInput) {
              inputAdapter.dispatchKeyEvent('ArrowLeft');
            } else {
              moveFocusInOverlay('up');
            }
          } else if (navAction === NavigationAction.RIGHT) {
            if (isRangeInput) {
              inputAdapter.dispatchKeyEvent('ArrowRight');
            } else {
              moveFocusInOverlay('down');
            }
          }
          return;
        }

        // Otherwise: standard LIBRARY/HERO carousel navigation
        dispatch({
          type: 'MOVE',
          direction: navAction,
          itemCount,
          carouselOffsets: carouselOffsetsRef.current,
        });
      }
    },
    [
      itemCount,
      activeRunningGame,
      isDisabled,
      isOverlayWindow,
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

  // REMOVED: Window focus listener for InGameMenu
  // With native overlay system, the overlay window is created on-demand via toggle_game_overlay()
  // The main window no longer needs to open InGameMenu on focus when a game is running

  // Stable callback references — dispatch from useReducer never changes
  const setFocusArea = useCallback((area: FocusArea) => dispatch({ type: 'SET_FOCUS', area }), []);
  const setSidebarOpen = useCallback(
    (open: boolean) => dispatch({ type: 'SET_SIDEBAR', open }),
    []
  );

  return {
    ...state,
    isInGameMenuOpen: overlay.leftSidebarOpen,
    isQuickSettingsOpen: overlay.rightSidebarOpen,
    setFocusArea,
    setSidebarOpen,
    setInGameMenuOpen: (open: boolean) => {
      if (activeRunningGame) {
        // With game running: use native overlay system
        void invoke('toggle_game_overlay');
      } else {
        // Without game: use sidebar in main window
        if (open) {
          openLeftSidebar();
        } else {
          closeLeftSidebar();
          dispatch({ type: 'SET_FOCUS', area: 'HERO' });
        }
      }
    },
    setQuickSettingsOpen: (open: boolean) => {
      if (open) {
        openRightSidebar();
      } else {
        closeRightSidebar();
        dispatch({ type: 'SET_FOCUS', area: 'HERO' });
      }
    },
    setActiveIndex: (index: number) => dispatch({ type: 'SET_INDEX', index }),
    // Kept for backward compatibility with App.tsx usage
    sidebarIndex: 0,
    setSidebarIndex: (_index: number) => {
      // No-op: Deprecated but kept for backward compatibility
    },
    quickSettingsSliderIndex: 0,
    setQuickSettingsSliderIndex: (_index: number) => {
      // No-op: Deprecated but kept for backward compatibility
    },
  };
};
