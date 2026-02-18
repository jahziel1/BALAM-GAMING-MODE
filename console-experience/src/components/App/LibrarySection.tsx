/**
 * @module components/App/LibrarySection
 *
 * Game library with horizontal carousels.
 * Steam Big Picture inspired layout with categorized game rows.
 *
 * Navigation model:
 * - activeIndex is a flat index across ALL non-overlapping carousel entries
 * - Games in "Recently Played" are excluded from source carousels to avoid duplicates
 * - Flat index maps to [carouselIdx, localIdx] via cumulative offsets
 */

import './LibrarySection.css';

import { useMemo } from 'react';

import { getSourceConfig, getSourcesByPriority } from '@/config/game-sources';

import type { Game } from '../../domain/entities/game';
import type { FocusArea } from '../../hooks/useNavigation';
import { GameCarousel } from '../GameLibrary/GameCarousel';

/**
 * Build non-overlapping carousel rows from a flat game list.
 * Exported so App.tsx can compute carousel offsets for navigation.
 */
export function buildCarousels(games: Game[]): { title: string; games: Game[] }[] {
  const recentGames = games.slice(0, Math.min(10, games.length));
  const recentIds = new Set(recentGames.map((g) => g.id));

  const bySource = new Map<string, Game[]>();
  for (const game of games) {
    const existing = bySource.get(game.source) ?? [];
    existing.push(game);
    bySource.set(game.source, existing);
  }

  const result: { title: string; games: Game[] }[] = [];

  if (recentGames.length > 0) {
    result.push({ title: 'Recently Played', games: recentGames });
  }

  const sources = getSourcesByPriority();
  for (const source of sources) {
    const sourceGames = (bySource.get(source) ?? []).filter((g) => !recentIds.has(g.id));
    if (sourceGames.length > 0) {
      const config = getSourceConfig(source);
      result.push({ title: config.carouselTitle, games: sourceGames });
    }
  }

  if (result.length === 0 && games.length > 0) {
    result.push({ title: 'All Games', games });
  }

  return result;
}

interface LibrarySectionProps {
  games: Game[];
  activeIndex: number;
  focusArea: FocusArea;
  onLaunchGame: (game: Game, index: number) => void;
  onSetActiveIndex: (index: number) => void;
  onSetFocusArea: (area: FocusArea) => void;
}

export function LibrarySection({
  games,
  activeIndex,
  focusArea,
  onLaunchGame,
  onSetActiveIndex,
  onSetFocusArea,
}: LibrarySectionProps) {
  const isLibraryFocused = focusArea === 'LIBRARY';

  const carousels = useMemo(() => buildCarousels(games), [games]);

  // Cumulative start offsets: carousel i starts at offsets[i] in the flat index
  const offsets = useMemo(
    () =>
      carousels.map((_, i) => carousels.slice(0, i).reduce((sum, c) => sum + c.games.length, 0)),
    [carousels]
  );

  // Map flat activeIndex → active carousel + local item index within that carousel
  const { activeCarouselIdx, localIdx } = useMemo(() => {
    if (carousels.length === 0) return { activeCarouselIdx: 0, localIdx: 0 };
    const idx = offsets.reduce((found, offset, i) => (activeIndex >= offset ? i : found), 0);
    return {
      activeCarouselIdx: idx,
      localIdx: Math.min(activeIndex - offsets[idx], carousels[idx].games.length - 1),
    };
  }, [activeIndex, offsets, carousels]);

  return (
    <div className="library-section" onMouseEnter={() => onSetFocusArea('LIBRARY')}>
      {carousels.map((carousel, idx) => (
        <GameCarousel
          key={carousel.title}
          title={carousel.title}
          games={carousel.games}
          focusedIndex={idx === activeCarouselIdx ? localIdx : -1}
          isActive={isLibraryFocused ? idx === activeCarouselIdx : false}
          onLaunch={(game, localIndex) => onLaunchGame(game, offsets[idx] + localIndex)}
          onSetFocus={(localIndex) => onSetActiveIndex(offsets[idx] + localIndex)}
        />
      ))}
    </div>
  );
}
