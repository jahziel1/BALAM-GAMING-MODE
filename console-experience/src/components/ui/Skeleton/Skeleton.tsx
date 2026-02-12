/**
 * Skeleton Component
 *
 * Loading placeholder with shimmer animation.
 * Used for loading states in GameLibrary, WiFiPanel, BluetoothPanel, etc.
 */

import './Skeleton.css';

export interface SkeletonProps {
  variant?: 'card' | 'text' | 'circle' | 'rectangle';
  width?: string;
  height?: string;
  className?: string;
}

/**
 * Skeleton loading component with shimmer animation
 *
 * @example
 * // Card skeleton (3:4 aspect ratio)
 * <Skeleton variant="card" />
 *
 * @example
 * // Custom dimensions
 * <Skeleton width="200px" height="60px" />
 *
 * @example
 * // Text line
 * <Skeleton variant="text" width="80%" />
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangle',
  width,
  height,
  className = '',
}) => {
  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={{ width, height }}
      aria-label="Loading..."
      role="status"
    />
  );
};
