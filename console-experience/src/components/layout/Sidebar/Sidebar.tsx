import React, { useState, useEffect } from 'react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onAction: (action: string) => void;
}

const MENU_ITEMS = [
  { id: 'home', icon: '🏠', label: 'INICIO' },
  { id: 'library', icon: '📚', label: 'BIBLIOTECA' },
  { id: 'search', icon: '🔍', label: 'BUSCAR' },
  { id: 'settings', icon: '⚙️', label: 'AJUSTES' },
  { id: 'desktop', icon: '💻', label: 'ESCRITORIO' },
  { id: 'power', icon: '⭕', label: 'APAGAR', danger: true },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle: _onToggle, onAction }) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Keyboard Navigation inside Sidebar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation(); // Prevent main app navigation

      if (e.key === 'ArrowUp') {
        setFocusedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        setFocusedIndex(prev => Math.min(MENU_ITEMS.length - 1, prev + 1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        onAction(MENU_ITEMS[focusedIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, onAction]);

  return (
    <div className={`sidebar ${isOpen ? 'expanded' : ''}`} data-testid="sidebar">

      <div className="sidebar-header">
        <div className="avatar-large"></div>
        <div className="user-info">
          <h2>DIABLO</h2>
          <span>Online</span>
        </div>
      </div>

      <div className="menu-list">
        {MENU_ITEMS.map((item, index) => (
          <div
            key={item.id}
            className={`menu-item ${index === focusedIndex ? 'focused' : ''}`}
            style={item.danger ? { color: '#ef4444' } : {}}
            onMouseMove={() => {
              if (focusedIndex !== index) setFocusedIndex(index);
            }}
            onClick={() => onAction(item.id)}
            role="button"
          >
            <div className="icon">{item.icon}</div>
            <div className="label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;