/**
 * @module components/App/ConfirmationModal
 */

import { useId, useRef } from 'react';

import type { Game } from '../../domain/entities/game';
import { useModalFocus } from '../../hooks/useModalFocus';

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
 * Accessibility: implements ARIA dialog pattern (role="dialog", aria-modal,
 * focus trap, focus restoration, Escape key handler).
 *
 * @param props - Component props
 * @returns Modal dialog or null if no pending game
 */
export function ConfirmationModal({
  pendingGame,
  activeRunningGame,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = pendingGame !== null;

  useModalFocus(modalRef, isOpen, onCancel, { initialFocusSelector: '.btn-modal.confirm' });

  if (!pendingGame) return null;

  return (
    <div className="system-modal-backdrop">
      <div
        ref={modalRef}
        className="system-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId}>Switch Game?</h2>
        <p>
          Launching <strong>{pendingGame.title}</strong> will close
          <br />
          <span className="danger-text">{activeRunningGame?.game.title}</span>.
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
