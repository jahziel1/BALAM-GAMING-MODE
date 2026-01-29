import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  focusedIndex: number;
  onToggle: () => void;
  onAction: (id: string) => void;
  onFocusItem: (index: number) => void;
}

const MENU_ITEMS = [
  { id: 'home', icon: '🏠', label: 'INICIO' },
  { id: 'library', icon: '📚', label: 'BIBLIOTECA' },
  { id: 'search', icon: '🔍', label: 'BUSCAR' },
  { id: 'settings', icon: '⚙️', label: 'AJUSTES' },
  { id: 'desktop', icon: '💻', label: 'ESCRITORIO' },
  { id: 'power', icon: '⭕', label: 'APAGAR', danger: true },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, focusedIndex, onAction, onFocusItem }) => {
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
            onMouseEnter={() => onFocusItem(index)}
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