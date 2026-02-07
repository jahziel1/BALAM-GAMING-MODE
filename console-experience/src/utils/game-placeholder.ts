/**
 * Game Placeholder Generator
 *
 * Generates unique, visually distinct placeholder covers for games without artwork.
 * Each placeholder is customized based on game source and title.
 *
 * ## Features
 * - **Source-specific colors**: Automatically uses colors from game-sources config
 * - **Unique per game**: Uses game title to generate color variations
 * - **SVG-based**: Lightweight, scalable, no external assets needed
 * - **Accessibility**: High contrast, readable text
 * - **Centralized**: Add new source in game-sources.ts, placeholder works automatically
 *
 * @module utils/game-placeholder
 */

import { getSourceConfig } from '@/config/game-sources';
import type { GameSource } from '@/domain/entities/game';

/**
 * Extract initials from game title (max 3 characters)
 *
 * @param title - Game title
 * @returns 1-3 character initials
 *
 * @example
 * ```typescript
 * getInitials("The Witcher 3") // "TW3"
 * getInitials("DOOM") // "D"
 * getInitials("Grand Theft Auto V") // "GTA"
 * ```
 */
function getInitials(title: string): string {
  if (!title) return '?';

  // Remove common game suffixes
  const cleaned = title
    .replace(/\s+(Edition|Remastered|Enhanced|Definitive|Complete|GOTY|Game of the Year)\s*$/i, '')
    .trim();

  // Split into words
  const words = cleaned.split(/\s+/);

  if (words.length === 1) {
    // Single word: take first 1-3 chars
    return words[0].substring(0, 3).toUpperCase();
  }

  if (words.length === 2) {
    // Two words: first letter of each
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  // Three or more words: first letter of first 3 words
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Generate a deterministic color variation based on title
 *
 * @param title - Game title
 * @param baseColor - Base accent color
 * @returns Modified color string
 */
function varyColor(title: string, baseColor: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Extract RGB from hex
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  // Vary hue slightly (-30 to +30)
  const variation = (hash % 60) - 30;
  const newR = Math.max(0, Math.min(255, r + variation));
  const newG = Math.max(0, Math.min(255, g + variation));
  const newB = Math.max(0, Math.min(255, b + variation));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Generate SVG placeholder cover
 *
 * Creates a unique, professional-looking placeholder image for games without artwork.
 * Each placeholder includes:
 * - Source-specific color scheme
 * - Game title initials (1-3 letters)
 * - Source icon (Steam/Xbox/Epic/Manual)
 * - Subtle gradient background
 *
 * @param title - Game title
 * @param source - Game source (Steam, Xbox, Epic, Manual)
 * @returns Data URL containing SVG image
 *
 * @example
 * ```typescript
 * const placeholder = generatePlaceholder("The Witcher 3", "Steam");
 * <img src={placeholder} alt="Game cover" />
 * ```
 */
export function generatePlaceholder(title: string, source: GameSource): string {
  const config = getSourceConfig(source);
  const colors = {
    primary: config.primaryColor,
    secondary: config.secondaryColor,
    accent: config.accentColor,
  };
  const initials = getInitials(title);
  const accentColor = varyColor(title, colors.accent);
  const iconPath = config.iconPath;

  const svg = `
    <svg width="300" height="450" viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${source}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.5"/>
        </filter>
      </defs>

      <!-- Background gradient -->
      <rect width="300" height="450" fill="url(#grad-${source})"/>

      <!-- Diagonal accent lines -->
      <line x1="0" y1="100" x2="300" y2="200" stroke="${accentColor}" stroke-width="1" opacity="0.3"/>
      <line x1="0" y1="250" x2="300" y2="350" stroke="${accentColor}" stroke-width="1" opacity="0.3"/>

      <!-- Initials circle -->
      <circle cx="150" cy="180" r="70" fill="${accentColor}" opacity="0.2" filter="url(#shadow)"/>
      <text
        x="150"
        y="200"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="56"
        font-weight="700"
        fill="${accentColor}"
        text-anchor="middle"
        filter="url(#shadow)"
      >${initials}</text>

      <!-- Game title (truncated) -->
      <text
        x="150"
        y="310"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="16"
        font-weight="600"
        fill="rgba(255,255,255,0.9)"
        text-anchor="middle"
      >
        ${title.length > 24 ? title.substring(0, 21) + '...' : title}
      </text>

      <!-- Source icon and label -->
      <g transform="translate(120, 360)">
        <rect width="60" height="30" rx="4" fill="rgba(0,0,0,0.3)"/>
        <svg x="8" y="5" width="20" height="20" viewBox="0 0 24 24">
          <path d="${iconPath}" fill="${accentColor}"/>
        </svg>
        <text
          x="32"
          y="20"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="11"
          font-weight="600"
          fill="rgba(255,255,255,0.8)"
        >${config.displayName}</text>
      </g>
    </svg>
  `;

  // Convert SVG to data URL
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');

  return `data:image/svg+xml,${encoded}`;
}

/**
 * Get placeholder for a game
 *
 * Convenience function that generates a unique placeholder based on game metadata.
 *
 * @param title - Game title
 * @param source - Game source
 * @returns Data URL for placeholder image
 */
export function getGamePlaceholder(title: string, source: GameSource): string {
  return generatePlaceholder(title, source);
}
