import React, { memo, useState, useEffect, forwardRef } from 'react';
import './Card.css';
import { ImageOff } from 'lucide-react';

interface CardProps {
  title: string;
  image: string;
  isFocused?: boolean;
  isLoading?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  title,
  image,
  isFocused = false,
  isLoading = false,
  style,
  onClick,
  onDoubleClick
}, ref) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Performance optimization: only scroll into view if focused changes to true
  useEffect(() => {
    if (isFocused && ref && typeof ref !== 'function' && ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [isFocused, ref]);

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
            src={image}
            alt={title}
            className={imgLoaded ? 'loaded' : ''}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="fallback-content">
            <ImageOff size={48} color="#444" />
          </div>
        )}
        {(!imgLoaded || imgError) && (
          <div className="card-title-fallback">
            {title}
          </div>
        )}
      </div>
    </div>
  );
});

export default memo(Card);