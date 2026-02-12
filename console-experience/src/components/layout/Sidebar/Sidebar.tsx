import './Sidebar.css';

import { Home, Library, Monitor, Plus, Power, Search, Settings } from 'lucide-react';
import React, { memo } from 'react';

interface SidebarProps {
  isOpen: boolean;
  focusedIndex: number;
  onToggle: () => void;
  onAction: (id: string) => void;
  onFocusItem: (index: number) => void;
}

export const MENU_ITEMS = [
  { id: 'home', icon: <Home size={24} />, label: 'INICIO' },
  { id: 'library', icon: <Library size={24} />, label: 'BIBLIOTECA' },
  { id: 'add-game', icon: <Plus size={24} />, label: 'AÑADIR JUEGO' },
  { id: 'search', icon: <Search size={24} />, label: 'BUSCAR' },
  { id: 'settings', icon: <Settings size={24} />, label: 'AJUSTES' },
  { id: 'desktop', icon: <Monitor size={24} />, label: 'ESCRITORIO' },
  { id: 'power', icon: <Power size={24} />, label: 'APAGAR', danger: true },
];

const Sidebar: React.FC<SidebarProps> = memo(({ isOpen, focusedIndex, onAction, onFocusItem }) => {
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
            className={`menu-item ${index === focusedIndex ? 'focused' : ''} ${item.danger ? 'danger' : ''}`}
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
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
