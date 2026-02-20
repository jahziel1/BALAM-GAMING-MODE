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
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Loader2, Play, Settings, X } from 'lucide-react';
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
  const { overlay, game, closeLeftSidebar, openRightSidebar, closeAllSidebars, clearActiveGame } =
    useAppStore();

  // Local state
  const [isClosingGame, setIsClosingGame] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isFpsLoading, setIsFpsLoading] = useState(true);

  const isOpen = overlay.leftSidebarOpen;
  const activeGame = game.activeRunningGame;
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
   */
  const handleResume = async () => {
    await invoke('log_message', { message: '🔴 handleResume called - hiding window' });
    console.log('🔴 handleResume called - hiding window');
    closeLeftSidebar();
    await getCurrentWindow().hide();
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
    // Send logs to backend terminal so we can see them during gameplay
    await invoke('log_message', { message: '🔴 FRONTEND STEP 1: handleCloseGameConfirmed called' });
    console.log('🔴 STEP 1: handleCloseGameConfirmed called');
    console.log('activeGame:', activeGame);

    if (!activeGame) {
      await invoke('log_message', {
        message: '❌ FRONTEND: No game is currently running (activeGame is null)',
      });
      console.warn('❌ No game is currently running');
      return;
    }

    const gameId = activeGame.game.id;
    const gamePid = activeGame.pid;
    await invoke('log_message', {
      message: `🔴 FRONTEND STEP 2: Got game ID: ${gameId}, PID: ${gamePid ?? 'null (Steam/Xbox)'}`,
    });
    console.log('🔴 STEP 2: Got game ID:', gameId, 'PID:', gamePid);

    try {
      await invoke('log_message', { message: '🔴 FRONTEND STEP 3: Setting isClosingGame = true' });
      console.log('🔴 STEP 3: Setting isClosingGame = true');
      setIsClosingGame(true);

      await invoke('log_message', { message: '🔴 FRONTEND STEP 4: Closing confirmation dialog' });
      console.log('🔴 STEP 4: Closing confirmation dialog');
      setShowCloseConfirm(false);

      // Use kill_game with PID (works for Steam with PID=0, Xbox, and native games)
      await invoke('log_message', {
        message: `🔴 FRONTEND STEP 5: Calling kill_game with PID: ${gamePid}`,
      });
      console.log('🔴 STEP 5: Calling kill_game with PID:', gamePid);

      // kill_game handles PID=0 for Steam/Xbox games
      await invoke('kill_game', {
        pid: gamePid,
      });

      await invoke('log_message', { message: '✅ FRONTEND STEP 6: Game killed successfully' });
      console.log('✅ STEP 6: Game killed successfully');

      await invoke('log_message', { message: '🔴 FRONTEND STEP 7: Clearing active game state' });
      console.log('🔴 STEP 7: Clearing active game state');

      // Immediately clear the active game state (don't wait for watchdog)
      clearActiveGame();

      await invoke('log_message', { message: '🔴 FRONTEND STEP 8: Closing all sidebars' });
      console.log('🔴 STEP 8: Closing all sidebars');
      closeAllSidebars();

      await invoke('log_message', { message: '🔴 FRONTEND STEP 9: Showing window' });
      console.log('🔴 STEP 9: Showing window');
      await getCurrentWindow().show();

      await invoke('log_message', {
        message: '✅ FRONTEND STEP 9: Close game completed successfully',
      });
      console.log('✅ STEP 9: Close game completed successfully');
    } catch (error) {
      console.error('❌ ERROR IN STEP:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Still close sidebar and show dashboard even if close failed
      console.log('🔴 Attempting recovery: closing sidebars');
      closeAllSidebars();

      console.log('🔴 Attempting recovery: showing window');
      await getCurrentWindow().show();
    } finally {
      console.log('🔴 STEP 10 (finally): Setting isClosingGame = false');
      setIsClosingGame(false);
    }
  };

  const handleCloseGameCancelled = () => {
    setShowCloseConfirm(false);
  };

  const handleClose = () => {
    // Only close if QuickSettings is NOT open
    // Otherwise clicking on QuickSettings would close everything
    if (!isQuickSettingsOpen) {
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
      enableBlur={!isQuickSettingsOpen}
      enableBackground={!isQuickSettingsOpen}
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
