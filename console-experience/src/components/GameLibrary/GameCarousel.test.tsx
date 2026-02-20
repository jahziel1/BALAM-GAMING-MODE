/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from '../../domain/entities/game';
import { GameCarousel } from './GameCarousel';

// Mock Tauri core so convertFileSrc (used in getCachedAssetSrc) doesn't crash in jsdom
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => path),
  invoke: vi.fn(),
}));

// Mock image-cache to return path directly (avoids Tauri convertFileSrc calls)
vi.mock('../../utils/image-cache', () => ({
  getCachedAssetSrc: vi.fn((path: string | null, fallback: string) => path ?? fallback),
}));

// Mock game data
const mockGames: Game[] = [
  {
    id: '1',
    raw_id: 'steam_1',
    title: 'Test Game 1',
    path: '/path/to/game1',
    image: 'asset://test1.jpg',
    hero_image: null,
    logo: null,
    source: 'Steam' as const,
    last_played: Date.now(),
  },
  {
    id: '2',
    raw_id: 'steam_2',
    title: 'Test Game 2',
    path: '/path/to/game2',
    image: 'asset://test2.jpg',
    hero_image: null,
    logo: null,
    source: 'Steam' as const,
    last_played: Date.now(),
  },
  {
    id: '3',
    raw_id: 'xbox_1',
    title: 'Test Game 3',
    path: '/path/to/game3',
    image: 'asset://test3.jpg',
    hero_image: null,
    logo: null,
    source: 'Xbox' as const,
    last_played: Date.now(),
  },
];

describe('GameCarousel - Scroll Behavior', () => {
  const mockOnLaunch = vi.fn();
  const mockOnSetFocus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom doesn't implement scrollIntoView — mock it globally so renders don't crash
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('should render carousel with title', () => {
    render(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={0}
        isActive={true}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    expect(screen.getByText('Test Carousel')).toBeInTheDocument();
  });

  it('should render all game cards', () => {
    render(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={0}
        isActive={true}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    const cards = screen.getAllByTestId('game-card');
    expect(cards).toHaveLength(3);
  });

  it('should mark focused card with correct classes', () => {
    render(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={1}
        isActive={true}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    const cards = screen.getAllByTestId('game-card');
    const secondCard = cards[1];

    // Should have focused class
    expect(secondCard.className).toContain('focused');
  });

  it('should NOT apply focused class when carousel is inactive', () => {
    render(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={1}
        isActive={false}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    const cards = screen.getAllByTestId('game-card');
    const secondCard = cards[1];

    // Should NOT have focused class when inactive
    expect(secondCard.className).not.toContain('focused');
  });

  it('should call scrollIntoView when focus changes and carousel is active', async () => {
    // Mock scrollIntoView
    const mockScrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = mockScrollIntoView;

    const { rerender } = render(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={0}
        isActive={true}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    // Change focus
    rerender(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={1}
        isActive={true}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    });
  });

  it('inactive carousel does not apply focused CSS class to cards', () => {
    // The component scrolls regardless of isActive (useEffect runs always),
    // but focused CSS class is only added when isActive=true.
    render(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={1}
        isActive={false}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    const cards = screen.getAllByTestId('game-card');
    // No card should have focused class when carousel is inactive
    cards.forEach((card) => {
      expect(card.className).not.toContain('card--focused');
    });
  });

  it('should only scroll ONCE when focus changes (no infinite loop)', async () => {
    const mockScrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = mockScrollIntoView;

    const { rerender } = render(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={0}
        isActive={true}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    // Clear initial calls
    mockScrollIntoView.mockClear();

    // Change focus
    rerender(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={1}
        isActive={true}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Should be called exactly once, not multiple times
    expect(mockScrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('should render empty state if no games provided', () => {
    render(
      <GameCarousel
        title="Empty Carousel"
        games={[]}
        focusedIndex={0}
        isActive={true}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    expect(screen.getByText('No games in this category')).toBeInTheDocument();
  });

  it('should apply correct data-active attribute', () => {
    const { container, rerender } = render(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={0}
        isActive={true}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    const section = container.querySelector('.carousel-section');
    expect(section?.getAttribute('data-active')).toBe('true');

    // Change to inactive
    rerender(
      <GameCarousel
        title="Test Carousel"
        games={mockGames}
        focusedIndex={0}
        isActive={false}
        onLaunch={mockOnLaunch}
        onSetFocus={mockOnSetFocus}
      />
    );

    expect(section?.getAttribute('data-active')).toBe('false');
  });
});
