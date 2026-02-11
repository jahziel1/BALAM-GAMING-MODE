import React from 'react';

import { SettingsItem, SettingsSection, SettingsSlider } from '../shared';

interface SystemTabProps {
  defaultTDP: number;
  setDefaultTDP: (val: number) => void;
  defaultRefreshRate: number;
  setDefaultRefreshRate: (val: number) => void;
}

export const SystemTab: React.FC<SystemTabProps> = ({
  defaultTDP,
  setDefaultTDP,
  defaultRefreshRate,
  setDefaultRefreshRate,
}) => {
  return (
    <SettingsSection title="System Settings">
      <SettingsItem label="Default TDP" description="Target TDP when launching games">
        <SettingsSlider
          value={defaultTDP}
          min={5}
          max={35}
          onChange={(e) => setDefaultTDP(parseInt(e.target.value, 10))}
          unit="W"
        />
      </SettingsItem>

      <SettingsItem label="Default Refresh Rate" description="Preferred display refresh rate">
        <SettingsSlider
          value={defaultRefreshRate}
          min={30}
          max={144}
          onChange={(e) => setDefaultRefreshRate(parseInt(e.target.value, 10))}
          unit="Hz"
        />
      </SettingsItem>
    </SettingsSection>
  );
};
