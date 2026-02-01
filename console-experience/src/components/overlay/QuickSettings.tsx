import './QuickSettings.css';

import { invoke } from '@tauri-apps/api/core';
import React, { useCallback, useEffect, useState } from 'react';

import ButtonHint from '../ui/ButtonHint/ButtonHint';
import { RadixSlider } from '../ui/RadixSlider/RadixSlider';
import { OverlayPanel } from './OverlayPanel/OverlayPanel';

interface QuickSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  focusedSliderIndex: number;
  onFocusChange: (index: number) => void;
  controllerType?: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';
  onRegisterAdjustHandler?: (handler: (direction: number) => void) => void;
}

interface TDPConfig {
  watts: number;
  min_watts: number;
  max_watts: number;
}

/**
 * Quick Settings overlay for adjusting system performance and display settings.
 * Fully controllable with gamepad (D-Pad navigation) and mouse.
 *
 * Architecture:
 * - Presentation layer: Renders sliders
 * - State management: React hooks for local state
 * - Data layer: Tauri commands to backend adapters
 */
export const QuickSettings: React.FC<QuickSettingsProps> = ({
  isOpen,
  onClose,
  focusedSliderIndex,
  onFocusChange,
  controllerType = 'KEYBOARD',
  onRegisterAdjustHandler,
}) => {
  // State
  const [volume, setVolume] = useState(50);
  const [brightness, setBrightness] = useState(50);
  const [refreshRate, setRefreshRate] = useState(60);
  const [tdp, setTdp] = useState(15);
  const [tdpConfig, setTdpConfig] = useState<TDPConfig>({ watts: 15, min_watts: 5, max_watts: 30 });
  const [supportedRates, setSupportedRates] = useState<number[]>([60]);

  // Feature support flags
  const [supportsBrightness, setSupportsBrightness] = useState(false);
  const [supportsTDP, setSupportsTDP] = useState(false);

  // Load current values function - declared before useEffect
  const loadCurrentValues = useCallback(async () => {
    try {
      // System status (volume)
      const status = await invoke<{ volume: number }>('get_system_status');
      setVolume(status.volume);

      // Brightness
      const brightnessSupport = await invoke<boolean>('supports_brightness_control');
      setSupportsBrightness(brightnessSupport);
      if (brightnessSupport) {
        const currentBrightness = await invoke<number | null>('get_brightness');
        if (currentBrightness !== null) {
          setBrightness(currentBrightness);
        }
      }

      // Refresh rate
      const currentRate = await invoke<number>('get_refresh_rate');
      setRefreshRate(currentRate);

      const rates = await invoke<number[]>('get_supported_refresh_rates');
      setSupportedRates(rates.length > 0 ? rates : [60]);

      // TDP
      const tdpSupport = await invoke<boolean>('supports_tdp_control');
      setSupportsTDP(tdpSupport);
      if (tdpSupport) {
        const config = await invoke<TDPConfig>('get_tdp_config');
        setTdpConfig(config);
        setTdp(config.watts);
      }
    } catch (error) {
      console.error('Failed to load Quick Settings values:', error);
    }
  }, []);

  // Load initial values
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadCurrentValues();
    }
  }, [isOpen, loadCurrentValues]);

  // Handlers
  const handleVolumeChange = useCallback(async (value: number) => {
    setVolume(value);
    try {
      await invoke('set_volume', { level: value });
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }, []);

  const handleBrightnessChange = useCallback(async (value: number) => {
    setBrightness(value);
    try {
      await invoke('set_brightness', { level: value });
    } catch (error) {
      console.error('Failed to set brightness:', error);
    }
  }, []);

  const handleRefreshRateChange = useCallback(async (value: number) => {
    setRefreshRate(value);
    try {
      await invoke('set_refresh_rate', { hz: value });
    } catch (error) {
      console.error('Failed to set refresh rate:', error);
    }
  }, []);

  const handleTDPChange = useCallback(async (value: number) => {
    setTdp(value);
    try {
      await invoke('set_tdp', { watts: value });
    } catch (error) {
      console.error('Failed to set TDP:', error);
    }
  }, []);

  // Adjust focused slider value with LEFT/RIGHT (gamepad D-Pad)
  // Moved before useEffect to fix react-hooks/immutability
  const handleRadixSliderAdjust = useCallback(
    (direction: number) => {
      // nearestRate must be computed inside since it depends on state
      const nearestRate = supportedRates.reduce((prev, curr) =>
        Math.abs(curr - refreshRate) < Math.abs(prev - refreshRate) ? curr : prev
      );

      switch (focusedSliderIndex) {
        case 0: // Volume
          {
            const newValue = Math.max(0, Math.min(100, volume + direction * 5));
            void handleVolumeChange(newValue);
          }
          break;
        case 1: // Brightness
          if (supportsBrightness) {
            const newValue = Math.max(0, Math.min(100, brightness + direction * 5));
            void handleBrightnessChange(newValue);
          }
          break;
        case 2: // Refresh Rate
          {
            const currentIndex = supportedRates.indexOf(nearestRate);
            const newIndex = Math.max(
              0,
              Math.min(supportedRates.length - 1, currentIndex + direction)
            );
            void handleRefreshRateChange(supportedRates[newIndex]);
          }
          break;
        case 3: // TDP
          if (supportsTDP) {
            const newValue = Math.max(
              tdpConfig.min_watts,
              Math.min(tdpConfig.max_watts, tdp + direction)
            );
            void handleTDPChange(newValue);
          }
          break;
      }
    },
    [
      focusedSliderIndex,
      volume,
      brightness,
      refreshRate,
      tdp,
      supportedRates,
      tdpConfig,
      supportsBrightness,
      supportsTDP,
      handleVolumeChange,
      handleBrightnessChange,
      handleRefreshRateChange,
      handleTDPChange,
    ]
  );

  // Register slider adjustment handler with parent
  useEffect(() => {
    if (onRegisterAdjustHandler) {
      onRegisterAdjustHandler(handleRadixSliderAdjust);
    }
  }, [onRegisterAdjustHandler, handleRadixSliderAdjust]);

  // Keyboard/Gamepad handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onFocusChange(Math.max(0, focusedSliderIndex - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onFocusChange(Math.min(3, focusedSliderIndex + 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleRadixSliderAdjust(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleRadixSliderAdjust(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedSliderIndex, onClose, onFocusChange, handleRadixSliderAdjust]);

  if (!isOpen) return null;

  // Get nearest supported refresh rate for slider
  const nearestRate = supportedRates.reduce((prev, curr) =>
    Math.abs(curr - refreshRate) < Math.abs(prev - refreshRate) ? curr : prev
  );

  const footer = (
    <div className="prompts-container">
      <ButtonHint action="BACK" type={controllerType} label="Close" />
      <ButtonHint action="DPAD_VERTICAL" type={controllerType} label="Navigate" />
      <ButtonHint action="DPAD_HORIZONTAL" type={controllerType} label="Adjust" />
    </div>
  );

  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Settings"
      side="right"
      footer={footer}
    >
      <RadixSlider
        label="Volume"
        value={volume}
        min={0}
        max={100}
        step={5}
        onChange={(value) => void handleVolumeChange(value)}
        icon="🔊"
        unit="%"
        isFocused={focusedSliderIndex === 0}
      />

      <RadixSlider
        label="Brightness"
        value={brightness}
        min={0}
        max={100}
        step={5}
        onChange={(value) => void handleBrightnessChange(value)}
        icon="☀️"
        unit="%"
        isFocused={focusedSliderIndex === 1}
        disabled={!supportsBrightness}
      />

      <RadixSlider
        label="Refresh Rate"
        value={nearestRate}
        min={Math.min(...supportedRates)}
        max={Math.max(...supportedRates)}
        step={1}
        onChange={(value) => void handleRefreshRateChange(value)}
        icon="🔄"
        unit="Hz"
        isFocused={focusedSliderIndex === 2}
      />

      <RadixSlider
        label="TDP"
        value={tdp}
        min={tdpConfig.min_watts}
        max={tdpConfig.max_watts}
        step={1}
        onChange={(value) => void handleTDPChange(value)}
        icon="⚡"
        unit="W"
        isFocused={focusedSliderIndex === 3}
        disabled={!supportsTDP}
      />
    </OverlayPanel>
  );
};
