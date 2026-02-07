/**
 * Time Formatting Utilities
 *
 * Native JavaScript time formatting - no external dependencies.
 *
 * @module utils/time-format
 */

/**
 * Format seconds to human-readable play time
 *
 * @param seconds - Total seconds played
 * @returns Formatted string (e.g., "2h 15m", "45m", "3s")
 *
 * @example
 * ```ts
 * formatPlayTime(0) // "Never played"
 * formatPlayTime(30) // "30s"
 * formatPlayTime(900) // "15m"
 * formatPlayTime(3665) // "1h 1m"
 * formatPlayTime(7200) // "2h"
 * formatPlayTime(36000) // "10h"
 * ```
 */
export function formatPlayTime(seconds: number): string {
  if (seconds === 0) {
    return 'Never played';
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format seconds to detailed play time (with days)
 *
 * @param seconds - Total seconds played
 * @returns Detailed formatted string (e.g., "2d 5h 30m")
 *
 * @example
 * ```ts
 * formatPlayTimeDetailed(0) // "Never played"
 * formatPlayTimeDetailed(90000) // "1d 1h"
 * formatPlayTimeDetailed(864000) // "10d"
 * ```
 */
export function formatPlayTimeDetailed(seconds: number): string {
  if (seconds === 0) {
    return 'Never played';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 && days === 0) {
    // Only show minutes if less than 1 day
    parts.push(`${minutes}m`);
  }

  return parts.join(' ') || '0m';
}

/**
 * Format Unix timestamp to relative time (e.g., "2 hours ago")
 *
 * @param unixTimestamp - Unix timestamp in seconds
 * @returns Relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(Date.now() / 1000 - 3600) // "1 hour ago"
 * formatRelativeTime(Date.now() / 1000 - 86400) // "1 day ago"
 * ```
 */
export function formatRelativeTime(unixTimestamp: number | null): string {
  if (!unixTimestamp) {
    return 'Never';
  }

  const now = Date.now() / 1000;
  const diffSeconds = Math.floor(now - unixTimestamp);

  if (diffSeconds < 60) {
    return 'Just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}
