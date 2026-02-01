import './App.css';

import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback, useEffect, useRef, useState } from 'react';

// Zustand stores
import { useGameStore } from './application/providers/StoreProvider';
import { useOverlayStore } from './application/stores/overlay-store';
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
import { SystemOSD } from './components/overlay';
import { InputDeviceType } from './domain/input/InputDevice';
import { useInputDevice } from './hooks/useInputDevice';
// Hooks
import { useNavigation } from './hooks/useNavigation';
import { useVirtualKeyboard } from './hooks/useVirtualKeyboard';
import { getCachedAssetSrc } from './utils/image-cache';

function App() {
  // ============================================================================
  // STORES & DATA
  // ============================================================================
  const {
    games,
    isLaunching,
    activeRunningGame,
    launchGame: launchGameById,
    killGame: killGameByPid,
    addManualGame: addManualGameStore,
    removeGame,
    loadGames,
  } = useGameStore();

  const { showOverlay, hideOverlay, currentOverlay } = useOverlayStore();

  // Load games on mount
  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingLaunchIndex, setPendingLaunchIndex] = useState<number | null>(null);
  const [osdValue, setOsdValue] = useState(75);
  const [isOsdVisible, setIsOsdVisible] = useState(false);
  const osdTimeout = useRef<number | null>(null);

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
    isInGameMenuOpen,
    setInGameMenuOpen,
    isQuickSettingsOpen,
    setQuickSettingsOpen,
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
      void getCurrentWindow().hide();
    },
    [games, launchGame, activeRunningGame, setInGameMenuOpen]
  );

  // Update ref
  useEffect(() => {
    handleLaunchRawRef.current = handleLaunchRaw;
  }, [handleLaunchRaw]);

  // Sync overlay-store with navigation state
  useEffect(() => {
    if (isInGameMenuOpen) {
      showOverlay('inGameMenu');
    } else if (currentOverlay === 'inGameMenu') {
      hideOverlay();
    }
  }, [isInGameMenuOpen, showOverlay, hideOverlay, currentOverlay]);

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
          setSidebarOpen(false);
          break;
        case 'desktop':
          await getCurrentWindow().minimize();
          setSidebarOpen(false);
          break;
        case 'power':
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
          showOverlay('inGameMenu');
        } else {
          await win.show();
          await win.setFocus();
          showOverlay('inGameMenu');
        }
      })();
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [showOverlay]);

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

  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  const activeGame = games[activeIndex] ?? games[0];
  const backgroundImage = getCachedAssetSrc(
    activeGame?.hero_image ?? activeGame?.image,
    defaultCover
  );

  // ============================================================================
  // RENDER
  // ============================================================================
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
        <TopBar onVolumeChange={handleVolumeChange} />

        <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          <HeroSection
            activeGame={activeGame}
            activeRunningGame={activeRunningGame}
            focusArea={focusArea}
            isLaunching={isLaunching}
            onSetFocusArea={setFocusArea}
            onSetInGameMenuOpen={setInGameMenuOpen}
            onLaunchGame={() => void handleLaunchRaw(activeIndex)}
            onRemoveGame={(id) => void removeGame(id)}
          />

          <LibrarySection
            games={games}
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
        isQuickSettingsOpen={isQuickSettingsOpen}
        onCloseQuickSettings={() => setQuickSettingsOpen(false)}
        quickSettingsSliderIndex={quickSettingsSliderIndex}
        onQuickSettingsFocusChange={setQuickSettingsSliderIndex}
        onRegisterQuickSettingsAdjustHandler={(handler) => {
          quickSettingsAdjustRef.current = handler;
        }}
        virtualKeyboard={virtualKeyboard}
        controllerType={controllerType}
      />
    </ErrorBoundary>
  );
}

export default App;
