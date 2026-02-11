import React from 'react';

import { SettingsButton, SettingsItem, SettingsSection } from '../shared';

interface AboutTabProps {
  version: string;
  onCheckUpdates: () => void;
  onOpenQuickSettings?: () => void;
}

export const AboutTab: React.FC<AboutTabProps> = ({
  version,
  onCheckUpdates,
  onOpenQuickSettings,
}) => {
  return (
    <SettingsSection title="About Balam Console Experience">
      <SettingsItem label="Version" description={`Current version: ${version}`}>
        <SettingsButton onClick={onCheckUpdates} variant="primary">
          Check for Updates
        </SettingsButton>
      </SettingsItem>

      <SettingsItem label="Legacy Settings" description="Open the experimental quick settings menu">
        <SettingsButton
          onClick={
            onOpenQuickSettings ??
            (() => {
              // Empty handler - button disabled when no handler provided
            })
          }
        >
          Open Quick Settings
        </SettingsButton>
      </SettingsItem>

      <div style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.6 }}>
        <p>© 2026 Jahziel &ldquo;Balam&rdquo; Portillo. All rights reserved.</p>
        <p>Built with Tauri, React, and Rust for the ultimate handheld experience.</p>
      </div>
    </SettingsSection>
  );
};
