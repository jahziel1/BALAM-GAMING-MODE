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
  }

  // Danger variant uses inline styles to match existing logic if needed,
  // or a specific CSS class if we add it.
  // In the original code, it used inline styles for the "Uninstall" button.
  const dangerStyle: React.CSSProperties =
    variant === 'danger'
      ? {
          backgroundColor: 'rgba(255, 59, 48, 0.2)',
          color: '#ff3b30',
          border: '1px solid rgba(255, 59, 48, 0.3)',
          fontSize: '0.85rem',
          padding: '6px 12px',
        }
      : {};

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      style={{ ...dangerStyle, ...style }}
    >
      {children}
    </button>
  );
};
