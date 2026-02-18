import React from 'react';

import { SettingsItem, SettingsSection, SettingsSelect, SettingsToggle } from '../shared';

interface GeneralTabProps {
  language: string;
  setLanguage: (lang: string) => void;
  startWithWindows: boolean;
  setStartWithWindows: (val: boolean) => void;
  startMinimized: boolean;
  setStartMinimized: (val: boolean) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  language,
  setLanguage,
  startWithWindows,
  setStartWithWindows,
  startMinimized,
  setStartMinimized,
}) => {
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'ja', label: '日本語' },
  ];

  return (
    <SettingsSection title="General Settings">
      <SettingsItem label="Language" description="Interface language">
        <SettingsSelect
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          options={languageOptions}
          label="Language"
        />
      </SettingsItem>

      <SettingsItem
        label="Start with Windows"
        description="Launch Balam automatically when Windows starts"
      >
        <SettingsToggle
          checked={startWithWindows}
          onChange={(e) => setStartWithWindows(e.target.checked)}
          label="Start with Windows"
        />
      </SettingsItem>

      <SettingsItem label="Start Minimized" description="Start in system tray">
        <SettingsToggle
          checked={startMinimized}
          onChange={(e) => setStartMinimized(e.target.checked)}
          label="Start Minimized"
        />
      </SettingsItem>
    </SettingsSection>
  );
};
