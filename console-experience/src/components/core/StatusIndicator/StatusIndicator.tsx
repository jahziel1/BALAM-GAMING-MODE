/**
 * StatusIndicator Component - Unified Design System
 *
 * Consolidates status badge implementations:
 * - ServiceStatusCard.css .status-badge (3 states)
 * - PerformancePip.css .pip-loading, .pip-error
 * - Game session indicators
 *
 * Features:
 * - 5 semantic states: success, warning, error, neutral, info
 * - Optional icon support
 * - Optional pulse animation for loading/active states
 * - Consistent colors across the app
 * - Uses design tokens
 *
 * @example
 * ```tsx
 * <StatusIndicator status="success" icon={<CheckIcon />}>
 *   Service Running
 * </StatusIndicator>
 *
 * <StatusIndicator status="error" pulse>
 *   Connection Failed
 * </StatusIndicator>
 * ```
 */

import './StatusIndicator.css';

import React from 'react';

export interface StatusIndicatorProps {
  /** Semantic status state */
  status: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  /** Optional icon element */
  icon?: React.ReactNode;
  /** Enable pulse animation (for loading/active states) */
  pulse?: boolean;
  /** Optional additional CSS classes */
  className?: string;
  /** Status text/label */
  children: React.ReactNode;
}

/**
 * StatusIndicator Component
 *
 * Unified status display component for consistent feedback across the app.
 * Color-coded backgrounds with optional icons and pulse animation.
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  icon,
  pulse = false,
  className = '',
  children,
}) => {
  const classNames = ['status-indicator', `status-${status}`, pulse && 'status-pulse', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      {icon ? <span className="status-icon">{icon}</span> : null}
      <span className="status-text">{children}</span>
    </div>
  );
};
