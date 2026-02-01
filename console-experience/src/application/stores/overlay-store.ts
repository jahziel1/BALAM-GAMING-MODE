/**
 * Application Store: Overlay Store
 *
 * Centralized Zustand store for managing UI overlay visibility and navigation.
 * Replaces multiple useState hooks from App.tsx for cleaner state management.
 *
 * ## Architecture
 * - **State Management**: Zustand (lightweight alternative to Redux)
 * - **State**: currentOverlay, previousOverlay
 * - **Actions**: showOverlay, hideOverlay, toggleOverlay, goBack
 *
 * ## Features
 * - Single source of truth for overlay state
 * - Navigation stack (goBack to previous overlay)
 * - Toggle support (show/hide same overlay)
 * - Type-safe overlay names
 *
 * ## Overlay Types
 * - **inGameMenu**: Pause menu during gameplay
 * - **quickSettings**: Volume/brightness controls
 * - **fileExplorer**: File browser for manual game adding
 * - **virtualKeyboard**: On-screen keyboard for text input
 * - **search**: Game search command palette
 * - **null**: No overlay visible
 *
 * ## Example Usage
 * ```tsx
 * // In component
 * const { currentOverlay, showOverlay, hideOverlay, goBack } = useOverlayStore();
 *
 * // Show overlay
 * showOverlay('inGameMenu');
 *
 * // Check if overlay is visible
 * if (currentOverlay === 'inGameMenu') { ... }
 *
 * // Hide overlay
 * hideOverlay();
 *
 * // Navigate back
 * goBack(); // Returns to previousOverlay
 * ```
 *
 * @module application/stores/overlay-store
 */

import { create } from 'zustand';

/**
 * Overlay type enumeration
 */
export type OverlayType =
  | 'inGameMenu'
  | 'quickSettings'
  | 'fileExplorer'
  | 'virtualKeyboard'
  | 'search'
  | null;

/**
 * Overlay store state interface
 *
 * Defines state and actions for overlay management.
 */
interface OverlayStoreState {
  // ===== State =====

  /**
   * Currently visible overlay
   * null = no overlay shown
   */
  currentOverlay: OverlayType;

  /**
   * Previously visible overlay (for back navigation)
   * null = no previous overlay
   */
  previousOverlay: OverlayType;

  // ===== Actions =====

  /**
   * Show specific overlay
   * Saves current overlay to previousOverlay for back navigation
   *
   * @param overlay - Overlay to show
   *
   * @example
   * showOverlay('inGameMenu'); // currentOverlay = 'inGameMenu'
   */
  showOverlay: (overlay: OverlayType) => void;

  /**
   * Hide current overlay
   * Resets both currentOverlay and previousOverlay to null
   *
   * @example
   * hideOverlay(); // currentOverlay = null, previousOverlay = null
   */
  hideOverlay: () => void;

  /**
   * Toggle overlay visibility
   * If overlay is currently shown, hide it. Otherwise, show it.
   *
   * @param overlay - Overlay to toggle
   *
   * @example
   * toggleOverlay('search'); // Show if hidden, hide if shown
   */
  toggleOverlay: (overlay: OverlayType) => void;

  /**
   * Navigate back to previous overlay
   * Sets currentOverlay to previousOverlay
   *
   * @example
   * showOverlay('inGameMenu');  // current = inGameMenu, previous = null
   * showOverlay('quickSettings'); // current = quickSettings, previous = inGameMenu
   * goBack();                      // current = inGameMenu, previous = null
   */
  goBack: () => void;
}

/**
 * Overlay store for managing UI overlay visibility
 */
export const useOverlayStore = create<OverlayStoreState>((set) => ({
  // Initial state
  currentOverlay: null,
  previousOverlay: null,

  // Show specific overlay
  showOverlay: (overlay: OverlayType) => {
    set((state) => ({
      previousOverlay: state.currentOverlay,
      currentOverlay: overlay,
    }));
  },

  // Hide current overlay
  hideOverlay: () => {
    set({ currentOverlay: null, previousOverlay: null });
  },

  // Toggle overlay (show if hidden, hide if shown)
  toggleOverlay: (overlay: OverlayType) => {
    set((state) => {
      if (state.currentOverlay === overlay) {
        return { currentOverlay: null, previousOverlay: null };
      } else {
        return { previousOverlay: state.currentOverlay, currentOverlay: overlay };
      }
    });
  },

  // Navigate back to previous overlay
  goBack: () => {
    set((state) => ({
      currentOverlay: state.previousOverlay,
      previousOverlay: null,
    }));
  },
}));
