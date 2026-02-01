/**
 * In-Game Menu (Optimized with Radix UI Dialog)
 *
 * Accessible overlay menu shown during active gameplay.
 * Allows users to resume, access quick settings, or quit the current game.
 *
 * ## Architecture
 * - **UI Framework**: Radix UI Dialog primitive
 * - **State Management**: Zustand overlay-store + game-store
 * - **Accessibility**: Full keyboard navigation and screen reader support
 * - **Performance**: Memoized to prevent unnecessary re-renders
 *
 * ## Features
 * - Resume game (close overlay and return to game)
 * - Quick Settings access (navigate to settings overlay)
 * - Quit game (terminate game process and close overlay)
 * - ESC key closes the menu
 * - Click outside closes the menu
 * - Focus trap (keyboard navigation stays within dialog)
 *
 * ## Radix Dialog Benefits
 * - Automatic focus management (focuses first button on open)
 * - Portal rendering (renders outside normal DOM hierarchy)
 * - Backdrop overlay with click-outside-to-close
 * - ESC key handling
 * - ARIA attributes for accessibility
 *
 * ## Example Usage
 * ```tsx
 * // Triggered by overlay-store
 * showOverlay('inGameMenu');
 *
 * // Component renders automatically when currentOverlay === 'inGameMenu'
 * <InGameMenuOptimized />
 * ```
 *
 * @module components/overlay/InGameMenuOptimized
 */

import './overlay.css';

import * as Dialog from '@radix-ui/react-dialog';
import { memo } from 'react';

import { useGameStore } from '@/application/providers/StoreProvider';
import { useOverlayStore } from '@/application/stores/overlay-store';

/**
 * In-Game Menu Component
 *
 * Memoized overlay component that shows during active gameplay.
 * Controlled by overlay-store's currentOverlay state.
 *
 * No props required - reads state from stores directly.
 *
 * @returns Radix Dialog with menu actions
 */
export const InGameMenuOptimized = memo(function InGameMenuOptimized() {
  // Overlay state from Zustand store
  const { currentOverlay, hideOverlay, showOverlay } = useOverlayStore();

  // Active game state from game store
  const { activeRunningGame, killGame } = useGameStore();

  /**
   * Dialog open state
   * True when overlay-store.currentOverlay === 'inGameMenu'
   */
  const isOpen = currentOverlay === 'inGameMenu';

  /**
   * Resume game handler
   * Closes the overlay and returns focus to the game
   */
  const handleClose = () => {
    hideOverlay();
  };

  /**
   * Quit game handler
   * Terminates the running game process and closes the overlay
   *
   * Workflow:
   * 1. Check if game is actually running (has PID)
   * 2. Call killGame(pid) to terminate process
   * 3. Close overlay
   */
  const handleQuitGame = async () => {
    if (activeRunningGame?.pid) {
      await killGame(activeRunningGame.pid);
      hideOverlay();
    }
  };

  /**
   * Quick Settings navigation handler
   * Transitions from inGameMenu to quickSettings overlay
   */
  const handleQuickSettings = () => {
    showOverlay('quickSettings');
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-backdrop" />
        <Dialog.Content className="overlay-panel">
          <Dialog.Title className="overlay-title">
            {activeRunningGame?.game.title ?? 'In-Game Menu'}
          </Dialog.Title>

          <div className="menu-actions">
            <button className="menu-button primary" onClick={handleClose}>
              Resume Game
            </button>
            <button className="menu-button" onClick={handleQuickSettings}>
              Quick Settings
            </button>
            <button className="menu-button danger" onClick={() => void handleQuitGame()}>
              Quit Game
            </button>
          </div>

          <Dialog.Close asChild>
            <button className="close-button" aria-label="Close">
              ×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});
