import './App.css';

import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Zustand stores
import { useAppStore, useGameStore } from './application/providers/StoreProvider';
import defaultCover from './assets/default_cover.png';
// Modular Components
import {
  ConfirmationModal,
  ErrorBoundary,
  HeroSection,
  LibrarySection,
  OverlayManager,
} from './components/App';
import { Footer, Sidebar, TopBar } from './components/layout';
import { MENU_ITEMS } from './components/layout/Sidebar/Sidebar';
import { PipWindowContent, SystemOSD } from './components/overlay';
import { FilterChips, type FilterType } from './components/ui/FilterChips';

// Lazy load heavy overlay components
const PowerModal = lazy(() =>
  import('./components/overlay/PowerModal/PowerModal').then((m) => ({ default: m.PowerModal }))
);
import { InputDeviceType } from './domain/input/InputDevice';
import { useAudio } from './hooks/useAudio';
import { useHaptic } from './hooks/useHaptic';
import { useInputDevice } from './hooks/useInputDevice';
// Hooks
import { useNavigation } from './hooks/useNavigation';
import { usePipWindow } from './hooks/usePipWindow';
import { useVirtualKeyboard } from './hooks/useVirtualKeyboard';
// Database
import { addPlayTime, initDatabase, toggleFavorite } from './services/database';
import { getCachedAssetSrc } from './utils/image-cache';

