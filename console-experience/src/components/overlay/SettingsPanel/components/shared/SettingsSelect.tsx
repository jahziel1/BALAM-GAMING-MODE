import React from 'react';

interface SettingsSelectProps {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string | number; label: string }[];
  disabled?: boolean;
}

export const SettingsSelect: React.FC<SettingsSelectProps> = ({
  value,
  onChange,
  options,
  disabled,
}) => (
  <select className="settings-select" value={value} onChange={onChange} disabled={disabled}>
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);
