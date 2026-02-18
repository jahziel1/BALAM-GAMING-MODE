import React from 'react';

interface SettingsSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
  /** Accessible label for screen readers. Falls back to group label from SettingsItem. */
  label?: string;
  /** Step increment for keyboard navigation (default: 1). */
  step?: number;
  disabled?: boolean;
}

export const SettingsSlider: React.FC<SettingsSliderProps> = ({
  value,
  min,
  max,
  onChange,
  unit = '',
  label,
  step = 1,
  disabled,
}) => (
  <div className="settings-slider-container">
    <input
      type="range"
      className="settings-slider"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={unit ? `${value}${unit}` : undefined}
    />
    <span className="settings-slider-value" aria-hidden="true">
      {value}
      {unit}
    </span>
  </div>
);
