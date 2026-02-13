/**
 * @module components/App/HeroSection
 *
 * Hero section displaying the active game with play/resume controls.
 * Steam Big Picture inspired design with full background image.
 */

import './HeroSection.css';

import { getCurrentWindow } from '@tauri-apps/api/window';
import { Play, RotateCcw, Star } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

import defaultCover from '../../assets/default_cover.png';
import type { Game } from '../../domain/entities/game';
import type { FocusArea } from '../../hooks/useNavigation';
import { getCachedAssetSrc } from '../../utils/image-cache';
import { Button } from '../core/Button/Button';
import { IconWrapper } from '../core/IconWrapper/IconWrapper';
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
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
   * Handle delete request - shows confirmation dialog
   */
  const handleDeleteRequest = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  /**
   * Handle confirmed delete
   */
  const handleDeleteConfirmed = useCallback(() => {
    if (activeGame) {
      onRemoveGame(activeGame.id);
      setShowDeleteConfirm(false);
    }
  }, [activeGame, onRemoveGame]);

  /**
   * Handle delete cancellation
   */
  const handleDeleteCancelled = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

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
            <Button
              variant="accent"
              size="lg"
              icon={
                <IconWrapper size="lg">
                  <RotateCcw />
                </IconWrapper>
              }
              data-focused={focusArea === 'HERO'}
              onClick={() => void handleResume()}
            >
              RESUME
            </Button>
          ) : (
            <div className="hero-btns-row">
              <Button
                variant="accent"
                size="lg"
                icon={
                  <IconWrapper size="lg">
                    <Play />
                  </IconWrapper>
                }
                data-focused={focusArea === 'HERO'}
                onClick={onLaunchGame}
              >
                {isLaunching ? '...' : activeRunningGame ? 'SWITCH' : 'PLAY'}
              </Button>
              {activeGame?.source === 'Manual' && (
                <Button variant="danger" size="md" onClick={handleDeleteRequest}>
                  DELETE
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && activeGame ? (
        <div className="delete-confirm-overlay" onClick={handleDeleteCancelled}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Game?</h3>
            <p>
              Are you sure you want to remove <strong>{activeGame.title}</strong> from your library?
            </p>
            <p className="delete-confirm-warning">This action cannot be undone.</p>
            <div className="delete-confirm-actions">
              <Button variant="secondary" size="md" onClick={handleDeleteCancelled} autoFocus>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={handleDeleteConfirmed}>
                Delete Game
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
