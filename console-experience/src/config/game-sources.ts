/**
 * Game Sources Configuration
 *
 * SINGLE SOURCE OF TRUTH for all game sources.
 * To add a new source, just add one entry here.
 */

import type { GameSource } from '@/domain/entities/game';

export interface SourceConfig {
  /** Display name shown in UI */
  displayName: string;
  /** Primary brand color (for placeholders and badges) */
  primaryColor: string;
  /** Secondary color for gradients */
  secondaryColor: string;
  /** Accent color for text/icons */
  accentColor: string;
  /** SVG path for source icon */
  iconPath: string;
  /** Carousel title in library */
  carouselTitle: string;
  /** Priority for scanning (1 = highest, scanned first) */
  scanPriority: number;
}

/**
 * Complete configuration for all game sources.
 * Adding a new source here automatically enables it everywhere.
 */
export const GAME_SOURCES: Record<GameSource, SourceConfig> = {
  Steam: {
    displayName: 'Steam',
    primaryColor: '#1b2838',
    secondaryColor: '#2a475e',
    accentColor: '#66c0f4',
    iconPath:
      'M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M9.17,15.5c-0.64,0-1.17-0.53-1.17-1.17 c0-0.65,0.53-1.17,1.17-1.17c0.65,0,1.17,0.52,1.17,1.17C10.33,14.97,9.81,15.5,9.17,15.5z M15.5,15.5c-0.64,0-1.17-0.53-1.17-1.17 c0-0.65,0.53-1.17,1.17-1.17s1.17,0.52,1.17,1.17C16.67,14.97,16.14,15.5,15.5,15.5z',
    carouselTitle: 'Steam Library',
    scanPriority: 1,
  },
  Epic: {
    displayName: 'Epic Games',
    primaryColor: '#121212',
    secondaryColor: '#2a2a2a',
    accentColor: '#0078f2',
    iconPath: 'M12,2L2,7v10l10,5l10-5V7L12,2z M12,15l-5-2.5v-5L12,5l5,2.5v5L12,15z',
    carouselTitle: 'Epic Games',
    scanPriority: 2,
  },
  Xbox: {
    displayName: 'Xbox',
    primaryColor: '#0e7a0d',
    secondaryColor: '#107c10',
    accentColor: '#92e088',
    iconPath:
      'M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M16,16l-4-4l-4,4V8l4,4l4-4V16z',
    carouselTitle: 'Xbox Game Pass',
    scanPriority: 3,
  },
  BattleNet: {
    displayName: 'Battle.net',
    primaryColor: '#00aeff',
    secondaryColor: '#148eff',
    accentColor: '#1fb0ff',
    iconPath:
      'M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M13.5,17h-3V7h3c1.93,0,3.5,1.57,3.5,3.5 c0,0.97-0.39,1.84-1.03,2.47C17.11,13.66,17.5,14.54,17.5,15.5C17.5,16.33,13.5,17,13.5,17z M13.5,11.5h-1.5v1.5h1.5 c0.83,0,1.5-0.67,1.5-1.5S14.33,11.5,13.5,11.5z M13.5,8.5h-1.5V10h1.5c0.55,0,1-0.45,1-1S14.05,8.5,13.5,8.5z',
    carouselTitle: 'Battle.net',
    scanPriority: 4,
  },
  Manual: {
    displayName: 'Manual',
    primaryColor: '#3a3a3a',
    secondaryColor: '#505050',
    accentColor: '#ff9500',
    iconPath:
      'M20,6h-8l-2-2H4C2.9,4,2.01,4.9,2.01,6L2,18c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V8C22,6.9,21.1,6,20,6z M20,18H4V6h5.17 l2,2H20V18z',
    carouselTitle: 'Custom Games',
    scanPriority: 5,
  },
};

/**
 * Get configuration for a game source
 */
export function getSourceConfig(source: GameSource): SourceConfig {
  return GAME_SOURCES[source];
}

/**
 * Get all sources sorted by scan priority
 */
export function getSourcesByPriority(): GameSource[] {
  return (Object.keys(GAME_SOURCES) as GameSource[]).sort(
    (a, b) => GAME_SOURCES[a].scanPriority - GAME_SOURCES[b].scanPriority
  );
}
