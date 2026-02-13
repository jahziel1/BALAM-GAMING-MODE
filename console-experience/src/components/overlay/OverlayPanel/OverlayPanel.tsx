import './OverlayPanel.css';

import { X } from 'lucide-react';
import React from 'react';

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
  enableBlur = true,
  enableBackground = true,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`overlay-panel-wrapper ${enableBackground ? 'with-background' : 'no-background'}`}
    >
      <div
        className={`overlay-panel-backdrop ${enableBlur ? 'with-blur' : 'no-blur'}`}
        onClick={onClose}
      />

      <div className={`overlay-panel overlay-panel-${side} ${className}`} style={{ width }}>
        <header className="overlay-panel-header">
          {header ?? (
            <>
              <h2>{title}</h2>
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
