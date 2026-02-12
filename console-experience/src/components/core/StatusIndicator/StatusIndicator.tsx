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

import { AlertCircle, AlertTriangle, Check, Info, Minus } from 'lucide-react';
import React from 'react';

type StatusType = 'success' | 'warning' | 'error' | 'neutral' | 'info';

export interface StatusIndicatorProps {
  /** Semantic status state */
  status: StatusType;
  /** Optional icon element. If not provided, a default icon for the status type will be used. */
  icon?: React.ReactNode;
  /** Enable pulse animation (for loading/active states) */
  pulse?: boolean;
  /** Optional additional CSS classes */
  className?: string;
  /** Status text/label */
  children: React.ReactNode;
}

// Default icons by status type
const DEFAULT_STATUS_ICONS: Record<StatusType, React.ReactNode> = {
  success: <Check size={14} />,
  warning: <AlertTriangle size={14} />,
  error: <AlertCircle size={14} />,
  info: <Info size={14} />,
  neutral: <Minus size={14} />,
};

/**
 * StatusIndicator Component
 *
 * Unified status display component for consistent feedback across the app.
 * Color-coded backgrounds with optional icons and pulse animation.
 * If no icon is provided, a default icon for the status type will be displayed.
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

  // Use provided icon or default icon for status type
  const displayIcon = icon !== undefined ? icon : DEFAULT_STATUS_ICONS[status];

  return (
    <div className={classNames}>
      {displayIcon ? <span className="status-icon">{displayIcon}</span> : null}
      <span className="status-text">{children}</span>
    </div>
  );
};
