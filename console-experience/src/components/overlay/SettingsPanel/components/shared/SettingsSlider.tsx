import React from 'react';

interface SettingsSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
}

export const SettingsSlider: React.FC<SettingsSliderProps> = ({
  value,
  min,
  max,
  onChange,
  unit = '',
}) => (
  <div className="settings-slider-container">
    <input
      type="range"
      className="settings-slider"
      min={min}
      max={max}
      value={value}
      onChange={onChange}
    />
    <span className="settings-slider-value">
      {value}
      {unit}
    </span>
  </div>
);
