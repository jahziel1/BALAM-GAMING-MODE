import { useRef, useCallback, createRef, useMemo, useState, useEffect } from 'react';
import './App.css';
import Sidebar, { MENU_ITEMS } from './components/layout/Sidebar/Sidebar';
import TopBar from './components/layout/TopBar/TopBar';
import Footer from './components/layout/Footer/Footer';
import Card from './components/ui/Card/Card';
import Badge from './components/ui/Badge/Badge';
import { Play, RotateCcw } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { convertFileSrc } from '@tauri-apps/api/core';
import InGameMenu from './components/overlay/InGameMenu';
import SystemOSD from './components/overlay/SystemOSD';
import { QuickSettings } from './components/overlay/QuickSettings';
import { useGames } from './hooks/useGames';
import { useNavigation } from './hooks/useNavigation';
import { useInputDevice } from './hooks/useInputDevice';
import { useVirtualKeyboard } from './hooks/useVirtualKeyboard';
import defaultCover from './assets/default_cover.png';
import { listen } from '@tauri-apps/api/event';
import FileExplorer from './components/overlay/FileExplorer';
import VirtualKeyboard from './components/overlay/VirtualKeyboard/VirtualKeyboard';
import SearchOverlay from './components/overlay/SearchOverlay/SearchOverlay';

