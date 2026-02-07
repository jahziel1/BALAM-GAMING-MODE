/**
 * Overlay Slice
 *
 * Zustand slice for managing UI overlay visibility and navigation.
 * Part of the app-store using the Slices Pattern.
 *
 * ## Architecture
 * - **Pattern**: Zustand Slices (official recommendation 2024-2026)
 * - **State**: Overlay visibility (fullscreen modals + sidebars)
 * - **Actions**: Show/hide overlays, sidebar navigation
 *
 * ## Overlay Types
 * - **Fullscreen Modals**: fileExplorer, virtualKeyboard, search
 * - **Sidebars**: inGameMenu (left), quickSettings (right)
 *
 * @module stores/slices/overlay-slice
 */

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
 * Overlay slice state
 */
export interface OverlaySlice {
  overlay: {
    // Fullscreen modal state (backward compatible)
    currentOverlay: OverlayType;
    previousOverlay: OverlayType;

    // Sidebar state (NEW - for in-game overlays)
    leftSidebarOpen: boolean; // InGameMenu
    rightSidebarOpen: boolean; // QuickSettings
  };

  // ===== Fullscreen Modal Actions =====

  /**
   * Show specific fullscreen overlay
   * Saves current overlay to previousOverlay for back navigation
   */
  showOverlay: (overlay: OverlayType) => void;

  /**
   * Hide current fullscreen overlay
   * Resets both currentOverlay and previousOverlay to null
   */
  hideOverlay: () => void;

  /**
   * Toggle fullscreen overlay visibility
   */
  toggleOverlay: (overlay: OverlayType) => void;

  /**
   * Navigate back to previous overlay
   */
  goBack: () => void;

  // ===== Sidebar Actions (NEW) =====

  /**
   * Open left sidebar (InGameMenu)
   */
  openLeftSidebar: () => void;

  /**
   * Close left sidebar
   */
  closeLeftSidebar: () => void;

  /**
   * Toggle left sidebar
   */
  toggleLeftSidebar: () => void;

  /**
   * Open right sidebar (QuickSettings)
   */
  openRightSidebar: () => void;

  /**
   * Close right sidebar
   */
  closeRightSidebar: () => void;

  /**
   * Toggle right sidebar
   */
  toggleRightSidebar: () => void;

  /**
   * Close all sidebars
   */
  closeAllSidebars: () => void;
}

/**
 * Create overlay slice
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @returns Overlay slice state and actions
 */
export const createOverlaySlice = (
  set: (fn: (state: OverlaySlice) => Partial<OverlaySlice>) => void,
  _get: () => OverlaySlice
): OverlaySlice => ({
  // Initial state
  overlay: {
    currentOverlay: null,
    previousOverlay: null,
    leftSidebarOpen: false,
    rightSidebarOpen: false,
  },

  // ===== Fullscreen Modal Actions =====

  showOverlay: (overlay: OverlayType) => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        previousOverlay: state.overlay.currentOverlay,
        currentOverlay: overlay,
      },
    }));
  },

  hideOverlay: () => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        currentOverlay: null,
        previousOverlay: null,
      },
    }));
  },

  toggleOverlay: (overlay: OverlayType) => {
    set((state) => {
      if (state.overlay.currentOverlay === overlay) {
        return {
          overlay: {
            ...state.overlay,
            currentOverlay: null,
            previousOverlay: null,
          },
        };
      } else {
        return {
          overlay: {
            ...state.overlay,
            previousOverlay: state.overlay.currentOverlay,
            currentOverlay: overlay,
          },
        };
      }
    });
  },

  goBack: () => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        currentOverlay: state.overlay.previousOverlay,
        previousOverlay: null,
      },
    }));
  },

  // ===== Sidebar Actions (NEW) =====

  openLeftSidebar: () => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        leftSidebarOpen: true,
      },
    }));
  },

  closeLeftSidebar: () => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        leftSidebarOpen: false,
      },
    }));
  },

  toggleLeftSidebar: () => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        leftSidebarOpen: !state.overlay.leftSidebarOpen,
      },
    }));
  },

  openRightSidebar: () => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        rightSidebarOpen: true,
      },
    }));
  },

  closeRightSidebar: () => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        rightSidebarOpen: false,
      },
    }));
  },

  toggleRightSidebar: () => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        rightSidebarOpen: !state.overlay.rightSidebarOpen,
      },
    }));
  },

  closeAllSidebars: () => {
    set((state) => ({
      overlay: {
        ...state.overlay,
        leftSidebarOpen: false,
        rightSidebarOpen: false,
      },
    }));
  },
});
