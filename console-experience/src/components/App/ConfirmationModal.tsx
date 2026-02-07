/**
 * @module components/App/ConfirmationModal
 */

import type { Game } from '../../domain/entities/game';

/**
 * Represents a running game with its process ID
 */
interface ActiveRunningGame {
  /** The game object */
  game: Game;
  /** Process ID of the running game */
  pid: number;
}

/**
 * Props for ConfirmationModal component
 */
interface ConfirmationModalProps {
  /** The game pending launch that triggered the modal */
  pendingGame: Game | null;
  /** Currently running game that will be closed */
  activeRunningGame: ActiveRunningGame | null;
  /** Callback when user confirms the game switch */
  onConfirm: () => void;
  /** Callback when user cancels the game switch */
  onCancel: () => void;
}

/**
 * ConfirmationModal Component
 *
 * Modal dialog that confirms game switching when another game is already running.
 * Warns the user that unsaved progress in the current game will be lost.
 *
 * @param props - Component props
 * @returns Modal dialog or null if no pending game
 *
 * @example
 * ```tsx
 * <ConfirmationModal
 *   pendingGame={gameToLaunch}
 *   activeRunningGame={currentlyRunning}
 *   onConfirm={handleConfirmSwitch}
 *   onCancel={handleCancelSwitch}
 * />
 * ```
 */
export function ConfirmationModal({
  pendingGame,
  activeRunningGame,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!pendingGame) return null;

  return (
    <div className="system-modal-backdrop">
      <div className="system-modal">
        <h2>Switch Game?</h2>
        <p>
          Launching <strong>{pendingGame.title}</strong> will close
          <br />
          <span style={{ color: '#ff4444' }}>{activeRunningGame?.game.title}</span>.
          <br />
          <br />
          Any unsaved progress will be lost.
        </p>
        <div className="modal-actions">
          <button className="btn-modal cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-modal confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
