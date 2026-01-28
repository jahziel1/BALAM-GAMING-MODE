import React from 'react';
import './InGameMenu.css';
import { Play, XCircle, Home } from 'lucide-react';
import { Game } from '../../types/game';

interface InGameMenuProps {
  game: Game;
  activeIndex: number; // Controlled by parent App.tsx
  onResume: () => void;
  onQuitGame: () => void;
  onGoHome: () => void;
}

const MENU_OPTIONS = [
  { id: 'resume', label: 'RESUME GAME', icon: <Play /> },
  { id: 'home', label: 'LIBRARY', icon: <Home /> },
  { id: 'quit', label: 'QUIT GAME', icon: <XCircle />, danger: true },
];

const InGameMenu: React.FC<InGameMenuProps> = ({ game, activeIndex, onResume, onQuitGame, onGoHome }) => {
  const handleOptionClick = (optionId: string) => {
    if (optionId === 'resume') onResume();
    if (optionId === 'quit') onQuitGame();
    if (optionId === 'home') onGoHome();
  };

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