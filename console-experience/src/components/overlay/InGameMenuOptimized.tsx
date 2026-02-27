/**
 * In-Game Menu (Sidebar Layout - Xbox Style)
 *
 * Left sidebar overlay shown during active gameplay.
 * Features improved visual design with game cover, stats, and Xbox-inspired layout.
 *
 * ## Architecture (2024-2026)
 * - **UI Framework**: OverlayPanel (unified design system)
 * - **State Management**: Zustand app-store (Slices Pattern)
 * - **Layout**: 30% left sidebar + improved visual design
 * - **Accessibility**: Full keyboard navigation and screen reader support
 *
 * ## Features
 * - Resume game (close sidebar)
 * - Quick Settings (open right sidebar simultaneously)
 * - Close game (graceful shutdown with confirmation)
 * - Game info: Cover, title, session time, stats (FPS, GPU temp)
 * - ESC/B button closes menu
 *
 * ## Design Improvements
 * - Game cover image display
 * - Session time tracking
 * - Real-time stats (FPS, GPU temperature)
 * - Better spacing and visual hierarchy
 * - Confirmation dialog before closing game
 *
 * @module components/overlay/InGameMenuOptimized
 */

import './InGameMenu.css';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Home, Loader2, Play, Settings, X } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { useAppStore } from '@/application/providers/StoreProvider';
import { Button } from '@/components/core/Button/Button';
import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';
import { SectionHeader } from '@/components/core/SectionHeader/SectionHeader';
import { OverlayPanel } from '@/components/overlay/OverlayPanel/OverlayPanel';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { getCachedAssetSrc } from '@/utils/image-cache';

/**
 * In-Game Menu Component (Sidebar)
 *
 * Xbox-style left sidebar with game info and actions.
 * Opens right sidebar for Quick Settings without closing itself.
 *
 * @returns Radix Dialog positioned as left sidebar
 */