function App() {
  // ============================================================================
  // PIP WINDOW DETECTION
  // ============================================================================
  const [isPipWindow] = useState<boolean>(() => {
    try {
      const currentWindow = getCurrentWindow();
      const windowLabel = currentWindow.label;
      return windowLabel === 'performance-pip';
    } catch (error) {
      console.error('Failed to get window label:', error);
      return false;
    }
  });

  // ============================================================================
  // STORES & DATA
  // ============================================================================
  const {
    games,
    isLaunching,
    activeRunningGame,
    launchGame: launchGameById,
    clearActiveGame,
    killGame: killGameByPid,
    addManualGame: addManualGameStore,
    removeGame,
    loadGames,
  } = useGameStore();

  const { openRightSidebar, openLeftSidebar } = useAppStore();

  // PiP window management (auto-detects if running in main window)
  usePipWindow();

  // Haptic feedback
  const { hapticEvent } = useHaptic();

  // Audio feedback
  const { audioLaunch } = useAudio();

  // Initialize database on mount
  useEffect(() => {
    void initDatabase().catch((error) => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  // Load games on mount
  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  // Listen for game-ended events from backend
  useEffect(() => {
    const unlisten = listen<{ game_id: string; play_time_seconds: number }>(
      'game-ended',
      (event) => {
        void (async () => {
          const { game_id, play_time_seconds } = event.payload;
          console.warn(
            `🎮 Game ended: ${game_id} (played ${play_time_seconds}s = ${(play_time_seconds / 60).toFixed(1)}min)`
          );

          // Find the game in the current games list to get the path
          const game = games.find((g) => g.id === game_id);

          if (game && play_time_seconds > 0) {
            try {
              // Update play time in database
              await addPlayTime(game.path, play_time_seconds);
              console.warn(`✅ Play time updated: +${play_time_seconds}s for ${game.title}`);

              // Reload games to reflect updated stats
              await loadGames();
            } catch (error) {
              console.error('Failed to update play time:', error);
            }
          }

          clearActiveGame();
        })();
      }
    );

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [clearActiveGame, games, loadGames]);

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWiFiPanelOpen, setIsWiFiPanelOpen] = useState(false);
  const [isBluetoothPanelOpen, setIsBluetoothPanelOpen] = useState(false);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);
  const [pendingLaunchIndex, setPendingLaunchIndex] = useState<number | null>(null);
  const [osdValue, setOsdValue] = useState(75);
  const [isOsdVisible, setIsOsdVisible] = useState(false);
  const osdTimeout = useRef<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Fix #8: Global keyboard shortcuts for search (Ctrl+K, Ctrl+F)
  useEffect(() => {
    const handleGlobalKeyboard = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Ctrl+F or Cmd+F (Mac) - only if not in an input
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault();
          setIsSearchOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyboard);
    return () => window.removeEventListener('keydown', handleGlobalKeyboard);
  }, []);

  // ============================================================================
  // INPUT DEVICE DETECTION
  // ============================================================================
  const { deviceType } = useInputDevice();
  const controllerType: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC' =
    deviceType === InputDeviceType.GAMEPAD ? 'GENERIC' : 'KEYBOARD';

  // ============================================================================
  // CALLBACKS
  // ============================================================================
  const launchGame = useCallback(
    (game: { id: string }) => {
      void launchGameById(game.id);
    },
    [launchGameById]
  );

  const killGame = useCallback(() => {
    if (activeRunningGame?.pid) {
      void killGameByPid(activeRunningGame.pid);
    }
  }, [killGameByPid, activeRunningGame]);

  const addManualGame = useCallback(
    (path: string, title: string) => {
      return addManualGameStore(title, path); // Reversed parameters
    },
    [addManualGameStore]
  );

  const handleVolumeChange = useCallback((newVolume: number) => {
    setOsdValue(newVolume);
    setIsOsdVisible(true);
    if (osdTimeout.current) window.clearTimeout(osdTimeout.current);
    osdTimeout.current = window.setTimeout(() => setIsOsdVisible(false), 2000);
  }, []);

  // ============================================================================
  // NAVIGATION HOOK - Declared first to get setInGameMenuOpen
  // ============================================================================
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleQuitRef = useRef<() => void>(() => {});
  const quickSettingsAdjustRef = useRef<((direction: number) => void) | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleLaunchRawRef = useRef<(index: number) => void>(() => {});
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleSidebarActionRef = useRef<(id: string) => void>(() => {});

  const {
    focusArea,
    setFocusArea,
    isSidebarOpen,
    setSidebarOpen,
    setInGameMenuOpen,
    activeIndex,
    setActiveIndex,
    sidebarIndex,
    setSidebarIndex,
    quickSettingsSliderIndex,
    setQuickSettingsSliderIndex,
  } = useNavigation(
    games.length,
    MENU_ITEMS.length,
    (index) => handleLaunchRawRef.current(index),
    (index) => {
      const item = MENU_ITEMS[index];
      if (item) {
        void handleSidebarActionRef.current(item.id);
      }
    },
    () => handleQuitRef.current(),
    activeRunningGame,
    isExplorerOpen, // Search overlay has its own focus area, no need to disable navigation
    (direction: number) => {
      if (quickSettingsAdjustRef.current) {
        quickSettingsAdjustRef.current(direction);
      }
    }
  );

  // ============================================================================
  // SEARCH CALLBACKS - Declared after useNavigation to access setFocusArea
  // ============================================================================
  // Fix #23: Memoized search callbacks to prevent re-renders
  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setFocusArea('HERO');
  }, [setFocusArea]);

  const handleLaunchFromSearch = useCallback(
    (game: { id: string }) => {
      launchGame(game);
      setIsSearchOpen(false);
      setFocusArea('HERO');
      void getCurrentWindow().hide();
    },
    [launchGame, setFocusArea]
  );

  // ============================================================================
  // GAME LAUNCH LOGIC - Now has access to setInGameMenuOpen
  // ============================================================================
  const handleLaunchRaw = useCallback(
    (index: number) => {
      const gameToLaunch = games[index];
      if (!gameToLaunch) return;

      // If clicking on currently running game, resume instead
      if (activeRunningGame && String(activeRunningGame.game.id) === String(gameToLaunch.id)) {
        console.warn('Launch requested for running game -> Resuming instead.');
        setInGameMenuOpen(false);
        void getCurrentWindow().hide();
        return;
      }

      // If switching games, ask for confirmation
      if (activeRunningGame && activeRunningGame.game.id !== gameToLaunch.id) {
        setPendingLaunchIndex(index);
        return;
      }

      // Otherwise launch immediately
      launchGame(gameToLaunch);
      void hapticEvent(); // Trigger haptic feedback for game launch
      audioLaunch(); // Play launch sound effect
      void getCurrentWindow().hide();
    },
    [games, launchGame, activeRunningGame, setInGameMenuOpen, hapticEvent, audioLaunch]
  );

  // ============================================================================
  // FAVORITE TOGGLE LOGIC
  // ============================================================================
  const handleToggleFavorite = useCallback(
    async (gameId: string) => {
      const game = games.find((g) => g.id === gameId);
      if (!game) return;

      try {
        // Toggle favorite in database
        await toggleFavorite(game.path);
        // Reload games to reflect the change
        await loadGames();
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      }
    },
    [games, loadGames]
  );

  // ============================================================================
  // FILTER CHANGE LOGIC
  // ============================================================================
  const handleFilterChange = useCallback(
    (filter: FilterType) => {
      setActiveFilter(filter);
      // Reset active index when filter changes
      setActiveIndex(0);
    },
    [setActiveIndex]
  );

  // Update ref
  useEffect(() => {
    handleLaunchRawRef.current = handleLaunchRaw;
  }, [handleLaunchRaw]);

  // Sync search overlay with focus area
  useEffect(() => {
    if (isSearchOpen) {
      setFocusArea('SEARCH');
    }
  }, [isSearchOpen, setFocusArea]);

  // ============================================================================
  // QUIT HANDLER
  // ============================================================================
  const handleQuit = useCallback(() => {
    if (activeRunningGame) {
      killGame();
      setInGameMenuOpen(false);
      setFocusArea('HERO');
    }
  }, [activeRunningGame, killGame, setInGameMenuOpen, setFocusArea]);

  useEffect(() => {
    handleQuitRef.current = handleQuit;
  }, [handleQuit]);

  // ============================================================================
  // SIDEBAR ACTIONS
  // ============================================================================
  const handleSidebarAction = useCallback(
    async (id: string) => {
      switch (id) {
        case 'home':
          setFocusArea('HERO');
          setSidebarOpen(false);
          break;
        case 'library':
          setFocusArea('LIBRARY');
          setSidebarOpen(false);
          break;
        case 'add-game':
          setIsExplorerOpen(true);
          setSidebarOpen(false);
          break;
        case 'search':
          setIsSearchOpen(true);
          setSidebarOpen(false);
          break;
        case 'settings':
          setIsSettingsOpen(true);
          setSidebarOpen(false);
          break;
        case 'desktop':
          await getCurrentWindow().minimize();
          setSidebarOpen(false);
          break;
        case 'power':
          setIsPowerModalOpen(true);
          setSidebarOpen(false);
          break;
        default:
          setSidebarOpen(false);
      }
    },
    [setSidebarOpen, setFocusArea]
  );

  // Update ref
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    handleSidebarActionRef.current = handleSidebarAction;
  }, [handleSidebarAction]);

  // ============================================================================
  // MANUAL GAME ADD
  // ============================================================================
  const handleSelectManualGame = useCallback(
    async (path: string, title: string) => {
      try {
        await addManualGame(path, title);
        setIsExplorerOpen(false);
      } catch (err) {
        console.error('Manual add failed:', err);
      }
    },
    [addManualGame]
  );

  // ============================================================================
  // VIRTUAL KEYBOARD
  // ============================================================================
  const handleKeyboardOpen = useCallback(() => {
    setFocusArea('VIRTUAL_KEYBOARD');
  }, [setFocusArea]);

  const handleKeyboardClose = useCallback(() => {
    setFocusArea('HERO');
  }, [setFocusArea]);

  const handleKeyboardTextChange = useCallback((text: string) => {
    window.dispatchEvent(new CustomEvent('virtual-keyboard-text-change', { detail: text }));
  }, []);

  // Ref for SearchOverlay input (for virtual keyboard integration)
  const searchInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const handleRegisterSearchInput = useCallback((ref: React.RefObject<HTMLInputElement>) => {
    searchInputRef.current = ref.current;
  }, []);

  const virtualKeyboard = useVirtualKeyboard({
    onOpen: handleKeyboardOpen,
    onClose: handleKeyboardClose,
    onTextChange: handleKeyboardTextChange,
    targetInputRef: searchInputRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  });

  // Sync: Close virtual keyboard when SearchOverlay closes
  useEffect(() => {
    if (!isSearchOpen && virtualKeyboard.isOpen) {
      // Clear the input ref when search closes
      searchInputRef.current = null;
      virtualKeyboard.close();
    }
  }, [isSearchOpen, virtualKeyboard]);

  // ============================================================================
  // GLOBAL SHORTCUT LISTENER
  // ============================================================================
  useEffect(() => {
    const unlisten = listen('toggle-overlay', () => {
      void (async () => {
        const win = getCurrentWindow();
        if (await win.isVisible()) {
          await win.setFocus();
          openLeftSidebar();
        } else {
          await win.show();
          await win.setFocus();
          openLeftSidebar();
        }
      })();
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [openLeftSidebar]);

  // Volume change listener
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<number>('volume-changed', (event) => {
        handleVolumeChange(event.payload);
      });
      return unlisten;
    };
    const unlistenPromise = setupListener();
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [handleVolumeChange]);

  // WiFi Panel toggle listener (Ctrl+W)
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen('toggle-wifi-panel', () => {
        setIsWiFiPanelOpen((prev) => !prev);
      });
      return unlisten;
    };
    const unlistenPromise = setupListener();
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Bluetooth Panel toggle listener (Ctrl+B)
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen('toggle-bluetooth-panel', () => {
        setIsBluetoothPanelOpen((prev) => !prev);
      });
      return unlisten;
    };
    const unlistenPromise = setupListener();
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  // Filter games based on active filter
  const filteredGames = useMemo(() => {
    switch (activeFilter) {
      case 'favorites':
        return games.filter((game) => game.is_favorite === 1);
      case 'recents':
        return games
          .filter((game) => game.last_played !== null)
          .sort((a, b) => (b.last_played ?? 0) - (a.last_played ?? 0))
          .slice(0, 20);
      case 'steam':
        return games.filter((game) => game.source === 'Steam');
      case 'epic':
        return games.filter((game) => game.source === 'Epic');
      case 'xbox':
        return games.filter((game) => game.source === 'Xbox');
      case 'battlenet':
        return games.filter((game) => game.source === 'BattleNet');
      case 'manual':
        return games.filter((game) => game.source === 'Manual');
      case 'all':
      default:
        return games;
    }
  }, [games, activeFilter]);

  const activeGame = filteredGames[activeIndex] ?? filteredGames[0];
  const backgroundImage = getCachedAssetSrc(
    activeGame?.hero_image ?? activeGame?.image,
    defaultCover
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  // PiP Window: Only render the performance overlay
  if (isPipWindow) {
    return <PipWindowContent />;
  }

  // Main Window: Render full app
  return (
    <ErrorBoundary>
      <div className="app-background" style={{ backgroundImage: `url(${backgroundImage})` }} />
      <div className="app-overlay" />
      <SystemOSD type="volume" value={osdValue} isVisible={isOsdVisible} />

      {!isSidebarOpen && (
        <div
          className="menu-hint-area"
          onMouseEnter={() => setSidebarOpen(true)}
          onClick={() => setSidebarOpen(true)}
        >
          <div className="menu-glow-line" />
        </div>
      )}

      {isSidebarOpen ? (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <Sidebar
        isOpen={isSidebarOpen}
        focusedIndex={sidebarIndex}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        onAction={(id) => void handleSidebarAction(id)}
        onFocusItem={setSidebarIndex}
      />

      <div className="app-container" data-focus-area={focusArea}>
        <TopBar
          onVolumeChange={handleVolumeChange}
          onOpenWiFiPanel={() => setIsWiFiPanelOpen(true)}
          onOpenBluetoothPanel={() => setIsBluetoothPanelOpen(true)}
        />

        <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          <HeroSection
            activeGame={activeGame}
            activeRunningGame={activeRunningGame}
            focusArea={focusArea}
            isLaunching={isLaunching}
            isFavorite={activeGame?.is_favorite === 1}
            onSetFocusArea={setFocusArea}
            onSetInGameMenuOpen={setInGameMenuOpen}
            onLaunchGame={() => void handleLaunchRaw(activeIndex)}
            onRemoveGame={(id) => void removeGame(id)}
            onToggleFavorite={(id) => void handleToggleFavorite(id)}
          />

          <FilterChips
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            gameCount={filteredGames.length}
          />

          <LibrarySection
            games={filteredGames}
            activeIndex={activeIndex}
            focusArea={focusArea}
            onLaunchGame={(_game, index) => handleLaunchRaw(index)}
            onSetActiveIndex={setActiveIndex}
            onSetFocusArea={setFocusArea}
          />
        </main>

        <Footer controllerType={controllerType} />
      </div>

      <div className="gamepad-status-tag">Input: {deviceType}</div>

      <ConfirmationModal
        pendingGame={pendingLaunchIndex !== null ? games[pendingLaunchIndex] : null}
        activeRunningGame={activeRunningGame}
        onConfirm={() => {
          if (pendingLaunchIndex !== null) {
            const game = games[pendingLaunchIndex];
            if (game) {
              launchGame(game);
              void getCurrentWindow().hide();
            }
            setPendingLaunchIndex(null);
          }
        }}
        onCancel={() => setPendingLaunchIndex(null)}
      />

      <OverlayManager
        isExplorerOpen={isExplorerOpen}
        onCloseExplorer={() => setIsExplorerOpen(false)}
        onSelectManualGame={handleSelectManualGame}
        isSearchOpen={isSearchOpen}
        onCloseSearch={handleCloseSearch}
        games={games}
        onLaunchFromSearch={handleLaunchFromSearch}
        onRegisterSearchInput={handleRegisterSearchInput}
        onOpenVirtualKeyboard={virtualKeyboard.open}
        isSettingsOpen={isSettingsOpen}
        onCloseSettings={() => setIsSettingsOpen(false)}
        onOpenQuickSettingsFromSettings={() => {
          setIsSettingsOpen(false);
          openRightSidebar();
        }}
        quickSettingsSliderIndex={quickSettingsSliderIndex}
        onQuickSettingsFocusChange={setQuickSettingsSliderIndex}
        onRegisterQuickSettingsAdjustHandler={(handler) => {
          quickSettingsAdjustRef.current = handler;
        }}
        onOpenWiFiPanel={() => setIsWiFiPanelOpen(true)}
        onOpenBluetoothPanel={() => setIsBluetoothPanelOpen(true)}
        isWiFiPanelOpen={isWiFiPanelOpen}
        onCloseWiFiPanel={() => setIsWiFiPanelOpen(false)}
        isBluetoothPanelOpen={isBluetoothPanelOpen}
        onCloseBluetoothPanel={() => setIsBluetoothPanelOpen(false)}
        virtualKeyboard={virtualKeyboard}
        controllerType={controllerType}
      />

      <Suspense fallback={null}>
        <PowerModal isOpen={isPowerModalOpen} onClose={() => setIsPowerModalOpen(false)} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
