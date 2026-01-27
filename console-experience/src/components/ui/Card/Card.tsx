import React, { memo, useState } from 'react';
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

const Card: React.FC<CardProps> = ({ title, image, isFocused = false, isLoading = false, style, onClick, onDoubleClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // If external loading state is true, render skeleton
  if (isLoading) {
    return (
      <div 
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
            loading="lazy"
            className={imgLoaded ? 'loaded' : ''}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="fallback-content">
             <ImageOff size={48} color="#444" />
             <span style={{fontSize: '0.8rem', color: '#666', marginTop: '10px', textAlign: 'center', padding: '0 10px'}}>
               {title}
             </span>
          </div>
        )}
      </div>
      {/* Shine effect is handled via CSS ::after pseudo-element */}
    </div>
  );
};

export default memo(Card);