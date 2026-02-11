/* eslint-disable */
import { invoke } from '@tauri-apps/api/core';
import React, { useEffect, useState } from 'react';

import { SettingsItem, SettingsSection, SettingsToggle } from '../shared';
import { FpsServiceToggle } from './FpsServiceToggle';

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
    checkPipVisibility();
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
          <SettingsToggle checked={true} onChange={() => {}} />
        </SettingsItem>
      </SettingsSection>

      <SettingsSection title="Performance Overlay">
        <SettingsItem
          label="Show Performance Overlay"
          description="Display FPS, GPU, CPU, and RAM stats in a floating window (works in borderless/windowed mode)"
        >
          <SettingsToggle
            checked={pipVisible}
            onChange={() => handlePipToggle()}
            disabled={pipLoading}
          />
        </SettingsItem>

        {pipVisible ? (
          <SettingsItem
            label="ℹ️ Overlay Information"
            description="The overlay appears in the top-right corner. Only visible in borderless or windowed mode games. For fullscreen exclusive, switch game to borderless mode."
          >
            <div style={{ color: '#7FFF7F', fontSize: '14px' }}>Active</div>
          </SettingsItem>
        ) : null}
      </SettingsSection>

      <SettingsSection title="FPS Monitoring">
        <FpsServiceToggle />
      </SettingsSection>
    </>
  );
};
