/**
 * @module components/App/HeroSection
 *
 * Hero section displaying the active game with play/resume controls.
 * Steam Big Picture inspired design with full background image.
 */

import './HeroSection.css';

import { getCurrentWindow } from '@tauri-apps/api/window';
import { Play, RotateCcw, Star } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

import defaultCover from '../../assets/default_cover.png';
import type { Game } from '../../domain/entities/game';
import type { FocusArea } from '../../hooks/useNavigation';
import { getCachedAssetSrc } from '../../utils/image-cache';
import Badge from '../ui/Badge/Badge';

/**
 * Represents a running game with its process ID
 */
interface ActiveRunningGame {
  /** The game object */
  game: Game;
  /** Process ID */
  pid: number;
}

/**
 * Props for HeroSection component
 */
interface HeroSectionProps {
  /** Currently selected/active game to display */
  activeGame: Game | undefined;
  /** Currently running game (if any) */
  activeRunningGame: ActiveRunningGame | null;
  /** Current focus area for navigation */
  focusArea: FocusArea;
  /** Whether a game is currently launching */
  isLaunching: boolean;
  /** Whether the active game is favorited */
  isFavorite: boolean;
  /** Callback to change focus area */
  onSetFocusArea: (area: FocusArea) => void;
  /** Callback to open in-game menu */
  onSetInGameMenuOpen: (open: boolean) => void;
  /** Callback to launch the active game */
  onLaunchGame: () => void;
  /** Callback to remove a manual game */
  onRemoveGame: (id: string) => void;
  /** Callback to toggle favorite status */
  onToggleFavorite: (gameId: string) => void;
}

/**
 * HeroSection Component
 *
 * Large hero section showing the active game with:
 * - Game logo or title
 * - Source badge (Steam, Epic, Xbox, etc.)
 * - Play/Resume/Switch button
 * - Delete button (manual games only)
 *
 * @param props - Component props
 * @returns Hero section with game details and controls
 */
export const HeroSection = memo(function HeroSection({
  activeGame,
  activeRunningGame,
  focusArea,
  isLaunching,
  isFavorite,
  onSetFocusArea,
  onSetInGameMenuOpen,
  onLaunchGame,
  onRemoveGame,
  onToggleFavorite,
}: HeroSectionProps) {
  /**
   * Memoized asset source getter
   * Prevents function recreation on every render
   */
  const getAssetSrc = useCallback((path: string | null | undefined) => {
    return getCachedAssetSrc(path, defaultCover);
  }, []);

  /**
   * Memoized resume handler
   * Best practice: useCallback for async functions
   */
  const handleResume = useCallback(async () => {
    onSetInGameMenuOpen(false);
    await getCurrentWindow().hide();
  }, [onSetInGameMenuOpen]);

  /**
   * Memoized running game check
   * Prevents recalculation on every render
   */
  const isRunningCurrentGame = useMemo(
    () =>
      activeRunningGame &&
      activeGame?.id &&
      String(activeRunningGame.game.id) === String(activeGame.id),
    [activeRunningGame, activeGame?.id]
  );

  /**
   * Memoized background image
   * Only recalculates when activeGame changes
   */
  const backgroundImage = useMemo(
    () => getAssetSrc(activeGame?.hero_image ?? activeGame?.image),
    [activeGame?.hero_image, activeGame?.image, getAssetSrc]
  );

  return (
    <div
      className={`hero-section ${focusArea === 'HERO' ? 'hero-focused' : ''}`}
      onMouseEnter={() => onSetFocusArea('HERO')}
    >
      {/* Background Image */}
      <div className="hero-background">
        <img src={backgroundImage} alt="" className="hero-bg-image" loading="eager" />
        <div className="hero-gradient" />
      </div>

      {/* Content Overlay */}
      <div className="hero-content">
        {activeGame?.logo ? (
          <img src={getAssetSrc(activeGame.logo)} alt={activeGame.title} className="hero-logo" />
        ) : (
          <h1 className="hero-title">{activeGame?.title ?? 'Balam'}</h1>
        )}

        <div className="hero-meta">
          <Badge label={activeGame?.source ?? 'INSTALLED'} variant="default" />
          {activeGame ? (
            <button
              className={`btn-favorite ${isFavorite ? 'favorited' : ''}`}
              onClick={() => onToggleFavorite(activeGame.id)}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          ) : null}
        </div>

        <div className="hero-actions">
          {isRunningCurrentGame ? (
            <button
              className="btn-hero-play"
              data-focused={focusArea === 'HERO'}
              onClick={() => void handleResume()}
            >
              <RotateCcw size={24} />
              <span>RESUME</span>
            </button>
          ) : (
            <div className="hero-btns-row">
              <button
                className="btn-hero-play"
                data-focused={focusArea === 'HERO'}
                onClick={onLaunchGame}
              >
                <Play size={24} fill="currentColor" />
                <span>{isLaunching ? '...' : activeRunningGame ? 'SWITCH' : 'PLAY'}</span>
              </button>
              {activeGame?.source === 'Manual' && (
                <button className="btn-remove-manual" onClick={() => onRemoveGame(activeGame.id)}>
                  DELETE
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
