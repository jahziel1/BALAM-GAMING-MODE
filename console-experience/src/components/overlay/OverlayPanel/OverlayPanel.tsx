import './OverlayPanel.css';

import { X } from 'lucide-react';
import React, { useEffect, useId, useRef } from 'react';

import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';
import { TooltipWrapper } from '@/components/ui/Tooltip';

interface OverlayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  side?: 'left' | 'right';
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  /** Enable blur on backdrop (default: true). Set to false for secondary panels. */
  enableBlur?: boolean;
  /** Enable background on wrapper (default: true). Set to false for secondary panels. */
  enableBackground?: boolean;
  /**
   * Custom Escape key handler. If provided, overrides the default onClose behavior.
   * Useful for panels that need to show unsaved-changes confirmation on Escape.
   */
  onEscape?: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

/**
 * Reusable overlay panel component.
 * Used by InGameMenu, QuickSettings, and other side panels.
 * Follows DRY principle - single source of truth for panel layout.
 *
 * Accessibility: implements ARIA dialog pattern (role="dialog", aria-modal,
 * focus trap, focus restoration, Escape key handler).
 */
export const OverlayPanel: React.FC<OverlayPanelProps> = ({
  isOpen,
  onClose,
  title,
  side = 'left',
  width = '450px',
  children,
  footer,
  header,
  className = '',
  enableBlur = true,
  enableBackground = true,
  onEscape,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save focus on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Move initial focus into panel on open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        panel.focus();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Escape key: call onEscape if provided, otherwise onClose
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        (onEscape ?? onClose)();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose, onEscape]);

  // Focus trap: keep Tab/Shift+Tab within the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
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

  // Early return AFTER all hooks (Rules of Hooks)
  if (!isOpen) return null;

  return (
    <div
      className={`overlay-panel-wrapper ${enableBackground ? 'with-background' : 'no-background'}`}
    >
      <div
        className={`overlay-panel-backdrop ${enableBlur ? 'with-blur' : 'no-blur'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className={`overlay-panel overlay-panel-${side} ${className}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={header ? undefined : titleId}
        aria-label={header ? title : undefined}
        tabIndex={-1}
      >
        <header className="overlay-panel-header">
          {header ?? (
            <>
              <h2 id={titleId}>{title}</h2>
              <TooltipWrapper content="Close (Esc)" placement="bottom">
                <button className="overlay-panel-close" onClick={onClose} aria-label="Close">
                  <IconWrapper size="md">
                    <X />
                  </IconWrapper>
                </button>
              </TooltipWrapper>
            </>
          )}
        </header>

        <div className="overlay-panel-content">{children}</div>

        {footer ? <footer className="overlay-panel-footer">{footer}</footer> : null}
      </div>
    </div>
  );
};
