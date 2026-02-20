import './Sidebar.css';

import { Home, Library, Monitor, Plus, Power, Search, Settings } from 'lucide-react';
import React, { memo } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onAction: (id: string) => void;
}

export const MENU_ITEMS = [
  { id: 'home', icon: <Home size={24} />, label: 'INICIO' },
  { id: 'library', icon: <Library size={24} />, label: 'BIBLIOTECA' },
  { id: 'add-game', icon: <Plus size={24} />, label: 'AÑADIR JUEGO' },
  { id: 'search', icon: <Search size={24} />, label: 'BUSCAR' },
  { id: 'settings', icon: <Settings size={24} />, label: 'AJUSTES' },
  { id: 'desktop', icon: <Monitor size={24} />, label: 'ESCRITORIO' },
  { id: 'power', icon: <Power size={24} />, label: 'APAGAR', danger: true },
] as const;

interface SidebarItemProps {
  item: (typeof MENU_ITEMS)[number];
  onAction: (id: string) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item, onAction }) => {
  return (
    <div
      className={`menu-item ${'danger' in item && item.danger ? 'danger' : ''}`}
      onClick={() => onAction(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAction(item.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={item.label}
    >
      <div className="icon">{item.icon}</div>
      <div className="label">{item.label}</div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = memo(({ isOpen, onAction }) => {
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
        {MENU_ITEMS.map((item) => (
          <SidebarItem key={item.id} item={item} onAction={onAction} />
        ))}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
