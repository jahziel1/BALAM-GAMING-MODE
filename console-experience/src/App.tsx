import './App.css';

import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// TypeScript interface for dev-mode window globals
declare global {
  interface Window {
    __TOGGLE_WIFI__?: () => void;
    __TOGGLE_BLUETOOTH__?: () => void;
    __OPEN_EXPLORER__?: () => void;
    __CLOSE_EXPLORER__?: () => void;
    __OPEN_SETTINGS__?: () => void;
    __CLOSE_SETTINGS__?: () => void;
    __OPEN_POWER__?: () => void;
    __CLOSE_POWER__?: () => void;
  }
}

// Zustand stores
import { useAppStore, useGameStore } from './application/providers/StoreProvider';
import defaultCover from './assets/default_cover.png';
// Modular Components
import {
  buildCarousels,
  ConfirmationModal,
  ErrorBoundary,
  HeroSection,
  LibrarySection,
  OverlayManager,
} from './components/App';
import { Footer, Sidebar, TopBar } from './components/layout';
import { MENU_ITEMS } from './components/layout/Sidebar/Sidebar';
import { InGameMenuOptimized, PipWindowContent, SystemOSD } from './components/overlay';
import { KeyboardShortcutsPanel } from './components/overlay/KeyboardShortcutsPanel/KeyboardShortcutsPanel';
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
import { useToast } from './hooks/useToast';
import { useVirtualKeyboard } from './hooks/useVirtualKeyboard';
// Database
import { addPlayTime, initDatabase, toggleFavorite } from './services/database';
import { getCachedAssetSrc } from './utils/image-cache';

