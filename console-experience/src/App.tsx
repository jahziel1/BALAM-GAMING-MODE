import { useRef, useCallback, createRef, useMemo, useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/layout/Sidebar/Sidebar';
import TopBar from './components/layout/TopBar/TopBar';
import Footer from './components/layout/Footer/Footer';
import Card from './components/ui/Card/Card';
import Badge from './components/ui/Badge/Badge';
import { Play, RotateCcw } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import InGameMenu from './components/overlay/InGameMenu';
import SystemOSD from './components/overlay/SystemOSD';
import { useGames } from './hooks/useGames';
import { useNavigation } from './hooks/useNavigation';
import defaultCover from './assets/default_cover.png';
import { listen } from '@tauri-apps/api/event';

function App() {
  const {
    games,
    isLaunching,
    activeRunningGame,
    launchGame,
    killGame
  } = useGames();

  // 1. OSD State Management
  const [osdValue, setOsdValue] = useState(75);
  const [isOsdVisible, setIsOsdVisible] = useState(false);
  const osdTimeout = useRef<number | null>(null);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setOsdValue(newVolume);
    setIsOsdVisible(true);
    if (osdTimeout.current) window.clearTimeout(osdTimeout.current);
    osdTimeout.current = window.setTimeout(() => setIsOsdVisible(false), 2000);
  }, []);

  // Listen for background volume changes (Keyboard/System)
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

  // 2. Actions logic (Clean & SOLID)
  const handleLaunchRaw = useCallback((index: number) => {
    const gameToLaunch = games[index];
    if (gameToLaunch) launchGame(gameToLaunch);
  }, [games, launchGame]);

  const handleQuit = useCallback(() => {
    if (activeRunningGame) killGame(activeRunningGame);
  }, [activeRunningGame, killGame]);

  // 3. Navigation State
  const {
    focusArea,
    setFocusArea,
    isSidebarOpen,
    setSidebarOpen,
    isInGameMenuOpen,
    setInGameMenuOpen,
    activeIndex,
    setActiveIndex,
    sidebarIndex,
    setSidebarIndex,
    gameMenuIndex,
    gamepadInfo
  } = useNavigation(
    games.length,
    6,
    handleLaunchRaw,
    handleQuit,
    activeRunningGame
  );

  const trackRef = useRef<HTMLDivElement>(null);

  // 4. Card Refs for auto-scrolling
  const cardRefs = useMemo(() =>
    Array(games.length).fill(0).map(() => createRef<HTMLDivElement>()),
    [games.length]
  );

  // 5. Mouse Wheel to Selection Synchronization (The "Consola feel")
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (trackRef.current) {
      // Prevent rapid fire selection changes
      const sensitivity = 50;
      if (Math.abs(e.deltaY) > sensitivity) {
        if (e.deltaY > 0) { // Scroll Down -> Move Right
          setActiveIndex(Math.min(games.length - 1, activeIndex + 1));
        } else { // Scroll Up -> Move Left
          setActiveIndex(Math.max(0, activeIndex - 1));
        }
        setFocusArea('LIBRARY');
      }
    }
  }, [activeIndex, games.length, setActiveIndex, setFocusArea]);

  const handleSidebarAction = useCallback((id: string) => {
    console.log("Sidebar Action:", id);
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const activeGame = games[activeIndex] || games[0];
  const BG = activeGame?.image || defaultCover;

  return (
    <>
      <div className="app-background" style={{ backgroundImage: `url(${BG})` }} />
      <div className="app-overlay" />

      {/* OSD Overlay */}
      <SystemOSD type="volume" value={osdValue} isVisible={isOsdVisible} />

      {/* Menu Hint Area - Visible only when Sidebar Closed */}
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

      <div className="app-container">
        <TopBar onVolumeChange={handleVolumeChange} />

        <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          {activeRunningGame && isInGameMenuOpen ? (
            <InGameMenu
              game={activeRunningGame}
              activeIndex={gameMenuIndex}
              onResume={() => { setInGameMenuOpen(false); getCurrentWindow().hide(); }}
              onQuitGame={handleQuit}
              onGoHome={() => { setInGameMenuOpen(false); setFocusArea('HERO'); }}
            />
          ) : (
            <>
              <div className="hero-section" onMouseEnter={() => setFocusArea('HERO')}>
                <div className="hero-content">
                  {activeRunningGame && (
                    <div className="game-running-badge">
                      <RotateCcw size={14} /> PLAYING: {activeRunningGame.title}
                    </div>
                  )}
                  <h1 className="hero-title">{activeGame?.title || 'Balam'}</h1>
                  <Badge label="INSTALLED" variant="default" />
                  <div className="hero-actions">
                    {activeRunningGame?.id === activeGame?.id ? (
                      <button className={`btn-play ${focusArea === 'HERO' ? 'focused' : ''}`} onClick={() => setInGameMenuOpen(true)}>
                        <RotateCcw /> RESUME
                      </button>
                    ) : (
                      <button className={`btn-play ${focusArea === 'HERO' ? 'focused' : ''}`} onClick={() => handleLaunchRaw(activeIndex)}>
                        <Play fill="currentColor" /> {isLaunching ? '...' : 'PLAY'}
                      </button>
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
                        image={game.image || BG}
                        isFocused={focusArea === 'LIBRARY' && index === activeIndex}
                        onClick={() => { setActiveIndex(index); setFocusArea('LIBRARY'); handleLaunchRaw(index); }}
                        style={{
                          opacity: (focusArea === 'HERO' && index !== activeIndex) ? 0.6 : 1,
                          transform: (focusArea === 'LIBRARY' && activeIndex === index) ? 'scale(1.05)' : 'scale(1)',
                          filter: (activeRunningGame?.id === game.id) ? 'drop-shadow(0 0 10px #00ff00)' : 'none',
                          border: (activeIndex === index && focusArea !== 'LIBRARY') ? '2px solid rgba(255,255,255,0.3)' : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
      <div className="gamepad-status-tag">{gamepadInfo}</div>
    </>
  );
}

export default App;