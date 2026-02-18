/**
 * FilterChips Component
 *
 * Quick filter chips for game library filtering
 * Steam Deck style with gamepad navigation support
 */

import './FilterChips.css';

import { Clock, Gamepad2, Star } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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
  const [focusedChipIndex, setFocusedChipIndex] = useState(0);

  // Sync focused index when activeFilter changes externally
  useEffect(() => {
    const idx = FILTER_CHIPS.findIndex((c) => c.id === activeFilter);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (idx !== -1) setFocusedChipIndex(idx);
  }, [activeFilter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      setFocusedChipIndex((i) => Math.min(FILTER_CHIPS.length - 1, i + 1));
    } else if (e.key === 'ArrowLeft') {
      setFocusedChipIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onFilterChange(FILTER_CHIPS[focusedChipIndex].id);
    }
  };

  return (
    <div className="filter-chips-container">
      <div
        className="filter-chips"
        role="radiogroup"
        aria-label="Filter games by category"
        onKeyDown={handleKeyDown}
      >
        {FILTER_CHIPS.map((chip, index) => (
          <button
            key={chip.id}
            className={`filter-chip ${activeFilter === chip.id ? 'active' : ''}`}
            onClick={() => {
              setFocusedChipIndex(index);
              onFilterChange(chip.id);
            }}
            role="radio"
            aria-checked={activeFilter === chip.id}
            tabIndex={index === focusedChipIndex ? 0 : -1}
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
