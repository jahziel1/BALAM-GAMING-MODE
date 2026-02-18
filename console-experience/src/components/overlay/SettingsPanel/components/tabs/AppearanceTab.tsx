import React from 'react';

import { SettingsItem, SettingsSection, SettingsSelect, SettingsToggle } from '../shared';

interface AppearanceTabProps {
  animationsEnabled: boolean;
  setAnimationsEnabled: (val: boolean) => void;
  blurEffects: boolean;
  setBlurEffects: (val: boolean) => void;
  cardSize: string;
  setCardSize: (val: string) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
  animationsEnabled,
  setAnimationsEnabled,
  blurEffects,
  setBlurEffects,
  cardSize,
  setCardSize,
}) => {
  const cardSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  return (
    <SettingsSection title="Appearance">
      <SettingsItem label="Animations" description="Enable smooth transitions">
        <SettingsToggle
          checked={animationsEnabled}
          onChange={(e) => setAnimationsEnabled(e.target.checked)}
          label="Animations"
        />
      </SettingsItem>

      <SettingsItem label="Blur Effects" description="Background blur on overlays">
        <SettingsToggle
          checked={blurEffects}
          onChange={(e) => setBlurEffects(e.target.checked)}
          label="Blur Effects"
        />
      </SettingsItem>

      <SettingsItem label="Card Size" description="Game card display size">
        <SettingsSelect
          value={cardSize}
          onChange={(e) => setCardSize(e.target.value)}
          options={cardSizeOptions}
          label="Card Size"
        />
      </SettingsItem>
    </SettingsSection>
  );
};
