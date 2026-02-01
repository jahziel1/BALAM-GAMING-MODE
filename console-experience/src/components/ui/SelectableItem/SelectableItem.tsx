import './SelectableItem.css';

import React, { memo } from 'react';

interface SelectableItemProps {
  isFocused?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'danger';
}

/**
 * Base component for all selectable/focusable items.
 * Used by: InGameMenu items, Sliders, Sidebar items, etc.
 *
 * Ensures consistent focus states across the entire app.
 * Follows DRY principle - single source of truth for item styling.
 */
export const SelectableItem: React.FC<SelectableItemProps> = memo(
  ({
    isFocused = false,
    disabled = false,
    onClick,
    children,
    className = '',
    variant = 'default',
  }) => {
    return (
      <div
        className={`selectable-item ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''} ${variant} ${className}`}
        onClick={disabled ? undefined : onClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {children}
      </div>
    );
  }
);

SelectableItem.displayName = 'SelectableItem';
