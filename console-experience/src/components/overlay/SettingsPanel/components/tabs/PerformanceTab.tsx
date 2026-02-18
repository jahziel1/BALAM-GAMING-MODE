import './PerformanceTab.css';

import React from 'react';

import { useAppStore } from '../../../../../application/providers/StoreProvider';
import { OverlayLevelSelector } from '../OverlayLevelSelector';
import { OverlayPreview } from '../OverlayPreview';
import { ServiceStatusCard } from '../ServiceStatusCard';
import { SettingsItem, SettingsSection, SettingsToggle } from '../shared';

interface PerformanceTabProps {
  // General Performance
  hardwareAcceleration: boolean;
  setHardwareAcceleration: (val: boolean) => void;
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({
  hardwareAcceleration,
  setHardwareAcceleration,
}) => {
  const { performance, setPerformanceLevel } = useAppStore();
  const overlayLevel = performance.config.level;
  const pipVisible = overlayLevel > 0;

  return (
    <>
      <SettingsSection title="Performance">
        <SettingsItem
          label="Hardware Acceleration"
          description="Use GPU for rendering (recommended)"
        >
          <SettingsToggle
            checked={hardwareAcceleration}
            onChange={(e) => setHardwareAcceleration(e.target.checked)}
            label="Hardware Acceleration"
          />
        </SettingsItem>
      </SettingsSection>

      <SettingsSection title="Performance Overlay">
        <SettingsItem
          label="Show Performance Overlay"
          description="Display FPS, GPU, CPU, and RAM stats in a floating window (works in borderless/windowed mode)"
        >
          <SettingsToggle
            checked={pipVisible}
            onChange={(e) => setPerformanceLevel(e.target.checked ? 1 : 0)}
            label="Show Performance Overlay"
          />
        </SettingsItem>

        {pipVisible ? (
          <>
            <SettingsItem
              label="Detail Level"
              description="Choose how much information to display (Steam Deck style)"
            >
              <div style={{ width: '100%' }}>
                <OverlayLevelSelector
                  selectedLevel={overlayLevel}
                  onLevelChange={setPerformanceLevel}
                />
              </div>
            </SettingsItem>

            <SettingsItem
              label="Preview"
              description="Visual preview of your overlay configuration"
            >
              <div style={{ width: '100%' }}>
                <OverlayPreview level={overlayLevel} opacity={1} />
              </div>
            </SettingsItem>

            <SettingsItem
              label="ℹ️ Overlay Information"
              description="The overlay appears in the top-right corner. Only visible in borderless or windowed mode games. For fullscreen exclusive, switch game to borderless mode."
            >
              <div className="status-active">Active</div>
            </SettingsItem>
          </>
        ) : null}
      </SettingsSection>

      <SettingsSection title="FPS Monitoring Service">
        <ServiceStatusCard />
      </SettingsSection>
    </>
  );
};
