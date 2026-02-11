import React from 'react';

import { SettingsButton, SettingsItem, SettingsSection } from '../shared';

interface LibraryTabProps {
  onScanNow: () => void;
  onAddFolder: () => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({ onScanNow, onAddFolder }) => {
  return (
    <SettingsSection title="Library Settings">
      <SettingsItem label="Game Scan" description="Scan for new games in your library">
        <SettingsButton onClick={onScanNow} variant="primary">
          Scan Now
        </SettingsButton>
      </SettingsItem>

      <SettingsItem label="Library Folders" description="Manage folders where games are stored">
        <SettingsButton onClick={onAddFolder}>Add Folder</SettingsButton>
      </SettingsItem>
    </SettingsSection>
  );
};
