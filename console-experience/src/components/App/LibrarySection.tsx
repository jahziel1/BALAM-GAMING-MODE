/**
 * @module components/App/LibrarySection
 *
 * Game library with horizontal carousels.
 * Steam Big Picture inspired layout with categorized game rows.
 */

import './LibrarySection.css';

import { useMemo } from 'react';

import { getSourceConfig, getSourcesByPriority } from '@/config/game-sources';

import type { Game } from '../../domain/entities/game';
import type { FocusArea } from '../../hooks/useNavigation';
import { GameCarousel } from '../GameLibrary/GameCarousel';

/**
 * Props for LibrarySection component
 */
interface LibrarySectionProps {
  /** Array of all games to display */
  games: Game[];
  /** Index of currently active/selected game */
  activeIndex: number;
  /** Current focus area for navigation */
  focusArea: FocusArea;
  /** Callback when game is launched */
  onLaunchGame: (game: Game, index: number) => void;
  /** Callback when active index changes */
  onSetActiveIndex: (index: number) => void;
  /** Callback when focus area changes */
  onSetFocusArea: (area: FocusArea) => void;
}

/**
 * LibrarySection Component
 *
 * Displays the game library as horizontal carousels organized by category.
 * Similar to Steam Big Picture's categorized game rows.
 *
 * @param props - Component props
 * @returns Categorized game carousels
 */
export function LibrarySection({
  games,
  activeIndex,
  focusArea,
  onLaunchGame,
  onSetActiveIndex,
  onSetFocusArea,
}: LibrarySectionProps) {
  // Categorize games dynamically by source
  const { recentGames, gamesBySource, allGames } = useMemo(() => {
    // Recent games (last played - for now just first 10)
    const recent = games.slice(0, Math.min(10, games.length));

    // Group by source dynamically
    const bySource = new Map<string, Game[]>();
    for (const game of games) {
      const existing = bySource.get(game.source) ?? [];
      existing.push(game);
      bySource.set(game.source, existing);
    }

    return {
      recentGames: recent,
      gamesBySource: bySource,
      allGames: games,
    };
  }, [games]);

  const isLibraryFocused = focusArea === 'LIBRARY';

  // Build carousel list dynamically
  const carousels = useMemo(() => {
    const result = [];

    // Recent games carousel
    if (recentGames.length > 0) {
      result.push({ title: 'Recently Played', games: recentGames });
    }

    // Source carousels (dynamically generated, sorted by priority)
    const sources = getSourcesByPriority();
    for (const source of sources) {
      const sourceGames = gamesBySource.get(source);
      if (sourceGames && sourceGames.length > 0) {
        const config = getSourceConfig(source);
        result.push({
          title: config.carouselTitle,
          games: sourceGames,
        });
      }
    }

    // Only show "All Games" if no other carousels exist
    if (result.length === 0 && allGames.length > 0) {
      result.push({ title: 'All Games', games: allGames });
    }

    return result;
  }, [recentGames, gamesBySource, allGames]);

  // FIX: Only focus the FIRST carousel to prevent shared focus across all carousels
  // This ensures each carousel shows focus only when it's the active one
  const activeCarouselIndex = 0; // For now, always use first carousel

  const getCarouselProps = (carouselIdx: number, carouselGames: Game[]) => {
    const isActiveCarousel = carouselIdx === activeCarouselIndex;
    const carouselFocusIndex = isActiveCarousel
      ? Math.min(activeIndex, carouselGames.length - 1) // Clamp to valid range
      : -1; // No focus for non-active carousels

    return {
      focusedIndex: carouselFocusIndex,
      isActive: isLibraryFocused && isActiveCarousel,
    };
  };

  return (
    <div className="library-section" onMouseEnter={() => onSetFocusArea('LIBRARY')}>
      {carousels.map((carousel, idx) => (
        <GameCarousel
          key={carousel.title}
          title={carousel.title}
          games={carousel.games}
          {...getCarouselProps(idx, carousel.games)}
          onLaunch={onLaunchGame}
          onSetFocus={onSetActiveIndex}
        />
      ))}
    </div>
  );
}
