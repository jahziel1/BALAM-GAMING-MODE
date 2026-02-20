/**
 * FilterChips Component
 *
 * Quick filter chips for game library filtering
 * Steam Deck style with gamepad navigation support
 */

import './FilterChips.css';

import { Clock, Gamepad2, Star } from 'lucide-react';
import React from 'react';

export type FilterType =
  | 'all'
  | 'favorites'
  | 'recents'
  | 'steam'
  | 'epic'
  | 'xbox'
  | 'battlenet'
  | 'manual';

interface FilterChip {
  id: FilterType;
  label: string;
  icon?: React.ReactNode;
}

interface FilterChipsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  gameCount: number;
}

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'Todos' },
  { id: 'favorites', label: 'Favoritos', icon: <Star size={16} /> },
  { id: 'recents', label: 'Recientes', icon: <Clock size={16} /> },
  { id: 'steam', label: 'Steam' },
  { id: 'epic', label: 'Epic' },
  { id: 'xbox', label: 'Xbox', icon: <Gamepad2 size={16} /> },
  { id: 'battlenet', label: 'Battle.net' },
  { id: 'manual', label: 'Manual' },
];

export function FilterChips({ activeFilter, onFilterChange, gameCount }: FilterChipsProps) {
  return (
    <div className="filter-chips-container" data-testid="filter-chips">
      <div className="filter-chips" role="radiogroup" aria-label="Filter games by category">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            className={`filter-chip ${activeFilter === chip.id ? 'active' : ''}`}
            onClick={() => onFilterChange(chip.id)}
            role="radio"
            aria-checked={activeFilter === chip.id}
            tabIndex={activeFilter === chip.id ? 0 : -1}
          >
            {chip.icon}
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
      <div className="filter-count">
        {gameCount} {gameCount === 1 ? 'juego' : 'juegos'}
      </div>
    </div>
  );
}
