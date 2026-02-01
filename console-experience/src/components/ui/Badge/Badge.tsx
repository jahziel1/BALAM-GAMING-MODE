/**
 * @module components/ui/Badge
 *
 * Simple badge component for labels and tags.
 */

import './Badge.css';

import React, { memo } from 'react';

/**
 * Props for Badge component
 */
interface BadgeProps {
  /** Text to display in the badge */
  label: string;
  /** Visual variant style */
  variant?: 'default' | 'outline' | 'ghost';
}

/**
 * Badge Component
 *
 * Small label/tag component for displaying categories, sources, or statuses.
 * Used for game sources (Steam, Epic, Xbox, etc.).
 *
 * @param props - Component props
 * @returns Styled badge element
 *
 * @example
 * ```tsx
 * <Badge label="STEAM" variant="default" />
 * <Badge label="INSTALLED" variant="outline" />
 * ```
 */
const Badge: React.FC<BadgeProps> = ({ label, variant = 'default' }) => {
  return <span className={`badge badge-${variant}`}>{label}</span>;
};

export default memo(Badge);
