/**
 * @module components/ui/Card
 *
 * Game card component with cover art and title.
 */

import './Card.css';

import { Star } from 'lucide-react';
import React, { forwardRef, memo, useEffect, useMemo, useRef, useState } from 'react';

import type { GameSource } from '../../../domain/entities/game';
import { generatePlaceholder } from '../../../utils/game-placeholder';

/**
 * Props for Card component
 */
interface CardProps {
  /** Game title to display */
  title: string;
  /** Cover image URL (local or HTTP) */
  image: string;
  /** Game source (for unique placeholder generation) */
  source?: GameSource;
  /** Whether card is currently focused/selected */
  isFocused?: boolean;
  /** Whether card is in loading state */
  isLoading?: boolean;
  /** Whether game is favorited */
  isFavorite?: boolean;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Click handler */
  onClick?: () => void;
  /** Double-click handler */
  onDoubleClick?: () => void;
}

/**
 * Card Component
 *
 * Game card displaying cover art and title.
 * Supports focus states, loading states, and image fallback.
 *
 * ## Features
 * - Lazy image loading with fallback
 * - Focus/selection highlighting
 * - Loading skeleton state
 * - Click and double-click handlers
 * - Forward ref for scrolling
 *
 * @param props - Component props
 * @param ref - Forward ref for DOM element
 * @returns Game card element
 *
 * @example
 * ```tsx
 * <Card
 *   title="God of War"
 *   image="/covers/gow.jpg"
 *   isFocused={true}
 *   onClick={handleClick}
 * />
 * ```
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      image,
      source = 'Manual',
      isFocused = false,
      isLoading = false,
      isFavorite = false,
      style,
      onClick,
      onDoubleClick,
    },
    ref
  ) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Generate unique placeholder based on game title and source
    const placeholder = useMemo(() => {
      return generatePlaceholder(title, source);
    }, [title, source]);

    /**
     * Reset image loading state when image prop changes.
     *
     * This effect synchronizes internal component state with the external image prop.
     * While the linter discourages setState in effects, this is a valid use case because:
     * 1. We need to reset loading state when transitioning between different images
     * 2. We optimize for cached images to avoid unnecessary loading states
     * 3. Alternative patterns (key prop, controlled component) would require parent changes
     *
     * The effect runs only when image URL changes, avoiding unnecessary cascading renders.
     */
    useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid: Reset state on prop change
      setImgLoaded(false);

      setImgError(false);

      // Check if image is already loaded (from cache)
      const img = imgRef.current;
      if (img?.complete && img.naturalWidth > 0) {
        setImgLoaded(true);
      }
    }, [image]);

    // Note: scrollIntoView is handled by parent GameCarousel to avoid scroll conflicts

    if (isLoading) {
      return (
        <div
          ref={ref}
          className={`card skeleton ${isFocused ? 'focused' : ''}`}
          style={style}
          data-testid="game-card-skeleton"
        >
          <div className="card-image-container" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`card ${isFocused ? 'focused' : ''} ${imgError ? 'error' : ''}`}
        style={style}
        data-testid="game-card"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        role="button"
        tabIndex={0}
      >
        <div className="card-image-container">
          {!imgError ? (
            <img
              ref={imgRef}
              src={image}
              alt={title}
              className={imgLoaded ? 'loaded' : ''}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          ) : (
            <img
              src={placeholder}
              alt={title}
              className="loaded fallback-image placeholder-image"
            />
          )}
          {!imgLoaded && !imgError ? <div className="card-title-fallback">{title}</div> : null}
          {isFavorite ? (
            <div className="card-favorite-badge" aria-label="Favorito">
              <Star size={16} fill="currentColor" />
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

export default memo(Card);
