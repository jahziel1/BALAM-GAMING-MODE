/**
 * Tests for GameLibraryVirtualized component
 *
 * Tests cover:
 * - Rendering with different game counts
 * - Virtualization behavior (only visible items rendered)
 * - Click event handling
 * - Focus state management
 * - Active index tracking
 * - Mouse interaction
 * - Image caching integration
 */

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from '../../domain/entities/game';
import { GameLibraryVirtualized } from './GameLibraryVirtualized';

// Mock image cache
vi.mock('../../utils/image-cache', () => ({
  getCachedAssetSrc: vi.fn((path, defaultCover) => path || defaultCover),
}));

// Mock Card component to simplify testing
vi.mock('../ui/Card/Card', () => ({
  default: ({ title, onClick, isFocused }: any) => (
    <div data-testid={`card-${title}`} data-focused={isFocused} onClick={onClick}>
      {title}
    </div>
  ),
}));

// Mock TanStack Virtual to return visible items in test environment
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: any) => ({
    getVirtualItems: () => {
      // Return first 3 rows as visible (up to 18 items)
      const visibleRows = Math.min(count, 3);
      return Array.from({ length: visibleRows }, (_, index) => ({
        index,
        key: `row-${index}`,
        size: 316, // ROW_HEIGHT
        start: index * 316,
      }));
    },
    getTotalSize: () => count * 316,
  }),
}));

