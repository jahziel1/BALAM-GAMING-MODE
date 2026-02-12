/**
 * IconWrapper Component - Unified Icon System
 *
 * Standardizes icon sizes and colors across the application.
 * Replaces inconsistent icon usage (8 emojis + varying Lucide sizes).
 *
 * Features:
 * - 6 standardized sizes (xs to xxl)
 * - 5 color variants (default, primary, accent, success, error)
 * - Clones child element with standardized props
 * - Works with any icon library (primarily Lucide)
 *
 * @example
 * ```tsx
 * // Status bar icon (medium, default color)
 * <IconWrapper size="md">
 *   <Wifi />
 * </IconWrapper>
 *
 * // Button icon (large, accent color)
 * <IconWrapper size="lg" color="accent">
 *   <Volume2 />
 * </IconWrapper>
 *
 * // Empty state icon (extra large)
 * <IconWrapper size="xl">
 *   <Search />
 * </IconWrapper>
 * ```
 */

import './IconWrapper.css';

import React from 'react';

/**
 * Standardized icon sizes (in pixels)
 * Based on 8-point grid system
 */
export const ICON_SIZES = {
  xs: 12, // Micro labels (rarely used)
  sm: 16, // Badges, chips
  md: 20, // Standard UI, status bar (DEFAULT)
  lg: 24, // Buttons, actions, overlays
  xl: 32, // Large components, empty states
  xxl: 64, // Hero displays, about page
} as const;

export interface IconWrapperProps {
  /** Icon size - determines pixel dimensions */
  size?: keyof typeof ICON_SIZES;
  /** Icon color variant */
  color?: 'default' | 'primary' | 'accent' | 'success' | 'error';
  /** Icon element from Lucide or similar library */
  children: React.ReactElement;
  /** Additional CSS class names */
  className?: string;
}

/**
 * IconWrapper Component
 *
 * Wraps icon elements with standardized size and color.
 * Clones the child element and injects size and className props.
 */
export function IconWrapper({
  size = 'md',
  color = 'default',
  children,
  className = '',
}: IconWrapperProps) {
  const sizeValue = ICON_SIZES[size];
  const iconClassName = `icon icon-${color} ${className}`.trim();

  // Clone the icon element and inject standardized props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return React.cloneElement(children as React.ReactElement<any>, {
    size: sizeValue,
    className: iconClassName,
    'aria-hidden': 'true', // Icons are decorative by default
  });
}
