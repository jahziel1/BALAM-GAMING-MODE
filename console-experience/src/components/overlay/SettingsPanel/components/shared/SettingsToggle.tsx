import React from 'react';

interface SettingsToggleProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({ checked, onChange, disabled }) => (
  <label className="settings-toggle">
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
    <span className="settings-toggle-slider" />
  </label>
);
