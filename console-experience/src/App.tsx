import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import Sidebar from './components/layout/Sidebar/Sidebar';
import TopBar from './components/layout/TopBar/TopBar';
import Footer from './components/layout/Footer/Footer';
import Card from './components/ui/Card/Card';
import Badge from './components/ui/Badge/Badge';
import { Play, RotateCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { Game } from './types/game';
import InGameMenu from './components/overlay/InGameMenu';

type NavAction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK' | 'MENU';

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [heroFocus, setHeroFocus] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [activeRunningGame, setActiveRunningGame] = useState<Game | null>(null);
  const [isInGameMenuOpen, setInGameMenuOpen] = useState(false);
  const [gameMenuIndex, setGameMenuIndex] = useState(0);
  const [gamepadInfo, setGamepadInfo] = useState("Waiting for Input...");

  const state = useRef({ heroFocus, activeIndex, games, isSidebarOpen, isInGameMenuOpen, gameMenuIndex, activeRunningGame });
  // Timestamp to prevent double-firing (Web + Native race condition)
  const lastActionTime = useRef(0);

  useEffect(() => {
    state.current = { heroFocus, activeIndex, games, isSidebarOpen, isInGameMenuOpen, gameMenuIndex, activeRunningGame };
  }, [heroFocus, activeIndex, games, isSidebarOpen, isInGameMenuOpen, gameMenuIndex, activeRunningGame]);

  const handleQuitGameAction = useCallback(async () => {
    if (state.current.activeRunningGame) {
      await invoke('kill_game', { path: state.current.activeRunningGame.path });
      setActiveRunningGame(null);
      setInGameMenuOpen(false);
      const win = getCurrentWindow();
      await win.show();
      await win.set_focus();
    }
  }, []);

  const dispatch = useCallback((action: NavAction, source: string = 'UNKNOWN') => {
    const now = Date.now();
    // 150ms debounce to merge Web+Native events
    if (now - lastActionTime.current < 150) return;
    lastActionTime.current = now;

    const { isSidebarOpen, isInGameMenuOpen, games, activeIndex, gameMenuIndex, activeRunningGame } = state.current;

    // Debug info update
    if (source !== 'UNKNOWN') setGamepadInfo(`Input: ${source} (${action})`);

    // -> IN-GAME MENU LOGIC
    if (isInGameMenuOpen) {
      switch (action) {
        case 'UP': setGameMenuIndex(p => Math.max(0, p - 1)); break;
        case 'DOWN': setGameMenuIndex(p => Math.min(2, p + 1)); break;
        case 'CONFIRM':
          if (gameMenuIndex === 0) { // Resume
            setInGameMenuOpen(false);
            getCurrentWindow().hide();
          } else if (gameMenuIndex === 1) { // Library (Home)
            setInGameMenuOpen(false);
            setHeroFocus(true);
          } else if (gameMenuIndex === 2) { // Quit
            handleQuitGameAction();
          }
          break;
        case 'BACK':
        case 'MENU':
          setInGameMenuOpen(false); // Just close menu, don't quit game
          getCurrentWindow().hide();
          break;
      }
      return;
    }

    // -> MAIN LIBRARY LOGIC
    switch (action) {
      case 'UP': setHeroFocus(true); break;
      case 'DOWN': setHeroFocus(false); break;
      case 'LEFT': setActiveIndex(p => Math.max(0, p - 1)); setHeroFocus(false); break;
      case 'RIGHT': setActiveIndex(p => Math.min(games.length - 1, p + 1)); setHeroFocus(false); break;

      case 'CONFIRM':
        if (isSidebarOpen) setSidebarOpen(false);
        else launchGame(games[activeIndex]);
        break;

      case 'BACK':
        if (isSidebarOpen) setSidebarOpen(false);
        else if (activeRunningGame) {
          setInGameMenuOpen(true); // Open menu if game is running
          setGameMenuIndex(0); // Reset to Resume
        }
        else setHeroFocus(true);
        break;

      case 'MENU':
        if (activeRunningGame) {
          setInGameMenuOpen(true);
          setGameMenuIndex(0);
        }
        else setSidebarOpen(p => !p);
        break;
    }
  }, [handleQuitGameAction]);

  const launchGame = async (game: Game) => {
    if (!game || game.id === 'empty') return;
    setActiveRunningGame(game);
    setInGameMenuOpen(false);
    setIsLaunching(true);
    await getCurrentWindow().hide();
    invoke('launch_game', { id: game.id, path: game.path }).catch(() => {
      getCurrentWindow().show();
      setActiveRunningGame(null);
    }).finally(() => setIsLaunching(false));
  };

  useEffect(() => {
    // 1. RUST NATIVE CHANNEL (Robust)
    const unlistenNav = listen<string>('nav', (e) => {
      dispatch(e.payload as NavAction, 'NATIVE');
    });

    const unlistenWake = listen('tauri://focus', () => {
      if (state.current.activeRunningGame) {
        setInGameMenuOpen(true);
        setGameMenuIndex(0);
      }
    });

    // 2. WEB CHANNEL (Smooth)
    let raf: number;
    let lastAxis = 0;
    const btnStates = new Array(20).fill(false);

    const checkInput = (time: number) => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
      if (gp) {
        if (activeRunningGame && isInGameMenuOpen) {
          // If Browser sees input, it's reliable
        }

        gp.buttons.forEach((b, i) => {
          if (b.pressed && !btnStates[i]) {
            btnStates[i] = true;
            if (i === 0) dispatch('CONFIRM', 'WEB');
            if (i === 1) dispatch('BACK', 'WEB');
            if (i === 9 || i === 8 || i === 16) dispatch('MENU', 'WEB');
            if (i === 12) dispatch('UP', 'WEB');
            if (i === 13) dispatch('DOWN', 'WEB');
            if (i === 14) dispatch('LEFT', 'WEB');
            if (i === 15) dispatch('RIGHT', 'WEB');
          } else if (!b.pressed) btnStates[i] = false;
        });

        if (time - lastAxis > 200) {
          if (gp.axes[1] < -0.5) { dispatch('UP', 'WEB'); lastAxis = time; }
          else if (gp.axes[1] > 0.5) { dispatch('DOWN', 'WEB'); lastAxis = time; }
          else if (gp.axes[0] > 0.5) { dispatch('RIGHT', 'WEB'); lastAxis = time; }
          else if (gp.axes[0] < -0.5) { dispatch('LEFT', 'WEB'); lastAxis = time; }
        }
      }
      raf = requestAnimationFrame(checkInput);
    };
    raf = requestAnimationFrame(checkInput);

    const onKey = (e: KeyboardEvent) => {
      const keys: Record<string, NavAction> = {
        'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
        'Enter': 'CONFIRM', 'Escape': 'MENU', 'Backspace': 'BACK'
      };
      if (keys[e.key]) dispatch(keys[e.key], 'KEYBOARD');
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      unlistenNav.then(f => f());
      unlistenWake.then(f => f());
    };
  }, [dispatch, activeRunningGame, isInGameMenuOpen]);

  // Load Data...
  useEffect(() => {
    invoke<Game[]>('get_games').then(g => { if (g.length) setGames(g); });
    invoke<Game[]>('scan_games').then(g => { if (g.length) setGames(g); });
  }, []);

  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (trackRef.current) {
      const amount = activeIndex * (window.innerWidth * 0.155 + 30);
      trackRef.current.scrollTo({ left: amount, behavior: 'smooth' });
    }
  }, [activeIndex]);

  const activeGame = games[activeIndex] || games[0];
  const BG = activeGame?.image || 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=1000';

  return (
    <>
      <div className="app-background" style={{ backgroundImage: `url(${BG})` }} />
      <div className="app-overlay" />
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setSidebarOpen(!isSidebarOpen)} onAction={() => setSidebarOpen(false)} />

      <div className="app-container">
        <TopBar onVolumeChange={() => { }} />
        <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          {activeRunningGame && isInGameMenuOpen ? (
            <InGameMenu
              game={activeRunningGame}
              activeIndex={gameMenuIndex} // Controlled by App state
              onResume={() => { setInGameMenuOpen(false); getCurrentWindow().hide(); }}
              onQuitGame={handleQuitGameAction}
              onGoHome={() => { setInGameMenuOpen(false); setHeroFocus(true); }}
            />
          ) : (
            <>
              <div className="hero-section">
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
                      <button className={`btn-play focused`} onClick={() => setInGameMenuOpen(true)}>
                        <RotateCcw /> RESUME
                      </button>
                    ) : (
                      <button className={`btn-play ${heroFocus ? 'focused' : ''}`} onClick={() => launchGame(activeGame)}>
                        <Play fill="currentColor" /> {isLaunching ? '...' : 'PLAY'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="library-section">
                <div className="games-grid-viewport" ref={trackRef}>
                  <div className="games-track">
                    {games.map((game, index) => (
                      <Card
                        key={game.id}
                        title={game.title}
                        image={game.image || BG}
                        isFocused={!heroFocus && index === activeIndex}
                        onClick={() => { setActiveIndex(index); setHeroFocus(false); }}
                        style={{
                          opacity: (heroFocus) ? 0.4 : 1,
                          transform: (!heroFocus && activeIndex === index) ? 'scale(1.05)' : 'scale(1)',
                          filter: (activeRunningGame?.id === game.id) ? 'drop-shadow(0 0 10px #00ff00)' : 'none'
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