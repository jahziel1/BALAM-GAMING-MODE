import './App.css';

import { getCurrentWindow } from '@tauri-apps/api/window';
import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';

import { useAppStore, useGameStore } from './application/providers/StoreProvider';
import defaultCover from './assets/default_cover.png';
import {
  ConfirmationModal,
  ErrorBoundary,
  HeroSection,
  LibrarySection,
  OverlayManager,
} from './components/App';
import { Footer, Sidebar, TopBar } from './components/layout';
import { MENU_ITEMS } from './components/layout/Sidebar/Sidebar';
import {
  InGameMenuOptimized,
  PipWindowContent,
  QuickSettings,
  SystemOSD,
} from './components/overlay';
import { KeyboardShortcutsPanel } from './components/overlay/KeyboardShortcutsPanel/KeyboardShortcutsPanel';
import { FilterChips } from './components/ui/FilterChips';
import { useControllerType } from './hooks/useControllerType';
import { useFilteredGames } from './hooks/useFilteredGames';
import { useGameEnded } from './hooks/useGameEnded';
import { useGameLauncher } from './hooks/useGameLauncher';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useNavigation } from './hooks/useNavigation';
import { useOsd } from './hooks/useOsd';
import { useOverlayPanels } from './hooks/useOverlayPanels';
import { usePipWindow } from './hooks/usePipWindow';
import { useSidebarActions } from './hooks/useSidebarActions';
import { useVirtualKeyboard } from './hooks/useVirtualKeyboard';
import { initDatabase } from './services/database';
import { toggleFavorite } from './services/database';
import { getCachedAssetSrc } from './utils/image-cache';

const PowerModal = lazy(() =>
  import('./components/overlay/PowerModal/PowerModal').then((m) => ({ default: m.PowerModal }))
);