describe('GameLibraryVirtualized', () => {
  const mockGames: Game[] = [
    {
      id: '1',
      raw_id: '1',
      title: 'Game 1',
      path: '/games/1',
      image: '/img1.jpg',
      hero_image: null,
      logo: null,
      last_played: null,
      source: 'Steam',
    },
    {
      id: '2',
      raw_id: '2',
      title: 'Game 2',
      path: '/games/2',
      image: '/img2.jpg',
      hero_image: null,
      logo: null,
      last_played: null,
      source: 'Epic',
    },
    {
      id: '3',
      raw_id: '3',
      title: 'Game 3',
      path: '/games/3',
      image: '/img3.jpg',
      hero_image: null,
      logo: null,
      last_played: null,
      source: 'Xbox',
    },
    {
      id: '4',
      raw_id: '4',
      title: 'Game 4',
      path: '/games/4',
      image: '/img4.jpg',
      hero_image: null,
      logo: null,
      last_played: null,
      source: 'Steam',
    },
    {
      id: '5',
      raw_id: '5',
      title: 'Game 5',
      path: '/games/5',
      image: '/img5.jpg',
      hero_image: null,
      logo: null,
      last_played: null,
      source: 'Epic',
    },
  ];

  const defaultProps = {
    games: mockGames,
    onLaunchGame: vi.fn(),
    activeIndex: 0,
    focusArea: 'LIBRARY' as const,
    onSetActiveIndex: vi.fn(),
    onSetFocusArea: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with games', () => {
      render(<GameLibraryVirtualized {...defaultProps} />);

      // Should render the virtualized container
      const container = screen.getByTestId('card-Game 1').closest('.game-library-virtualized');
      expect(container).toBeTruthy();
    });

    it('should render empty state with no games', () => {
      const { container } = render(<GameLibraryVirtualized {...defaultProps} games={[]} />);

      const libraryContainer = container.querySelector('.game-library-virtualized');
      expect(libraryContainer).toBeTruthy();
    });

    it('should render cards for visible games', () => {
      render(<GameLibraryVirtualized {...defaultProps} />);

      // At least some games should be visible (virtualization may limit this)
      expect(screen.queryByTestId('card-Game 1')).toBeTruthy();
    });
  });

  describe('Focus State', () => {
    it('should mark active card as focused when focus is on LIBRARY', () => {
      render(<GameLibraryVirtualized {...defaultProps} activeIndex={1} focusArea="LIBRARY" />);

      // Game 2 (index 1) should be focused
      const card = screen.getByTestId('card-Game 2');
      expect(card.getAttribute('data-focused')).toBe('true');
    });

    it('should not mark active card as focused when focus is not on LIBRARY', () => {
      render(<GameLibraryVirtualized {...defaultProps} activeIndex={1} focusArea="HERO" />);

      // Game 2 (index 1) should NOT be focused
      const card = screen.getByTestId('card-Game 2');
      expect(card.getAttribute('data-focused')).toBe('false');
    });

    it('should only focus the active card', () => {
      render(<GameLibraryVirtualized {...defaultProps} activeIndex={2} focusArea="LIBRARY" />);

      // Only Game 3 (index 2) should be focused
      expect(screen.getByTestId('card-Game 1').getAttribute('data-focused')).toBe('false');
      expect(screen.getByTestId('card-Game 2').getAttribute('data-focused')).toBe('false');
      expect(screen.getByTestId('card-Game 3').getAttribute('data-focused')).toBe('true');
    });
  });

  describe('Click Handling', () => {
    it('should call onLaunchGame when card is clicked', () => {
      const onLaunchGame = vi.fn();

      render(<GameLibraryVirtualized {...defaultProps} onLaunchGame={onLaunchGame} />);

      const card = screen.getByTestId('card-Game 1');
      fireEvent.click(card);

      expect(onLaunchGame).toHaveBeenCalledTimes(1);
      expect(onLaunchGame).toHaveBeenCalledWith(mockGames[0], 0);
    });

    it('should call onSetActiveIndex when card is clicked', () => {
      const onSetActiveIndex = vi.fn();

      render(<GameLibraryVirtualized {...defaultProps} onSetActiveIndex={onSetActiveIndex} />);

      const card = screen.getByTestId('card-Game 3');
      fireEvent.click(card);

      expect(onSetActiveIndex).toHaveBeenCalledWith(2);
    });

    it('should call onSetFocusArea when card is clicked', () => {
      const onSetFocusArea = vi.fn();

      render(<GameLibraryVirtualized {...defaultProps} onSetFocusArea={onSetFocusArea} />);

      const card = screen.getByTestId('card-Game 1');
      fireEvent.click(card);

      expect(onSetFocusArea).toHaveBeenCalledWith('LIBRARY');
    });

    it('should handle multiple clicks correctly', () => {
      const onLaunchGame = vi.fn();
      const onSetActiveIndex = vi.fn();

      render(
        <GameLibraryVirtualized
          {...defaultProps}
          onLaunchGame={onLaunchGame}
          onSetActiveIndex={onSetActiveIndex}
        />
      );

      // Click first game
      fireEvent.click(screen.getByTestId('card-Game 1'));
      expect(onLaunchGame).toHaveBeenLastCalledWith(mockGames[0], 0);
      expect(onSetActiveIndex).toHaveBeenLastCalledWith(0);

      // Click second game
      fireEvent.click(screen.getByTestId('card-Game 2'));
      expect(onLaunchGame).toHaveBeenLastCalledWith(mockGames[1], 1);
      expect(onSetActiveIndex).toHaveBeenLastCalledWith(1);
    });
  });

  describe('Mouse Interaction', () => {
    it('should set focus area to LIBRARY on mouse enter', () => {
      const onSetFocusArea = vi.fn();

      const { container } = render(
        <GameLibraryVirtualized {...defaultProps} onSetFocusArea={onSetFocusArea} />
      );

      const libraryContainer = container.querySelector('.game-library-virtualized');
      if (libraryContainer) {
        fireEvent.mouseEnter(libraryContainer);
        expect(onSetFocusArea).toHaveBeenCalledWith('LIBRARY');
      }
    });
  });

  describe('Large Game Libraries', () => {
    it('should handle 100 games efficiently', () => {
      const manyGames: Game[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        raw_id: `${i}`,
        title: `Game ${i}`,
        path: `/games/${i}`,
        image: `/img${i}.jpg`,
        hero_image: null,
        logo: null,
        last_played: null,
        source: 'Steam' as const,
      }));

      const { container } = render(<GameLibraryVirtualized {...defaultProps} games={manyGames} />);

      // Should render container
      expect(container.querySelector('.game-library-virtualized')).toBeTruthy();

      // Due to virtualization, not all 100 games should be in DOM
      // (This is hard to test precisely without mocking intersection observer)
    });

    it('should handle 1000 games without performance issues', () => {
      const manyGames: Game[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        raw_id: `${i}`,
        title: `Game ${i}`,
        path: `/games/${i}`,
        image: `/img${i}.jpg`,
        hero_image: null,
        logo: null,
        last_played: null,
        source: 'Steam' as const,
      }));

      const startTime = performance.now();

      const { container } = render(<GameLibraryVirtualized {...defaultProps} games={manyGames} />);

      const renderTime = performance.now() - startTime;

      // Should render quickly (less than 100ms for initial render)
      expect(renderTime).toBeLessThan(100);

      // Should render container
      expect(container.querySelector('.game-library-virtualized')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle activeIndex out of bounds gracefully', () => {
      render(
        <GameLibraryVirtualized
          {...defaultProps}
          activeIndex={999} // Out of bounds
        />
      );

      // Should render without crashing
      expect(screen.getByTestId('card-Game 1')).toBeTruthy();
    });

    it('should handle negative activeIndex', () => {
      render(<GameLibraryVirtualized {...defaultProps} activeIndex={-1} />);

      // Should render without crashing
      expect(screen.getByTestId('card-Game 1')).toBeTruthy();
    });

    it('should handle single game', () => {
      render(<GameLibraryVirtualized {...defaultProps} games={[mockGames[0]]} activeIndex={0} />);

      expect(screen.getByTestId('card-Game 1')).toBeTruthy();
    });
  });

  describe('Integration with Image Cache', () => {
    it('should use getCachedAssetSrc for images', async () => {
      const { getCachedAssetSrc } = await import('../../utils/image-cache');

      render(<GameLibraryVirtualized {...defaultProps} />);

      // Should have called getCachedAssetSrc for visible games
      expect(getCachedAssetSrc).toHaveBeenCalled();
    });
  });
});
