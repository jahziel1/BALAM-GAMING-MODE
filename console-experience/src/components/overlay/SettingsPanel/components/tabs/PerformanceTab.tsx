import { invoke } from '@tauri-apps/api/core';
import React, { useEffect, useState } from 'react';

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
  const [pipVisible, setPipVisible] = useState(false);
  const [pipLoading, setPipLoading] = useState(false);
  const [overlayLevel, setOverlayLevel] = useState<0 | 1 | 2 | 3 | 4>(1);
  const [overlayOpacity, setOverlayOpacity] = useState(0.9);

  // Check PiP visibility on mount
  useEffect(() => {
    const checkPipVisibility = async () => {
      try {
        const visible = await invoke<boolean>('is_pip_visible');
        setPipVisible(visible);
      } catch (err) {
        console.error('Failed to check PiP visibility:', err);
      }
    };
    void checkPipVisibility();
  }, []);

  const handlePipToggle = async () => {
    setPipLoading(true);
    try {
      const newState = await invoke<boolean>('toggle_performance_pip');
      setPipVisible(newState);
    } catch (err) {
      console.error('Failed to toggle PiP:', err);
    } finally {
      setPipLoading(false);
    }
  };

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
            onChange={() => void handlePipToggle()}
            disabled={pipLoading}
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
                  onLevelChange={setOverlayLevel}
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
                  onChange={(e) => setOverlayOpacity(Number(e.target.value) / 100)}
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
