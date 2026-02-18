import React from 'react';

interface SettingsToggleProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  checked,
  onChange,
  disabled,
  label,
}) => (
  <label className="settings-toggle">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={label ?? 'Toggle'}
    />
    <span className="settings-toggle-slider" />
  </label>
);
