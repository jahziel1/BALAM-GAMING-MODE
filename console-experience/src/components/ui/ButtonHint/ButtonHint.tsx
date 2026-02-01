import './ButtonHint.css';

import React, { memo } from 'react';

export type ButtonAction =
  | 'CONFIRM'
  | 'BACK'
  | 'MENU'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'DPAD_VERTICAL'
  | 'DPAD_HORIZONTAL';
export type ControllerType = 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';

interface ButtonHintProps {
  action: ButtonAction;
  type: ControllerType;
  label?: string;
}

const ButtonHint: React.FC<ButtonHintProps> = memo(({ action, type, label }) => {
  const getButtonLabel = () => {
    switch (type) {
      case 'XBOX':
        if (action === 'CONFIRM') return 'A';
        if (action === 'BACK') return 'B';
        if (action === 'MENU') return '≡';
        if (action === 'DPAD_VERTICAL') return 'D-Pad ↕';
        if (action === 'DPAD_HORIZONTAL') return 'D-Pad ↔';
        break;
      case 'PLAYSTATION':
        if (action === 'CONFIRM') return '✕'; // Cross
        if (action === 'BACK') return '○'; // Circle
        if (action === 'MENU') return 'Options';
        if (action === 'DPAD_VERTICAL') return 'D-Pad ↕';
        if (action === 'DPAD_HORIZONTAL') return 'D-Pad ↔';
        break;
      case 'SWITCH':
        if (action === 'CONFIRM') return 'A'; // Orientation is different but label is same
        if (action === 'BACK') return 'B';
        if (action === 'MENU') return '+';
        if (action === 'DPAD_VERTICAL') return 'D-Pad ↕';
        if (action === 'DPAD_HORIZONTAL') return 'D-Pad ↔';
        break;
      case 'KEYBOARD':
        if (action === 'CONFIRM') return 'Enter';
        if (action === 'BACK') return 'Esc';
        if (action === 'MENU') return 'Home';
        if (action === 'DPAD_VERTICAL') return '↑↓';
        if (action === 'DPAD_HORIZONTAL') return '←→';
        break;
    }

    // D-Pad / Arrows are usually generic
    if (action === 'UP') return '↑';
    if (action === 'DOWN') return '↓';
    if (action === 'LEFT') return '←';
    if (action === 'RIGHT') return '→';

    return '?';
  };

  const getButtonClass = () => {
    // D-Pad actions use generic-key style
    if (
      action === 'DPAD_VERTICAL' ||
      action === 'DPAD_HORIZONTAL' ||
      action === 'UP' ||
      action === 'DOWN' ||
      action === 'LEFT' ||
      action === 'RIGHT'
    ) {
      return 'generic-key dpad-key';
    }

    if (type === 'PLAYSTATION') {
      if (action === 'CONFIRM') return 'ps-cross';
      if (action === 'BACK') return 'ps-circle';
    }
    if (type === 'XBOX') {
      if (action === 'CONFIRM') return 'xbox-a';
      if (action === 'BACK') return 'xbox-b';
    }
    if (type === 'SWITCH') {
      if (action === 'CONFIRM') return 'switch-a';
      if (action === 'BACK') return 'switch-b';
    }
    return 'generic-key';
  };

  return (
    <div className="button-hint">
      <span className={`button-icon ${getButtonClass()}`}>{getButtonLabel()}</span>
      {label ? <span className="button-label">{label}</span> : null}
    </div>
  );
});

ButtonHint.displayName = 'ButtonHint';

export default ButtonHint;
