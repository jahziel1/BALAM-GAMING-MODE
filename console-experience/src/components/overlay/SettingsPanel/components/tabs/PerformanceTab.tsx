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
  const { performance, setPerformanceLevel, setPerformanceOpacity } = useAppStore();
  const overlayLevel = performance.config.level;
  const overlayOpacity = performance.config.opacity;
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
          />
        </SettingsItem>

        <SettingsItem label="Background Behavior" description="Continue running when game launches">
          <SettingsToggle
            checked={true}
            onChange={() => {
              // Not implemented yet
            }}
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

            <SettingsItem label="Opacity" description="Adjust overlay transparency">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '200px' }}
              >
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={overlayOpacity * 100}
                  onChange={(e) => setPerformanceOpacity(Number(e.target.value) / 100)}
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: '45px', textAlign: 'right' }}>
                  {Math.round(overlayOpacity * 100)}%
                </span>
              </div>
            </SettingsItem>

            <SettingsItem
              label="Preview"
              description="Visual preview of your overlay configuration"
            >
              <div style={{ width: '100%' }}>
                <OverlayPreview level={overlayLevel} opacity={overlayOpacity} />
              </div>
            </SettingsItem>

            <SettingsItem
              label="ℹ️ Overlay Information"
              description="The overlay appears in the top-right corner. Only visible in borderless or windowed mode games. For fullscreen exclusive, switch game to borderless mode."
            >
              <div style={{ color: '#7FFF7F', fontSize: '14px' }}>Active</div>
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
