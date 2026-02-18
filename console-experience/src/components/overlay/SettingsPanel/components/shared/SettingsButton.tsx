import './SettingsButton.css';

import React from 'react';

interface SettingsButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'normal' | 'primary' | 'danger';
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  onClick,
  children,
  variant = 'normal',
  disabled,
  style,
}) => {
  let className = 'settings-button';
  if (variant === 'primary') {
    className = 'settings-button-primary';
  } else if (variant === 'danger') {
    className = 'settings-button-danger';
  }

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
};
