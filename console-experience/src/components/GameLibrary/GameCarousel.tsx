/**
 * Game Carousel Component
 *
 * Horizontal scrolling carousel for game collections.
 * Follows hexagonal architecture with separation of concerns.
 *
 * @module components/GameLibrary/GameCarousel
 */

import './GameCarousel.css';

import { memo, useEffect, useRef } from 'react';

import defaultCover from '../../assets/default_cover.png';
import type { Game } from '../../domain/entities/game';
import { getCachedAssetSrc } from '../../utils/image-cache';
import Card from '../ui/Card/Card';

/**
 * Props for GameCarousel component
 */
interface GameCarouselProps {
  /** Section title */
  title: string;
  /** Games to display */
  games: Game[];
  /** Index of focused game */
  focusedIndex: number;
  /** Whether this carousel is active */
  isActive: boolean;
  /** Launch game handler */
  onLaunch: (game: Game, index: number) => void;
  /** Set focus handler */
  onSetFocus: (index: number) => void;
}

/**
 * GameCarousel - Horizontal scrolling game list
 *
 * Displays games in a horizontal row with focus-based navigation.
 * Auto-scrolls to keep focused item visible.
 *
 * ## Features
 * - Horizontal scroll
 * - Auto-scroll to focused item
 * - Mouse hover support
 * - Keyboard/gamepad navigation ready
 *
 * @param props - Component props
 * @returns Horizontal game carousel
 */
export const GameCarousel = memo(
  ({ title, games, focusedIndex, isActive, onLaunch }: GameCarouselProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Auto-scroll to focused item
    useEffect(() => {
      if (isActive && focusedIndex >= 0 && cardRefs.current[focusedIndex]) {
        cardRefs.current[focusedIndex]?.scrollIntoView({
          behavior: 'smooth',
          inline: 'start', // Match scroll-snap-align: start for consistent behavior
          block: 'nearest',
        });
      }
    }, [focusedIndex, isActive]);

    if (games.length === 0) return null;

    return (
      <section className="carousel-section" data-active={isActive}>
        <h2 className="carousel-title">{title}</h2>

        <div className="carousel-container" ref={containerRef}>
          {games.map((game, index) => {
            const isFocused = isActive && focusedIndex === index;

            return (
              <div
                key={game.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                className={`carousel-item ${isFocused ? 'carousel-item-focused' : ''}`}
              >
                <Card
                  title={game.title}
                  image={getCachedAssetSrc(game.image, defaultCover)}
                  source={game.source}
                  isFocused={isFocused}
                  onClick={() => onLaunch(game, index)}
                  onDoubleClick={() => onLaunch(game, index)}
                />
              </div>
            );
          })}
        </div>
      </section>
    );
  }
);

GameCarousel.displayName = 'GameCarousel';
