/**
 * Button Component - Unified Design System
 *
 * Replaces 4 duplicate button implementations across the codebase:
 * - InGameMenu.css .menu-button
 * - QuickSettings.css .quick-action-button
 * - ServiceStatusCard.css .action-button
 * - InGameMenu.css .confirm-button
 *
 * Features:
 * - 4 variants: primary, secondary, danger, ghost
 * - 3 sizes: sm, md, lg
 * - Gamepad navigation support (isFocused prop)
 * - Icon support
 * - Full width option
 * - Uses component tokens (no hardcoded values)
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click Me
 * </Button>
 *
 * <Button variant="danger" icon={<XIcon />} isFocused={focused}>
 *   Delete
 * </Button>
 * ```
 */

import './Button.css';

import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button visual style */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to full width of container */
  fullWidth?: boolean;
  /** Gamepad/keyboard focus state (for navigation) */
  isFocused?: boolean;
  /** Optional icon element (displayed before text) */
  icon?: React.ReactNode;
  /** Button content */
  children: React.ReactNode;
}

/**
 * Button Component
 *
 * Unified button component for consistent styling across the app.
 * Supports gamepad navigation via isFocused prop.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isFocused = false,
      icon,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const classNames = [
      'btn',
      `btn-${variant}`,
      `btn-${size}`,
      fullWidth && 'btn-full-width',
      isFocused && 'btn-focused',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classNames} {...props}>
        {icon ? <span className="btn-icon">{icon}</span> : null}
        <span className="btn-text">{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
