import { useMemo, useState } from 'react';

import { buildCarousels } from '../components/App';
import type { FilterType } from '../components/ui/FilterChips';
import type { Game } from '../domain/entities/game';

/**
 * Filters the game list by the active filter and computes carousel offsets
 * for row-aware navigation.
 */
export function useFilteredGames(games: Game[]) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredGames = useMemo(() => {
    switch (activeFilter) {
      case 'favorites':
        return games.filter((g) => g.is_favorite === 1);
      case 'recents':
        return games
          .filter((g) => g.last_played !== null)
          .sort((a, b) => (b.last_played ?? 0) - (a.last_played ?? 0))
          .slice(0, 20);
      case 'steam':
        return games.filter((g) => g.source === 'Steam');
      case 'epic':
        return games.filter((g) => g.source === 'Epic');
      case 'xbox':
        return games.filter((g) => g.source === 'Xbox');
      case 'battlenet':
        return games.filter((g) => g.source === 'BattleNet');
      case 'manual':
        return games.filter((g) => g.source === 'Manual');
      case 'all':
      default:
        return games;
    }
  }, [games, activeFilter]);

  const carouselOffsets = useMemo(() => {
    const carousels = buildCarousels(filteredGames);
    return carousels.map((_, i) =>
      carousels.slice(0, i).reduce((sum, c) => sum + c.games.length, 0)
    );
  }, [filteredGames]);

  return { filteredGames, carouselOffsets, activeFilter, setActiveFilter };
}
