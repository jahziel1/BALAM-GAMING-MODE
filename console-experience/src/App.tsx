import { useState, useEffect, useRef } from 'react';
import './App.css';
import Sidebar from './components/layout/Sidebar/Sidebar';
import TopBar from './components/layout/TopBar/TopBar';
import Footer from './components/layout/Footer/Footer';
import Card from './components/ui/Card/Card';
import Badge from './components/ui/Badge/Badge';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useGamepad } from './hooks/useGamepad'; // Import Hook
import { Play } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';

// Types for Rust data
interface Game {
  id: string;
  title: string;
  path: string;
  image: string | null;
  last_played: number | null;
}

import InGameMenu from './components/overlay/InGameMenu';

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [heroFocus, setHeroFocus] = useState(true); 
  const [isLaunching, setIsLaunching] = useState(false);
  
  // Game Session State
  const [activeRunningGame, setActiveRunningGame] = useState<Game | null>(null);
  const [isInGameMenuOpen, setInGameMenuOpen] = useState(false);

  useEffect(() => {
    const unlisten = listen('tauri://focus', () => {
      if (activeRunningGame) {
        setInGameMenuOpen(true);
      }
    });
    return () => { unlisten.then(f => f()); };
  }, [activeRunningGame]);

  // Load Games from Rust on Start (Cache + Background Scan)
  useEffect(() => {
    let isMounted = true;

    async function loadGames() {
      try {
        // 1. Fast Load (Cache)
        const cachedGames = await invoke<Game[]>('get_games');
        if (isMounted && cachedGames.length > 0) {
          console.log("Loaded cached games:", cachedGames.length);
          setGames(cachedGames);
          setIsLoading(false);
        }

        // 2. Background Sync (Scan for updates)
        const freshGames = await invoke<Game[]>('scan_games');
        if (isMounted) {
          console.log("Scan complete. Fresh games:", freshGames.length);
          // Only update if different count (Simple diff for now)
          // Ideally use deep comparison or IDs check
          if (JSON.stringify(freshGames) !== JSON.stringify(cachedGames)) {
            setGames(freshGames);
          }
          setIsLoading(false); // Ensure loading is off even if cache was empty
        }

      } catch (error) {
        console.error("Failed to load games:", error);
        setIsLoading(false);
      }
    }
    loadGames();

    return () => { isMounted = false; };
  }, []);

  const hasGames = games.length > 0;
  // Use real games or empty fallback to prevent crash
  const displayGames = hasGames ? games : [{ id: 'empty', title: 'No Games Found', image: null, path: '', last_played: 0 }];
  
  // Navigation Hook for Ribbon
  const { activeIndex, setActiveIndex } = useKeyboardNavigation({
    itemCount: displayGames.length,
    columns: displayGames.length, 
    enabled: !isSidebarOpen && !heroFocus, 
  });

  // ... (Rest of logic remains mostly same, just using displayGames instead of MOCK_GAMES)
  // Need to adjust activeGame logic to handle empty state safely

  // const activeGame = displayGames[activeIndex] || displayGames[0]; // REMOVE DUPLICATE

  // Helper for Hero Button and Double Click
  const launchGame = async (game: Game) => {
    console.log(">>> launchGame called for:", game.title);
    
    // Check if another game is running
    if (activeRunningGame && activeRunningGame.id !== game.id) {
       console.log("Another game is running:", activeRunningGame.title);
       const confirmSwitch = await window.confirm(`Close ${activeRunningGame.title} and start ${game.title}?`);
       if (!confirmSwitch) return;
       
       // Kill previous game
       await invoke('kill_game', { path: activeRunningGame.path }).catch(console.error);
    }

    console.log("Proceeding to launch:", game.title);
    setActiveRunningGame(game);
    setInGameMenuOpen(false); // Ensure menu is closed initially
    setIsLaunching(true);
    
    invoke('launch_game', { 
      id: game.id, 
      path: game.path 
    })
    .then(() => {
       console.log("Rust launch command sent successfully");
    })
    .catch(err => {
      console.error("Failed to launch game:", err);
      alert("Error launching game: " + err);
      setActiveRunningGame(null);
    })
    .finally(() => setIsLaunching(false));
  };

  const handleQuitGame = () => {
    setActiveRunningGame(null);
  };

  const handlePlayButton = () => {
    if (hasGames) launchGame(activeGame);
  };

  // Gamepad Integration
  useGamepad({
    enabled: !isLoading && !isInGameMenuOpen, // Only disable nav if Menu Overlay is OPEN
    onButtonDown: (btn) => {
       // ...Menu Navigation
      if (isSidebarOpen) {
        if (btn === 'B' || btn === 'Start') setSidebarOpen(false);
        // Arrow/A logic is handled by Sidebar's internal focus (if we pass props)
        // But since Sidebar is React, we might need to lift state up or use a context.
        // For MVP, let's just close menu with B.
        return;
      }

      // Main Navigation
      switch (btn) {
        case 'A':
          if (heroFocus) handlePlayButton();
          else {
             // If on card, maybe jump to hero or launch directly?
             // Let's launch directly for "Console Feel"
             launchGame(activeGame);
          }
          break;
        case 'B':
          if (!heroFocus) setHeroFocus(true); // Back to Hero
          break;
        case 'Start':
        case 'Y': // Xbox Y usually opens search/menu
          setSidebarOpen(true);
          break;
        case 'Up':
          if (!heroFocus) setHeroFocus(true);
          break;
        case 'Down':
          if (heroFocus) setHeroFocus(false);
          break;
        case 'Left':
          if (!heroFocus) setActiveIndex(prev => Math.max(0, prev - 1));
          break;
        case 'Right':
          if (!heroFocus) setActiveIndex(prev => Math.min(displayGames.length - 1, prev + 1));
          break;
      }
    },
    onAxisMove: (axis, value) => {
      if (isSidebarOpen) return;

      if (axis === 0) { // X Axis (Left/Right)
        if (!heroFocus) {
          if (value > 0.5) setActiveIndex(prev => Math.min(displayGames.length - 1, prev + 1));
          if (value < -0.5) setActiveIndex(prev => Math.max(0, prev - 1));
        }
      }
      if (axis === 1) { // Y Axis (Up/Down)
        if (value > 0.5 && heroFocus) setHeroFocus(false); // Down -> Ribbon
        if (value < -0.5 && !heroFocus) setHeroFocus(true); // Up -> Hero
      }
    }
  });

  // Vertical Navigation Logic (Hero <-> Ribbon)
  useEffect(() => {
    const handleVerticalNav = (e: KeyboardEvent) => {
      if (isSidebarOpen) return;

      if (e.key === 'ArrowUp' && !heroFocus) {
        setHeroFocus(true);
      } else if (e.key === 'ArrowDown' && heroFocus) {
        setHeroFocus(false);
      }
    };
    window.addEventListener('keydown', handleVerticalNav);
    return () => window.removeEventListener('keydown', handleVerticalNav);
  }, [heroFocus, isSidebarOpen]);

  // Mouse Wheel Logic (Global)
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      const isVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
      const delta = isVertical ? e.deltaY : e.deltaX;

      // Threshold to prevent jitter
      if (Math.abs(delta) < 10) return;

      if (heroFocus) {
        // If in Hero, only Down/Right moves to Ribbon
        if (delta > 0) setHeroFocus(false);
      } else {
        // If in Ribbon, wheel moves the carousel
        if (delta > 0) {
          // Scroll Down/Right -> Next Game
          setActiveIndex(prev => Math.min(prev + 1, displayGames.length - 1));
        } else {
          // Scroll Up/Left -> Prev Game
          // EDGE CASE: If we are at index 0 and scroll Up, go back to Hero
          if (activeIndex === 0 && isVertical) {
             setHeroFocus(true);
          } else {
             setActiveIndex(prev => Math.max(prev - 1, 0));
          }
        }
      }
    };

    window.addEventListener('wheel', handleGlobalWheel);
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, [heroFocus, activeIndex, displayGames.length]); // Added displayGames.length dep

  // Input Method Detection (Mouse vs Keyboard)
  useEffect(() => {
    const handleMouseMove = () => document.body.classList.remove('input-keyboard');
    const handleKeyDown = () => document.body.classList.add('input-keyboard');

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Touch Logic (Simple Swipe)
  const touchStartX = useRef<number | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) { // Threshold 50px
      if (diff > 0) setActiveIndex(prev => Math.min(prev + 1, displayGames.length - 1)); // Swipe Left -> Next
      else setActiveIndex(prev => Math.max(prev - 1, 0)); // Swipe Right -> Prev
    }
    touchStartX.current = null;
  };

  // Camera Engine Logic (Only tracks horizontal ribbon movement)
  const trackRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (trackRef.current) {
      const cardUnit = 15.5; // 14vw width + 1.5vw gap
      const offset = (activeIndex * cardUnit); 
      trackRef.current.style.transform = `translateX(-${offset}vw)`;
    }
  }, [activeIndex]);

  // Menu Toggle
  useEffect(() => {
    const handleMenuToggle = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'Escape') {
        setSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleMenuToggle);
    return () => window.removeEventListener('keydown', handleMenuToggle);
  }, []);

  const activeGame = displayGames[activeIndex] || displayGames[0]; // Safer access

  // Handle Menu Actions
  const handleMenuAction = (action: string) => {
    console.log("Menu Action:", action);
    switch (action) {
      case 'home':
      case 'library':
        setSidebarOpen(false); // Just close menu to show library
        break;
      case 'search':
        // TODO: Focus search bar
        break;
      case 'settings':
        // TODO: Open settings modal
        break;
      case 'desktop':
        // TODO: Minimize app
        break;
      case 'power':
        // Close App
        invoke('close_app').catch(err => console.error("Close failed", err)); 
        // We need to implement close_app in Rust or use window.close()
        break;
    }
  };

  // Explicit Handlers for InGameMenu to ensure context is preserved
  const handleResume = async () => {
    console.log(">>> HANDLE RESUME TRIGGERED");
    try {
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(false);
      await win.hide();
      console.log("Window hidden successfully");
    } catch (e) {
      console.error("Resume failed:", e);
      alert("Resume Error: " + e);
    }
  };

  const handleQuitGameAction = async () => {
     if (!activeRunningGame) return;
     console.log(">>> HANDLE QUIT TRIGGERED for:", activeRunningGame.title);
     
     try {
       await invoke('kill_game', { path: activeRunningGame.path });
       console.log("Game kill command sent.");
       
       setActiveRunningGame(null);
       setInGameMenuOpen(false);
       
       const win = getCurrentWindow();
       await win.setAlwaysOnTop(false);
       await win.show();
       await win.setFocus();
     } catch (err) {
       console.error("Failed to quit:", err);
       alert("Failed to quit: " + err);
     }
  };

  const handleGoHome = async () => {
    setInGameMenuOpen(false);
    const win = getCurrentWindow();
    await win.setAlwaysOnTop(false);
  };

  return (
    <>
      <div 
        className="app-background" 
        style={{ backgroundImage: `url(${activeGame.image})` }}
      />
      <div className="app-overlay" />

      {/* Menu Hint (Glow Line) */}
      {!isSidebarOpen && (
        <div 
          className="menu-hint-area" 
          onClick={() => setSidebarOpen(true)}
          title="Open Menu (M)"
        >
          <div className="menu-glow-line" />
        </div>
      )}

      {/* Sidebar Backdrop (Click outside to close) */}
      {isSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar (Moved OUTSIDE app-container to be above backdrop) */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setSidebarOpen(!isSidebarOpen)} 
        onAction={handleMenuAction}
      />

      <div 
        className="app-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <TopBar />
        
        {/* Sidebar was here */}

        <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
           
           {activeRunningGame && isInGameMenuOpen ? (
             <InGameMenu 
               game={activeRunningGame} 
               onResume={handleResume}
               onQuitGame={handleQuitGameAction}
               onGoHome={handleGoHome}
             />
           ) : (
             <>
             {/* If game is running but we are in library, show "Back to Game" pill */}
             {activeRunningGame && (
               <div 
                  className="resume-pill" 
                  onClick={() => setInGameMenuOpen(true)}
                  style={{
                    position: 'fixed', bottom: 20, right: 20, 
                    background: '#22c55e', color: '#000', 
                    padding: '10px 20px', borderRadius: 30, 
                    fontWeight: 'bold', cursor: 'pointer', zIndex: 100
                  }}
               >
                 Playing: {activeRunningGame.title} (Press Home)
               </div>
             )}

            {/* HERO SECTION: Context & Action */}
          <div className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">{activeGame.title}</h1>
              
              <div className="hero-meta">
                <Badge label="INSTALLED" variant="default" />
                {activeGame.last_played !== null && (
                  <span>Last played: {new Date(activeGame.last_played! * 1000).toLocaleDateString()}</span>
                )}
              </div>

              <div className="hero-actions">
                <button 
                  className={`btn-play ${heroFocus ? 'focused' : ''}`}
                  onClick={handlePlayButton}
                >
                  <Play fill="currentColor" /> {hasGames ? 'PLAY' : 'SCANNING...'}
                </button>
              </div>
            </div>
          </div>

          {/* LIBRARY RIBBON: Exploration */}
          <div className="library-section">
            <div className="games-grid-viewport">
              <div className="games-track" ref={trackRef}>
                {displayGames.map((game, index) => (
                  <Card
                    key={game.id}
                    title={game.title}
                    image={game.image || ''} // Handle null image safely
                    isFocused={!heroFocus && index === activeIndex}
                    isLoading={isLoading && game.id === 'empty'} // Show skeleton only if initial loading
                    onClick={() => {
                      setActiveIndex(index);
                      setHeroFocus(false);
                    }}
                    onDoubleClick={() => launchGame(game)} // Double click to launch
                    style={{
                      // Dim cards when Hero is focused
                      opacity: heroFocus ? 0.3 : undefined,
                      transform: heroFocus ? 'scale(0.9)' : undefined
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
    </>
  );
}

export default App;