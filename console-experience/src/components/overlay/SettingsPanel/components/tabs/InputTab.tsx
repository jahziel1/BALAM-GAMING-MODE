import React from 'react';

import { SettingsButton, SettingsItem, SettingsSection } from '../shared';

interface InputTabProps {
  onConfigureGamepad: () => void;
  onEditShortcuts: () => void;
}

export const InputTab: React.FC<InputTabProps> = ({ onConfigureGamepad, onEditShortcuts }) => {
  return (
    <SettingsSection title="Input & Controls">
      <SettingsItem
        label="Gamepad Settings"
        description="Calibrate and configure controller settings"
      >
        <SettingsButton onClick={onConfigureGamepad}>Configure Controller</SettingsButton>
      </SettingsItem>

      <SettingsItem label="Keyboard Shortcuts" description="Customize global keyboard shortcuts">
        <SettingsButton onClick={onEditShortcuts}>Edit Shortcuts</SettingsButton>
      </SettingsItem>
    </SettingsSection>
  );
};
