import './OverlayPanel.css';

import React from 'react';

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
}

/**
 * Reusable overlay panel component.
 * Used by InGameMenu, QuickSettings, and other side panels.
 * Follows DRY principle - single source of truth for panel layout.
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
}) => {
  if (!isOpen) return null;

  return (
    <div className="overlay-panel-wrapper">
      <div className="overlay-panel-backdrop" onClick={onClose} />

      <div className={`overlay-panel overlay-panel-${side} ${className}`} style={{ width }}>
        <header className="overlay-panel-header">
          {header ?? (
            <>
              <h2>{title}</h2>
              <button className="overlay-panel-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </>
          )}
        </header>

        <div className="overlay-panel-content">{children}</div>

        {footer ? <footer className="overlay-panel-footer">{footer}</footer> : null}
      </div>
    </div>
  );
};