function App() {
  // ── Window type ────────────────────────────────────────────────────────────
  const windowLabel = getCurrentWindow().label;
  const isPipWindow = windowLabel === 'performance-pip';
  const isOverlayWindow = windowLabel === 'overlay';

  // ── Stores ─────────────────────────────────────────────────────────────────
  const {
    games,
    isLaunching,
    activeRunningGame,
    clearActiveGame,
    launchGame,
    killGame: killGameByPid,
    addManualGame: addManualGameStore,
    removeGame,
    loadGames,
  } = useGameStore();

  const { overlay, openLeftSidebar, openRightSidebar, closeRightSidebar, settings } = useAppStore();

  // Apply CSS classes to <html> based on user settings
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('no-animations', !settings.animationsEnabled);
    html.classList.toggle('no-blur', !settings.blurEffects);
  }, [settings.animationsEnabled, settings.blurEffects]);

  // Overlay window: force transparent background so the game shows through the center
  useEffect(() => {
    if (isOverlayWindow) {
      document.documentElement.style.backgroundColor = 'transparent';
    }
  }, [isOverlayWindow]);

  usePipWindow();

  // Initialize database and load games on mount
  useEffect(() => {
    void initDatabase().catch((e) => console.error('Failed to initialize database:', e));
  }, []);
  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  // ── Extracted hooks ────────────────────────────────────────────────────────
  const { osdValue, isOsdVisible, handleVolumeChange } = useOsd();

  const {
    isExplorerOpen,
    setIsExplorerOpen,
    isSearchOpen,
    setIsSearchOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isWiFiPanelOpen,
    setIsWiFiPanelOpen,
    isBluetoothPanelOpen,
    setIsBluetoothPanelOpen,
    isPowerModalOpen,
    setIsPowerModalOpen,
    isKeyboardShortcutsOpen,
    setIsKeyboardShortcutsOpen,
  } = useOverlayPanels();

  // Stable callbacks for useGlobalShortcuts (must not be inline — they're useEffect deps)
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), [setIsSearchOpen]);
  const handleToggleWiFi = useCallback(() => setIsWiFiPanelOpen((p) => !p), [setIsWiFiPanelOpen]);
  const handleToggleBluetooth = useCallback(
    () => setIsBluetoothPanelOpen((p) => !p),
    [setIsBluetoothPanelOpen]
  );
  const handleOpenKeyboardShortcuts = useCallback(
    () => setIsKeyboardShortcutsOpen(true),
    [setIsKeyboardShortcutsOpen]
  );

  useGlobalShortcuts({
    onOpenSearch: handleOpenSearch,
    onToggleWiFi: handleToggleWiFi,
    onToggleBluetooth: handleToggleBluetooth,
    onVolumeChange: handleVolumeChange,
    onOpenKeyboardShortcuts: handleOpenKeyboardShortcuts,
  });

  const { controllerType, deviceType } = useControllerType();

  useGameEnded({ games, isOverlayWindow, clearActiveGame, loadGames });

  const { filteredGames, carouselOffsets, activeFilter, setActiveFilter } = useFilteredGames(games);

  // ── Navigation (needs stable refs to avoid circular deps) ─────────────────
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleQuitRef = useRef<() => void>(() => {});
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleLaunchRef = useRef<(index: number) => void>(() => {});
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
    filteredGames.length,
    carouselOffsets,
    MENU_ITEMS.length,
    (index) => handleLaunchRef.current(index),
    (index) => {
      const item = MENU_ITEMS[index];
      if (item) void handleSidebarActionRef.current(item.id);
    },
    () => handleQuitRef.current(),
    activeRunningGame,
    isExplorerOpen || (!!activeRunningGame && !isOverlayWindow),
    isSearchOpen,
    isOverlayWindow
  );

  // ── Game launcher ──────────────────────────────────────────────────────────
  const { handleLaunch, confirmLaunch, cancelLaunch, pendingLaunchGame } = useGameLauncher({
    games: filteredGames,
    activeRunningGame,
    setInGameMenuOpen,
  });

  // ── Sidebar actions ────────────────────────────────────────────────────────
  const { handleSidebarAction } = useSidebarActions({
    setFocusArea,
    setSidebarOpen,
    setIsExplorerOpen,
    setIsSearchOpen,
    setIsSettingsOpen,
    setIsPowerModalOpen,
  });

  // ── Quit handler ───────────────────────────────────────────────────────────
  const handleQuit = useCallback(() => {
    if (activeRunningGame?.pid) {
      void killGameByPid(activeRunningGame.pid);
      setInGameMenuOpen(false);
      setFocusArea('HERO');
    }
  }, [activeRunningGame, killGameByPid, setInGameMenuOpen, setFocusArea]);

  // ── Favorite toggle ────────────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(
    async (gameId: string) => {
      const game = games.find((g) => g.id === gameId);
      if (!game) return;
      try {
        await toggleFavorite(game.path);
        await loadGames();
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      }
    },
    [games, loadGames]
  );

  // ── Manual game add ────────────────────────────────────────────────────────
  const handleSelectManualGame = useCallback(
    async (path: string, title: string) => {
      try {
        await addManualGameStore(title, path);
        setIsExplorerOpen(false);
      } catch (err) {
        console.error('Manual add failed:', err);
      }
    },
    [addManualGameStore, setIsExplorerOpen]
  );

  // ── Search callbacks ───────────────────────────────────────────────────────
  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setFocusArea('HERO');
  }, [setFocusArea, setIsSearchOpen]);

  const handleLaunchFromSearch = useCallback(
    (game: { id: string }) => {
      void launchGame(game.id);
      setIsSearchOpen(false);
      setFocusArea('HERO');
      void getCurrentWindow().hide();
    },
    [launchGame, setFocusArea, setIsSearchOpen]
  );

  // ── Virtual keyboard ───────────────────────────────────────────────────────
  const searchInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Stable callbacks for useVirtualKeyboard (must not be inline — they're useEffect deps)
  const handleKeyboardOpen = useCallback(() => setFocusArea('VIRTUAL_KEYBOARD'), [setFocusArea]);
  const handleKeyboardClose = useCallback(
    () => setFocusArea(isSearchOpen ? 'SEARCH' : 'HERO'),
    [setFocusArea, isSearchOpen]
  );
  const handleKeyboardTextChange = useCallback(
    (text: string) =>
      window.dispatchEvent(new CustomEvent('virtual-keyboard-text-change', { detail: text })),
    []
  );

  const virtualKeyboard = useVirtualKeyboard({
    onOpen: handleKeyboardOpen,
    onClose: handleKeyboardClose,
    onTextChange: handleKeyboardTextChange,
    targetInputRef: searchInputRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  });

  const handleRegisterSearchInput = useCallback((ref: React.RefObject<HTMLInputElement>) => {
    searchInputRef.current = ref.current;
  }, []);

  // Close virtual keyboard when search closes
  useEffect(() => {
    if (!isSearchOpen && virtualKeyboard.isOpen) {
      searchInputRef.current = null;
      virtualKeyboard.close();
    }
  }, [isSearchOpen, virtualKeyboard]);

  // ── Sync refs (stable callbacks for useNavigation) ─────────────────────────
  useEffect(() => {
    handleLaunchRef.current = handleLaunch;
  }, [handleLaunch]);
  useEffect(() => {
    handleQuitRef.current = handleQuit;
  }, [handleQuit]);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    handleSidebarActionRef.current = handleSidebarAction;
  }, [handleSidebarAction]);

  // ── Filter change ──────────────────────────────────────────────────────────
  const handleFilterChange = useCallback(
    (filter: typeof activeFilter) => {
      setActiveFilter(filter);
      setActiveIndex(0);
    },
    [setActiveFilter, setActiveIndex]
  );

  // ── Focus management ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isSearchOpen) setFocusArea('SEARCH');
  }, [isSearchOpen, setFocusArea]);

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
    if (!anyOverlayOpen) setFocusArea('HERO');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyOverlayOpen]);

  // Auto-open InGameMenu when overlay window loads
  useEffect(() => {
    if (isOverlayWindow) openLeftSidebar();
  }, [isOverlayWindow, openLeftSidebar]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const activeGame = filteredGames[activeIndex] ?? filteredGames[0];
  const backgroundImage = getCachedAssetSrc(
    activeGame?.hero_image ?? activeGame?.image,
    defaultCover
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isPipWindow) return <PipWindowContent />;

  if (isOverlayWindow) {
    return (
      <ErrorBoundary>
        <div style={{ width: '100%', height: '100vh' }}>
          <InGameMenuOptimized />
          <QuickSettings isOpen={overlay.rightSidebarOpen} onClose={closeRightSidebar} />
        </div>
      </ErrorBoundary>
    );
  }

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
            onLaunchGame={() => void handleLaunch(activeIndex)}
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
            onLaunchGame={(_game, index) => handleLaunch(index)}
            onSetActiveIndex={setActiveIndex}
            onSetFocusArea={setFocusArea}
          />
        </main>

        <Footer controllerType={controllerType} />
      </div>

      <div className="gamepad-status-tag">Input: {deviceType}</div>

      <ConfirmationModal
        pendingGame={pendingLaunchGame ?? null}
        activeRunningGame={activeRunningGame}
        onConfirm={confirmLaunch}
        onCancel={cancelLaunch}
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

      <KeyboardShortcutsPanel
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />
    </ErrorBoundary>
  );
}

export default App;
