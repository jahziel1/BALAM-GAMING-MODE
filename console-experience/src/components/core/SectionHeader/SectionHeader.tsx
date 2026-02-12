/**
 * SectionHeader Component - Unified Design System
 *
 * Replaces 3 inconsistent header implementations:
 * - QuickSettings.css .section-title
 * - ServiceStatusCard.css .service-title
 * - SettingsPanel raw <h3> tags
 *
 * Features:
 * - 3 semantic levels: h2, h3, h4
 * - 3 visual variants: default, emphasized, muted
 * - Consistent typography and spacing
 * - Uses design tokens
 *
 * @example
 * ```tsx
 * <SectionHeader level={2} variant="default">
 *   Performance Settings
 * </SectionHeader>
 *
 * <SectionHeader level={3} variant="emphasized">
 *   Quick Actions
 * </SectionHeader>
 * ```
 */

import './SectionHeader.css';

import React from 'react';

export interface SectionHeaderProps {
  /** Semantic HTML heading level */
  level?: 2 | 3 | 4;
  /** Visual style variant */
  variant?: 'default' | 'emphasized' | 'muted';
  /** Optional additional CSS classes */
  className?: string;
  /** Header content */
  children: React.ReactNode;
}

/**
 * SectionHeader Component
 *
 * Unified heading component for consistent section titles across the app.
 * Uses semantic HTML (h2/h3/h4) with consistent visual styling.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  level = 3,
  variant = 'default',
  className = '',
  children,
}) => {
  const classNames = [
    'section-header',
    `section-header-h${level}`,
    `section-header-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return React.createElement(`h${level}`, { className: classNames }, children);
};
