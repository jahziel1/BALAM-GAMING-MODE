import React, { useEffect, useState } from 'react';
import './InGameMenu.css';
import { Play, XCircle, Home } from 'lucide-react';
import { Game } from '../../domain/game';
import { useGamepad } from '../../hooks/useGamepad';

interface InGameMenuProps {
  game: Game;
  onResume: () => void;
  onQuitGame: () => void;
  onGoHome: () => void;
}

const MENU_OPTIONS = [
  { id: 'resume', label: 'RESUME GAME', icon: <Play /> },
  { id: 'quit', label: 'QUIT GAME', icon: <XCircle />, danger: true },
  { id: 'home', label: 'LIBRARY', icon: <Home /> },
];

const InGameMenu: React.FC<InGameMenuProps> = ({ game, onResume, onQuitGame, onGoHome }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Keyboard & Gamepad Logic
  const handleOptionClick = (optionId: string) => {
    if (optionId === 'resume') onResume();
    if (optionId === 'quit') onQuitGame();
    if (optionId === 'home') onGoHome();
  };

  const handleAction = () => {
    handleOptionClick(MENU_OPTIONS[activeIndex].id);
  };

  useGamepad({
    onButtonDown: (btn) => {
      if (btn === 'Up') setActiveIndex(prev => Math.max(0, prev - 1));
      if (btn === 'Down') setActiveIndex(prev => Math.min(MENU_OPTIONS.length - 1, prev + 1));
      if (btn === 'A') handleAction();
      if (btn === 'B') onResume(); // B always resumes
    }
  });

  // Keyboard fallback
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setActiveIndex(prev => Math.max(0, prev - 1));
      if (e.key === 'ArrowDown') setActiveIndex(prev => Math.min(MENU_OPTIONS.length - 1, prev + 1));
      if (e.key === 'Enter') handleAction();
      if (e.key === 'Escape') onResume();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex]);

  return (
    <div className="ingame-overlay">
      <div className="ingame-content">
        <div className="game-status">
          <img src={game.image || ''} alt={game.title} className="game-thumb" />
          <div className="game-info">
            <h2>{game.title}</h2>
            <div className="status-badge">RUNNING</div>
          </div>
        </div>

        <div className="ingame-menu">
          {MENU_OPTIONS.map((opt, idx) => (
            <div 
              key={opt.id}
              className={`ingame-item ${idx === activeIndex ? 'focused' : ''} ${opt.danger ? 'danger' : ''}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => handleOptionClick(opt.id)}
            >
              <span className="icon">{opt.icon}</span>
              <span className="label">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InGameMenu;