function App() {
  const {
    games,
    isLaunching,
    activeRunningGame,
    launchGame,
    killGame,
    addManualGame,
    removeGame
  } = useGames();

  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [osdValue, setOsdValue] = useState(75);
  const [isOsdVisible, setIsOsdVisible] = useState(false);
  const osdTimeout = useRef<number | null>(null);

  // Input device detection (refactored to clean hook)
  const { deviceType } = useInputDevice();

  // Map deviceType to legacy controllerType format (temporary compatibility)
  const controllerType: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC' =
    deviceType === 'GAMEPAD' ? 'GENERIC' : 'KEYBOARD'; // Mouse and Keyboard both map to KEYBOARD for legacy components

  const handleVolumeChange = useCallback((newVolume: number) => {
    setOsdValue(newVolume);
    setIsOsdVisible(true);
    if (osdTimeout.current) window.clearTimeout(osdTimeout.current);
    osdTimeout.current = window.setTimeout(() => setIsOsdVisible(false), 2000);
  }, []);

  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<number>('volume-changed', (event) => {
        handleVolumeChange(event.payload);
      });
      return unlisten;
    };
    const unlistenPromise = setupListener();
    return () => { unlistenPromise.then(unlisten => unlisten()); };
  }, [handleVolumeChange]);

  // Confirmation Modal State
  const [pendingLaunchIndex, setPendingLaunchIndex] = useState<number | null>(null);

  const handleLaunchRaw = useCallback((index: number) => {
    const gameToLaunch = games[index];
    if (!gameToLaunch) return;

    // GUARD: If user clicks "PLAY" on the CURRENTLY RUNNING game, treat it as RESUME.
    // This catches UI state mismatches where the button didn't switch to Resume.
    if (activeRunningGame && String(activeRunningGame.id) === String(gameToLaunch.id)) {
      console.warn("Launch requested for running game -> Resuming instead.");
      setInGameMenuOpen(false);
      getCurrentWindow().hide();
      return;
    }

    // IF switching games, ask confirmation first
    if (activeRunningGame && activeRunningGame.id !== gameToLaunch.id) {
      setPendingLaunchIndex(index);
      return;
    }

    // Otherwise launch immediately
    launchGame(gameToLaunch);
    getCurrentWindow().hide();
  }, [games, launchGame, activeRunningGame]);

  const handleQuitRef = useRef<() => void>(() => { });

  // Quick Settings slider adjustment handler
  const quickSettingsAdjustRef = useRef<((direction: number) => void) | null>(null);

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
    gameMenuIndex,
    quickSettingsSliderIndex,
    setQuickSettingsSliderIndex
  } = useNavigation(
    games.length,
    MENU_ITEMS.length,
    handleLaunchRaw, // Launch callback
    (index) => {
      const item = MENU_ITEMS[index];
      if (item) handleSidebarAction(item.id);
    },
    () => handleQuitRef.current(),
    activeRunningGame,
    isExplorerOpen || isSearchOpen, // Disable navigation when any overlay is open
    (direction: number) => quickSettingsAdjustRef.current?.(direction) // Quick Settings adjust callback
  );

  // Stable callbacks for virtual keyboard (prevent re-renders)
  const handleKeyboardOpen = useCallback(() => {
    setFocusArea('VIRTUAL_KEYBOARD');
  }, [setFocusArea]);

  const handleKeyboardClose = useCallback(() => {
    setFocusArea('HERO');
  }, [setFocusArea]);

  const handleKeyboardTextChange = useCallback((text: string) => {
    // Dispatch custom event for real-time search (works with React controlled inputs)
    window.dispatchEvent(new CustomEvent('virtual-keyboard-text-change', { detail: text }));
  }, []);

  // Virtual keyboard management with focusArea synchronization
  const virtualKeyboard = useVirtualKeyboard({
    onOpen: handleKeyboardOpen,
    onClose: handleKeyboardClose,
    onTextChange: handleKeyboardTextChange
  });

  // Define actual handleQuit and keep useNavigation in sync via another useEffect if needed
  // But actually, we can just define handleQuit and use navigation's setter.
  const handleQuit = useCallback(() => {
    if (activeRunningGame) {
      killGame(activeRunningGame);
      setInGameMenuOpen(false);
      setFocusArea('HERO');
    }
  }, [activeRunningGame, killGame, setInGameMenuOpen, setFocusArea]);

  useEffect(() => {
    handleQuitRef.current = handleQuit;
  }, [handleQuit]);

  // Sync navigation callback (useNavigation should accept it or we use refs)
  // Actually, handleQuit is used by InGameMenu directly too.

  const trackRef = useRef<HTMLDivElement>(null);

  const cardRefs = useMemo(() =>
    Array(games.length).fill(0).map(() => createRef<HTMLDivElement>()),
    [games.length]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (trackRef.current) {
      const sensitivity = 50;
      if (Math.abs(e.deltaY) > sensitivity) {
        if (e.deltaY > 0) {
          setActiveIndex(Math.min(games.length - 1, activeIndex + 1));
        } else {
          setActiveIndex(Math.max(0, activeIndex - 1));
        }
        setFocusArea('LIBRARY');
      }
    }
  }, [activeIndex, games.length, setActiveIndex, setFocusArea]);

  const handleSidebarAction = useCallback(async (id: string) => {
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
        // TODO: Trigger Settings (Sprint 3)
        setSidebarOpen(false);
        break;
      case 'desktop':
        await getCurrentWindow().minimize();
        setSidebarOpen(false);
        break;
      case 'power':
        // TODO: Trigger Power Menu (Sprint 1)
        // For now, allow closing app via standard method or just visual feedback
        setSidebarOpen(false);
        break;
      default:
        setSidebarOpen(false);
    }
  }, [setSidebarOpen, setFocusArea]);

  const handleSelectManualGame = useCallback(async (path: string, title: string) => {
    try {
      await addManualGame(path, title);
      setIsExplorerOpen(false);
    } catch (err) {
      console.error("Manual add failed:", err);
    }
  }, [addManualGame]);

  // Simplification: We remove complex visibility states.
  // The library is ALWAYS rendered. 
  // The Game Overlay just sits on top when needed.

  // Listen for 'toggle-overlay' from Rust (Global Shortcut)
  // Listen for 'toggle-overlay' from Rust (Global Shortcut)
  useEffect(() => {
    const unlisten = listen('toggle-overlay', async () => {
      // Toggle logic: If already open, close it. If closed, open it.
      // Getting current state in event listener is tricky with closures. 
      // We rely on functional update, but for window visibility we need to know.
      // Simpler: ALWAYS Open and Focus on shortcut, let internal UI handle closing.

      const win = getCurrentWindow();
      if (await win.isVisible()) {
        // If visible, maybe we want to close? 
        // For now, let's enforce "Summon Blade" behavior.
        await win.setFocus();
        setInGameMenuOpen(true);
      } else {
        await win.show();
        await win.setFocus();
        setInGameMenuOpen(true);
      }
    });
    return () => { unlisten.then(f => f()); };
  }, [setInGameMenuOpen]);

  const activeGame = games[activeIndex] || games[0];

  const getAssetSrc = (path: string | null | undefined) => {
    if (!path) return defaultCover;
    if (path.startsWith('http')) return path;
    return convertFileSrc(path);
  };

  const BG = getAssetSrc(activeGame?.hero_image || activeGame?.image);

  // LOGIC: UNIFIED RENDER TREE
  // We remove the early 'return null' hibernation because it causes "Grey Screen" issues with Tauri/WebView2.
  // Instead, we always render the App structure, and just conditionally act based on state.

  return (
    <>
      <div className="app-background" style={{ backgroundImage: `url(${BG})` }} />
      <div className="app-overlay" />
      <SystemOSD type="volume" value={osdValue} isVisible={isOsdVisible} />

      {!isSidebarOpen && (
        <div className="menu-hint-area"
          onMouseEnter={() => setSidebarOpen(true)}
          onClick={() => setSidebarOpen(true)}>
          <div className="menu-glow-line" />
        </div>
      )}

      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        isOpen={isSidebarOpen}
        focusedIndex={sidebarIndex}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        onAction={handleSidebarAction}
        onFocusItem={setSidebarIndex}
      />

      <div className="app-container" data-focus-area={focusArea}>
        <TopBar onVolumeChange={handleVolumeChange} />

        <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          {/* ALWAYS RENDER DASHBOARD (Hero + Library) */}
          <>
            <div className="hero-section" onMouseEnter={() => setFocusArea('HERO')}>
              <div className="hero-content">
                {/* Badge logic */}

                {activeGame?.logo ? (
                  <img src={getAssetSrc(activeGame.logo)} alt={activeGame.title} className="hero-logo" />
                ) : (
                  <h1 className="hero-title">{activeGame?.title || 'Balam'}</h1>
                )}

                <Badge label={activeGame?.source || "INSTALLED"} variant="default" />

                <div className="hero-actions">
                  {/* DEBUG VISUAL: Remove after fix */}
                  {activeRunningGame && (
                    <div style={{ position: 'absolute', top: -20, fontSize: 10, color: 'yellow' }}>
                      Running: {activeRunningGame.id} | Selected: {activeGame?.id} | Match: {String(activeRunningGame.id) === String(activeGame?.id) ? 'YES' : 'NO'}
                    </div>
                  )}

                  {activeRunningGame?.id && activeGame?.id && String(activeRunningGame.id) === String(activeGame.id) ? (
                    <button
                      className={`btn-play ${focusArea === 'HERO' ? 'focused' : ''}`}
                      onClick={() => {
                        setInGameMenuOpen(false);
                        getCurrentWindow().hide(); // Resume Game
                      }}
                    >
                      <RotateCcw /> RESUME
                    </button>
                  ) : (
                    <div className="hero-btns-row">
                      <button className={`btn-play ${focusArea === 'HERO' ? 'focused' : ''}`} onClick={() => handleLaunchRaw(activeIndex)}>
                        <Play fill="currentColor" /> {isLaunching ? '...' : (activeRunningGame ? 'SWITCH' : 'PLAY')}
                      </button>
                      {activeGame?.source === 'Manual' && (
                        <button className="btn-remove-manual" onClick={() => removeGame(activeGame.id)}>
                          DELETE
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="library-section" onMouseEnter={() => setFocusArea('LIBRARY')}>
              <div className="games-grid-viewport" ref={trackRef} onWheel={handleWheel}>
                <div className="games-track">
                  {games.map((game, index) => (
                    <Card
                      key={game.id}
                      ref={cardRefs[index]}
                      title={game.title}
                      image={getAssetSrc(game.image)}
                      isFocused={focusArea === 'LIBRARY' && index === activeIndex}
                      onClick={() => { setActiveIndex(index); setFocusArea('LIBRARY'); handleLaunchRaw(index); }}
                      style={{
                        opacity: (focusArea === 'HERO' && index !== activeIndex) ? 0.6 : 1,
                        transform: (focusArea === 'LIBRARY' && activeIndex === index) ? 'scale(1.05)' : 'scale(1)',
                        filter: 'none',
                        border: (activeIndex === index && focusArea !== 'LIBRARY') ? '2px solid rgba(255,255,255,0.3)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>

          {/* OVERLAY: Rendered on top when active */}
          {activeRunningGame && isInGameMenuOpen && (
            <div className="ingame-overlay-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
              <InGameMenu
                game={activeRunningGame}
                posterSrc={getAssetSrc(activeRunningGame.image)}
                activeIndex={gameMenuIndex}
                onResume={() => {
                  setInGameMenuOpen(false);
                  getCurrentWindow().hide();
                }}
                onQuitGame={() => {
                  handleQuit();
                  // Quit keeps window open, so we see library naturally
                }}
                onGoHome={() => {
                  setInGameMenuOpen(false);
                  setFocusArea('HERO');
                  const win = getCurrentWindow();
                  win.show();
                  win.setFocus();
                }}
                systemVolume={osdValue}
                controllerType={controllerType}
              />
            </div>
          )}
        </main>
        <Footer controllerType={controllerType} />
      </div>
      <div className="gamepad-status-tag">Input: {deviceType}</div>

      {isExplorerOpen && (
        <FileExplorer
          onClose={() => setIsExplorerOpen(false)}
          onSelectGame={handleSelectManualGame}
          controllerType={controllerType}
        />
      )}

      {/* CONFIRMATION MODAL FOR GAME SWITCH */}
      {pendingLaunchIndex !== null && (
        <div className="system-modal-backdrop">
          <div className="system-modal">
            <h2>Switch Game?</h2>
            <p>
              Launching <strong>{games[pendingLaunchIndex]?.title}</strong> will close
              <br />
              <span style={{ color: '#ff4444' }}>{activeRunningGame?.title}</span>.
              <br /><br />
              Any unsaved progress will be lost.
            </p>
            <div className="modal-actions">
              <button className="btn-modal cancel" onClick={() => setPendingLaunchIndex(null)}>
                Cancel
              </button>
              <button
                className="btn-modal confirm"
                onClick={() => {
                  const game = games[pendingLaunchIndex];
                  if (game) {
                    launchGame(game);
                    getCurrentWindow().hide();
                  }
                  setPendingLaunchIndex(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIRTUAL KEYBOARD INTEGRATION (Refactored) */}
      <VirtualKeyboard
        isOpen={virtualKeyboard.isOpen}
        onClose={virtualKeyboard.close}
        onSubmit={virtualKeyboard.handleSubmit}
        onTextChange={handleKeyboardTextChange}
        initialValue={virtualKeyboard.getInitialValue()}
        inputType={virtualKeyboard.getInputType()}
        placeholder={
          document.activeElement instanceof HTMLInputElement
            ? document.activeElement.placeholder || 'Type here...'
            : 'Type here...'
        }
        maxLength={
          document.activeElement instanceof HTMLInputElement && document.activeElement.maxLength > 0
            ? document.activeElement.maxLength
            : undefined
        }
      />

      {/* SEARCH OVERLAY */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        games={games}
        onLaunch={(game) => {
          launchGame(game);
          setIsSearchOpen(false);
          getCurrentWindow().hide();
        }}
      />

      {/* QUICK SETTINGS */}
      <QuickSettings
        isOpen={isQuickSettingsOpen}
        onClose={() => setQuickSettingsOpen(false)}
        focusedSliderIndex={quickSettingsSliderIndex}
        onFocusChange={setQuickSettingsSliderIndex}
        controllerType={controllerType}
        onRegisterAdjustHandler={(handler) => { quickSettingsAdjustRef.current = handler; }}
      />
    </>
  );
}

export default App;
