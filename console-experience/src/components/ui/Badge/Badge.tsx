/**
 * @module components/ui/Badge
 *
 * Enhanced badge component for labels, tags, and status indicators.
 * Expanded from 3 to 7 variants with design token integration.
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
  variant?: 'default' | 'outline' | 'ghost' | 'success' | 'warning' | 'danger' | 'active';
  /** Optional icon element (displayed before text) */
  icon?: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Badge Component
 *
 * Small label/tag component for displaying categories, sources, or statuses.
 * Used for game sources (Steam, Epic, Xbox, etc.) and status indicators.
 *
 * Variants:
 * - default: Subtle background for general labels
 * - outline: Transparent with border
 * - ghost: Transparent, no border (minimal)
 * - success: Green for positive states
 * - warning: Yellow for warnings
 * - danger: Red for errors/destructive actions
 * - active: Orange accent for highlighted/active states (NEW)
 *
 * @param props - Component props
 * @returns Styled badge element
 *
 * @example
 * ```tsx
 * <Badge label="STEAM" variant="default" />
 * <Badge label="INSTALLED" variant="success" />
 * <Badge label="PLAYING" variant="active" icon={<PlayIcon />} />
 * ```
 */
const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', icon, className = '' }) => {
  const classNames = ['badge', `badge-${variant}`, className].filter(Boolean).join(' ');

  return (
    <span className={classNames}>
      {icon ? <span className="badge-icon">{icon}</span> : null}
      <span className="badge-text">{label}</span>
    </span>
  );
};

export default memo(Badge);
