/**
 * @module components/layout/Footer
 *
 * Footer component displaying controller/keyboard button hints.
 */

import './Footer.css';

import React, { memo } from 'react';

import ButtonHint from '../../ui/ButtonHint/ButtonHint';

/**
 * Props for Footer component
 */
interface FooterProps {
  /** Type of controller/input device for displaying appropriate button icons */
  controllerType: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';
}

/**
 * Footer Component
 *
 * Displays context-aware button hints at the bottom of the screen.
 * Shows appropriate icons for the active controller type.
 *
 * @param props - Component props
 * @returns Footer bar with button hints
 *
 * @example
 * ```tsx
 * <Footer controllerType="XBOX" />
 * ```
 */
const Footer: React.FC<FooterProps> = ({ controllerType }) => {
  return (
    <div className="footer-bar" data-testid="footer-prompts">
      <div className="prompts-container">
        <ButtonHint action="CONFIRM" type={controllerType} label="Select" />
        <ButtonHint action="BACK" type={controllerType} label="Back" />
        <ButtonHint action="MENU" type={controllerType} label="Menu" />
      </div>
    </div>
  );
};

export default memo(Footer);