function App() {
  // ============================================================================
  // WINDOW TYPE DETECTION
  // ============================================================================
  const [windowType] = useState<'main' | 'pip' | 'overlay'>(() => {
    try {
      const currentWindow = getCurrentWindow();
      const windowLabel = currentWindow.label;

      if (windowLabel === 'performance-pip') return 'pip';
      if (windowLabel === 'overlay') return 'overlay';
      return 'main';
    } catch (error) {
      console.error('Failed to get window label:', error);
      return 'main';
    }
  });

  const isPipWindow = windowType === 'pip';
  const isOverlayWindow = windowType === 'overlay';

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

  const { overlay, openRightSidebar, settings } = useAppStore();

  // Apply CSS classes to <html> based on settings
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('no-animations', !settings.animationsEnabled);
    html.classList.toggle('no-blur', !settings.blurEffects);
  }, [settings.animationsEnabled, settings.blurEffects]);

  // PiP window management (auto-detects if running in main window)
  usePipWindow();

  // Haptic feedback
  const { hapticEvent } = useHaptic();

  // Audio feedback
  const { audioLaunch } = useAudio();

  // Toast notifications
  const { error: showErrorToast } = useToast();

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
            } catch {
              showErrorToast(
                'Failed to update play time',
                'Your play session may not have been saved'
              );
            }
          }

          clearActiveGame();
        })();
      }
    );

    return () => {
      void unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [pendingLaunchIndex, setPendingLaunchIndex] = useState<number | null>(null);
  const [osdValue, setOsdValue] = useState(75);
  const [isOsdVisible, setIsOsdVisible] = useState(false);
  const osdTimeout = useRef<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Fix #8: Global keyboard shortcuts for search (Ctrl+K, Ctrl+F) and help (F1, ?)
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
      // F1 or ? - Open keyboard shortcuts panel
      if (e.key === 'F1' || e.key === '?') {
        e.preventDefault();
        setIsKeyboardShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyboard);
    return () => window.removeEventListener('keydown', handleGlobalKeyboard);
  }, []);

  // ============================================================================
  // INPUT DEVICE DETECTION
  // ============================================================================
  const { deviceType } = useInputDevice();
  const [controllerType, setControllerType] = useState<
    'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC'
  >('KEYBOARD');

  // Listen to Tauri controller-type-changed for accurate brand detection
  useEffect(() => {
    const unlisten = listen<string>('controller-type-changed', (e) => {
      setControllerType(e.payload as 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC');
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, []);

  // Fall back to KEYBOARD layout when mouse/keyboard is the active device
  useEffect(() => {
    if (deviceType !== InputDeviceType.GAMEPAD) {
      setControllerType('KEYBOARD');
    }
  }, [deviceType]);

  // Hide cursor when gamepad is active so it doesn't visually overlap the gamepad
  // selection indicator. Moving the mouse restores the cursor automatically because
  // InputDeviceDetector switches deviceType back to KEYBOARD/MOUSE on mouse movement.
  useEffect(() => {
    document.body.classList.toggle('gamepad-active', deviceType === InputDeviceType.GAMEPAD);
  }, [deviceType]);

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
  // ============================================================================
  // FILTERED GAMES + CAROUSEL OFFSETS - Declared before useNavigation
  // ============================================================================
  const filteredGamesForNav = useMemo(() => {
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

  const carouselOffsets = useMemo(() => {
    const carousels = buildCarousels(filteredGamesForNav);
    return carousels.map((_, i) =>
      carousels.slice(0, i).reduce((sum, c) => sum + c.games.length, 0)
    );
  }, [filteredGamesForNav]);

  // ============================================================================
  // NAVIGATION HOOK - Declared first to get setInGameMenuOpen
  // ============================================================================
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleQuitRef = useRef<() => void>(() => {});
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
  } = useNavigation(
    filteredGamesForNav.length,
    carouselOffsets,
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
    isExplorerOpen,
    isSearchOpen
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

  // Reset focus area when ALL overlay panels close so the main library becomes navigable again.
  // NOTE: We no longer set focusArea='OVERLAY' here — useNavigation detects open modals via live
  // DOM queries (no async timing gap) so the gamepad works the moment a panel enters the DOM.
  const anyOverlayOpen =
    overlay.leftSidebarOpen ||
    overlay.rightSidebarOpen ||
    isSearchOpen ||
    isSettingsOpen ||
    isWiFiPanelOpen ||
    isBluetoothPanelOpen ||
    isPowerModalOpen ||
    isKeyboardShortcutsOpen ||
    isExplorerOpen;
  useEffect(() => {
    if (!anyOverlayOpen) {
      setFocusArea('HERO');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyOverlayOpen]);

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
    // Return to search context if search overlay is still open
    setFocusArea(isSearchOpen ? 'SEARCH' : 'HERO');
  }, [setFocusArea, isSearchOpen]);

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
  // REMOVED: toggle-overlay listener (obsolete)
  // Now using toggle_game_overlay() command directly from backend
  // which creates dedicated overlay window instead of showing main window

  // Volume change listener
  useEffect(() => {
    let cancelled = false;
    let unlistenFn: (() => void) | undefined;
    void listen<number>('volume-changed', (event) => {
      handleVolumeChange(event.payload);
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlistenFn = fn;
      }
    });
    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, [handleVolumeChange]);

  // WiFi Panel toggle listener (Ctrl+W)
  useEffect(() => {
    let cancelled = false;
    let unlistenFn: (() => void) | undefined;
    void listen('toggle-wifi-panel', () => {
      setIsWiFiPanelOpen((prev) => !prev);
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlistenFn = fn;
      }
    });
    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, []);

  // Bluetooth Panel toggle listener (Ctrl+B)
  useEffect(() => {
    let cancelled = false;
    let unlistenFn: (() => void) | undefined;
    void listen('toggle-bluetooth-panel', () => {
      setIsBluetoothPanelOpen((prev) => !prev);
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlistenFn = fn;
      }
    });
    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, []);

  // DEV-mode: expose toggle/open functions for E2E tests (local state overlays)
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__TOGGLE_WIFI__ = () => setIsWiFiPanelOpen((prev) => !prev);
      window.__TOGGLE_BLUETOOTH__ = () => setIsBluetoothPanelOpen((prev) => !prev);
      window.__OPEN_EXPLORER__ = () => setIsExplorerOpen(true);
      window.__CLOSE_EXPLORER__ = () => setIsExplorerOpen(false);
      window.__OPEN_SETTINGS__ = () => setIsSettingsOpen(true);
      window.__CLOSE_SETTINGS__ = () => setIsSettingsOpen(false);
      window.__OPEN_POWER__ = () => setIsPowerModalOpen(true);
      window.__CLOSE_POWER__ = () => setIsPowerModalOpen(false);
    }
    return () => {
      if (import.meta.env.DEV) {
        delete window.__TOGGLE_WIFI__;
        delete window.__TOGGLE_BLUETOOTH__;
        delete window.__OPEN_EXPLORER__;
        delete window.__CLOSE_EXPLORER__;
        delete window.__OPEN_SETTINGS__;
        delete window.__CLOSE_SETTINGS__;
        delete window.__OPEN_POWER__;
        delete window.__CLOSE_POWER__;
      }
    };
  }, []);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  // filteredGames is the same computation as filteredGamesForNav (computed earlier for useNavigation)
  const filteredGames = filteredGamesForNav;

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

  // Overlay Window: Only render the InGameMenu
  if (isOverlayWindow) {
    // Auto-open InGameMenu when overlay window loads
    const { openLeftSidebar } = useAppStore();
    useEffect(() => {
      openLeftSidebar();
    }, [openLeftSidebar]);

    return (
      <ErrorBoundary>
        <InGameMenuOptimized />
      </ErrorBoundary>
    );
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
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        onAction={(id) => void handleSidebarAction(id)}
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

      {/* Keyboard Shortcuts Help Panel (F1 or ?) */}
      <KeyboardShortcutsPanel
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />
    </ErrorBoundary>
  );
}

export default App;