export const InGameMenuOptimized = memo(function InGameMenuOptimized() {
  // App store (Slices Pattern)
  const {
    overlay,
    game,
    closeLeftSidebar,
    openRightSidebar,
    closeRightSidebar,
    closeAllSidebars,
    clearActiveGame,
  } = useAppStore();

  // Local state
  const [isClosingGame, setIsClosingGame] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isFpsLoading, setIsFpsLoading] = useState(true);

  // In overlay window, fetch active game from backend (no shared Zustand store)
  const isOverlayWindow = getCurrentWindow().label === 'overlay';
  const [overlayActiveGame, setOverlayActiveGame] = useState<typeof game.activeRunningGame>(null);

  const fetchOverlayGame = () => {
    invoke<typeof game.activeRunningGame>('get_active_game')
      .then((g) => {
        setOverlayActiveGame(g);
      })
      .catch((_e: unknown) => {
        /* ignore fetch errors */
      });
  };

  useEffect(() => {
    if (!isOverlayWindow) return;
    // Fetch on mount
    fetchOverlayGame();
    // Re-fetch every time the overlay window becomes visible
    const handleVisibility = () => {
      if (!document.hidden) fetchOverlayGame();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOverlayWindow]);

  // Reset Quick Settings to closed every time the overlay becomes visible.
  // Prevents QS from appearing "auto-opened" due to stale Zustand state from a previous session.
  useEffect(() => {
    if (!isOverlayWindow) return;
    closeRightSidebar();
    const handleVisibility = () => {
      if (!document.hidden) closeRightSidebar();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isOverlayWindow, closeRightSidebar]);

  // In overlay window: hide when game ends externally (game crashed, exited normally, etc.)
  useEffect(() => {
    if (!isOverlayWindow) return;
    const unlisten = listen('game-ended', () => {
      void invoke('hide_game_overlay');
      void invoke('show_main_window');
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [isOverlayWindow]);

  // Rust-Native navigation: focus the button that the Rust gamepad thread selected.
  // This keeps visual focus in sync when WebView JS is alive, and provides the
  // correct DOM activeElement so CONFIRM (A button via nav event) can .click() it.
  useEffect(() => {
    if (!isOverlayWindow) return;
    const unlisten = listen<number>('overlay-focus-changed', (e) => {
      document.getElementById(`overlay-btn-${e.payload}`)?.focus();
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [isOverlayWindow]);

  // Rust-Native actions: Quick Settings, Close Game, and Return to Home.
  useEffect(() => {
    if (!isOverlayWindow) return;
    const unlisten = listen<string>('overlay-action', (e) => {
      if (e.payload === 'OPEN_QUICK_SETTINGS') {
        openRightSidebar();
      } else if (e.payload === 'CLOSE_GAME_REQUEST') {
        setShowCloseConfirm(true);
      } else if (e.payload === 'RETURN_TO_HOME') {
        void invoke('hide_game_overlay');
        void invoke('show_main_window');
      }
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [isOverlayWindow, openRightSidebar]);

  // In overlay window, always render the panel — don't depend on Zustand leftSidebarOpen
  // (which starts false and requires an async useEffect to become true)
  const isOpen = isOverlayWindow ? true : overlay.leftSidebarOpen;
  const activeGame = isOverlayWindow ? overlayActiveGame : game.activeRunningGame;
  const isQuickSettingsOpen = overlay.rightSidebarOpen;

  // Performance metrics (real-time FPS, GPU temp, etc.)
  const { metrics } = usePerformanceMetrics({ interval: 1000, enabled: isOpen });

  // FPS loading state (show spinner for first 2 seconds)
  useEffect(() => {
    if (isOpen) {
      setIsFpsLoading(true);
      const timer = setTimeout(() => setIsFpsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  /**
   * Resume game handler
   * Closes left sidebar and returns to game
   * Context-aware: uses native overlay if in overlay window, otherwise uses Zustand
   */
  const handleResume = async () => {
    await invoke('log_message', { message: '🔴 handleResume called' });

    if (isOverlayWindow) {
      // In overlay window: close native overlay
      await invoke('log_message', { message: '🔴 Closing native overlay' });
      await invoke('toggle_game_overlay');
    } else {
      // In main window: close sidebar and hide
      await invoke('log_message', { message: '🔴 Closing sidebar in MAIN' });
      closeLeftSidebar();
      await getCurrentWindow().hide();
    }
  };

  /**
   * Open Quick Settings
   * Opens right sidebar without closing left sidebar (simultaneous display)
   */
  const handleOpenQuickSettings = () => {
    openRightSidebar();
  };

  /**
   * Close game handler with confirmation
   * Step 1: Show confirmation dialog
   * Step 2: If confirmed, gracefully close game
   */
  const handleCloseGameRequest = () => {
    console.log('🔴 CLOSE GAME REQUESTED');
    console.log('Active game:', activeGame);
    console.log('PID:', activeGame?.pid);
    setShowCloseConfirm(true);
  };

  const handleCloseGameConfirmed = async () => {
    await invoke('log_message', { message: '🔴 handleCloseGameConfirmed called' });

    const gamePid = activeGame?.pid ?? 0;

    try {
      setIsClosingGame(true);
      setShowCloseConfirm(false);

      await invoke('log_message', { message: `🔴 Calling kill_game with PID: ${gamePid}` });
      await invoke('kill_game', { pid: gamePid });

      await invoke('log_message', { message: '✅ FRONTEND STEP 6: Game killed successfully' });
      console.log('✅ STEP 6: Game killed successfully');

      await invoke('log_message', { message: '🔴 FRONTEND STEP 7: Clearing active game state' });
      console.log('🔴 STEP 7: Clearing active game state');

      // Immediately clear the active game state (don't wait for watchdog)
      clearActiveGame();

      await invoke('log_message', { message: '✅ Game killed - closing overlay' });

      if (isOverlayWindow) {
        // In overlay: hide overlay and restore main window (home screen)
        await invoke('hide_game_overlay');
        await invoke('show_main_window');
      } else {
        // In main window: close sidebars and show dashboard
        closeAllSidebars();
        await getCurrentWindow().show();
      }
    } catch (error) {
      await invoke('log_message', { message: `❌ Error closing game: ${String(error)}` });
      if (isOverlayWindow) {
        await invoke('hide_game_overlay');
        await invoke('show_main_window');
      } else {
        closeAllSidebars();
        await getCurrentWindow().show();
      }
    } finally {
      setIsClosingGame(false);
    }
  };

  const handleCloseGameCancelled = () => {
    setShowCloseConfirm(false);
  };

  /**
   * Return to Home — hides the overlay and shows the launcher WITHOUT closing the game.
   * The game keeps running in the background.
   */
  const handleReturnToHome = async () => {
    if (isOverlayWindow) {
      await invoke('hide_game_overlay');
      await invoke('show_main_window');
    } else {
      closeAllSidebars();
    }
  };

  const handleClose = () => {
    // Don't close if QuickSettings or confirm dialog are open
    if (!isQuickSettingsOpen && !showCloseConfirm) {
      void handleResume();
    }
  };

  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={handleClose}
      title={activeGame?.game.title ?? 'In-Game Menu'}
      side="left"
      width="30%"
      className="in-game-menu-panel"
      enableBlur={!isOverlayWindow && !isQuickSettingsOpen}
      enableBackground={!isOverlayWindow && !isQuickSettingsOpen}
      header={
        <div className="game-header">
          {activeGame?.game.image ? (
            <img
              src={getCachedAssetSrc(activeGame.game.image, activeGame.game.image)}
              alt={`${activeGame.game.title} cover`}
              className="game-cover"
            />
          ) : null}
          <div className="game-info">
            <h2 className="game-title">{activeGame?.game.title ?? 'In-Game Menu'}</h2>
            <p className="game-session">Playing now</p>
          </div>
        </div>
      }
      footer={
        <div className="button-hints">
          <span className="hint">
            <kbd>B</kbd> Back
          </span>
          <span className="hint">
            <kbd>A</kbd> Select
          </span>
        </div>
      }
    >
      {/* Stats Section */}
      <section className="stats-section">
        <div className="game-stats">
          <span className="stat-item">
            {isFpsLoading ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                  style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}
                />
                Loading FPS...
              </>
            ) : metrics?.fps?.current_fps ? (
              `${Math.round(metrics.fps.current_fps)} FPS`
            ) : (
              'FPS N/A'
            )}
          </span>
          <span className="stat-divider">•</span>
          <span className="stat-item">
            {metrics?.gpu_temp_c ? `GPU ${Math.round(metrics.gpu_temp_c)}°C` : 'GPU Temp N/A'}
          </span>
        </div>
      </section>

      {/* Actions Section */}
      <section className="actions-section">
        <div className="menu-actions">
          <Button
            id="overlay-btn-0"
            variant="primary"
            size="lg"
            icon={
              <IconWrapper size="lg">
                <Play />
              </IconWrapper>
            }
            onClick={() => void handleResume()}
            fullWidth
          >
            Resume Game
          </Button>

          <Button
            id="overlay-btn-1"
            variant="secondary"
            size="lg"
            icon={
              <IconWrapper size="lg">
                <Settings />
              </IconWrapper>
            }
            onClick={handleOpenQuickSettings}
            fullWidth
          >
            Quick Settings
          </Button>

          <Button
            id="overlay-btn-2"
            variant="danger"
            size="lg"
            icon={
              <IconWrapper size="lg">
                <X />
              </IconWrapper>
            }
            onClick={handleCloseGameRequest}
            disabled={isClosingGame}
            fullWidth
          >
            {isClosingGame ? 'Closing Game...' : 'Close Game'}
          </Button>

          <Button
            id="overlay-btn-3"
            variant="ghost"
            size="lg"
            icon={
              <IconWrapper size="lg">
                <Home />
              </IconWrapper>
            }
            onClick={() => void handleReturnToHome()}
            fullWidth
          >
            Return to Home
          </Button>
        </div>
      </section>

      {/* Confirmation Dialog */}
      {showCloseConfirm ? (
        <div className="confirm-dialog">
          <SectionHeader level={3}>Close Game?</SectionHeader>
          <p>Are you sure you want to close {activeGame?.game.title}?</p>
          <div className="confirm-actions">
            <Button variant="secondary" size="md" onClick={handleCloseGameCancelled}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={() => void handleCloseGameConfirmed()}>
              Close Game
            </Button>
          </div>
        </div>
      ) : null}
    </OverlayPanel>
  );
});
