/**
 * @module components/App/ConfirmationModal
 */

import { useEffect, useId, useRef } from 'react';

import type { Game } from '../../domain/entities/game';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

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
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isOpen = pendingGame !== null;

  // Save focus on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Auto-focus confirm button on open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = modal.querySelector<HTMLElement>('.btn-modal.confirm');
      if (focusable) {
        focusable.focus();
      } else {
        const first = modal.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        first?.focus();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onCancel]);

  // Focus trap: keep Tab/Shift+Tab within the modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = [...modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen]);

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
