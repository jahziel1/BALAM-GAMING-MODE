import './QuickSettings.css';

import { invoke } from '@tauri-apps/api/core';
import {
  Bluetooth,
  Cable,
  Headphones,
  Monitor,
  RotateCw,
  Speaker,
  Sun,
  Usb,
  Volume2,
  Wifi,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '../core/Button/Button';
import { IconWrapper } from '../core/IconWrapper/IconWrapper';
import { SectionHeader } from '../core/SectionHeader/SectionHeader';
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
  onOpenWiFiPanel?: () => void;
  onOpenBluetoothPanel?: () => void;
}

interface TDPConfig {
  watts: number;
  min_watts: number;
  max_watts: number;
}

type AudioDeviceType =
  | 'Speakers'
  | 'Headphones'
  | 'HDMI'
  | 'DisplayPort'
  | 'USB'
  | 'Bluetooth'
  | 'Virtual'
  | 'Generic';

interface AudioDevice {
  id: string;
  name: string;
  device_type: AudioDeviceType;
  is_default: boolean;
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
  onOpenWiFiPanel,
  onOpenBluetoothPanel,
}) => {
  // State
  const [volume, setVolume] = useState(50);
  const [brightness, setBrightness] = useState(50);
  const [refreshRate, setRefreshRate] = useState(60);
  const [tdp, setTdp] = useState(15);
  const [tdpConfig, setTdpConfig] = useState<TDPConfig>({ watts: 15, min_watts: 5, max_watts: 30 });
  const [supportedRates, setSupportedRates] = useState<number[]>([60]);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);

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

      // Audio Devices
      try {
        const devices = await invoke<AudioDevice[]>('list_audio_devices');
        console.log('🔊 Audio devices loaded:', devices);
        setAudioDevices(devices);
      } catch (audioError) {
        console.error('❌ Failed to load audio devices:', audioError);
        // Non-critical, continue without audio device switching
      }
    } catch (error) {
      console.error('Failed to load Quick Settings values:', error);
    }
  }, []);

  // Load initial values
  useEffect(() => {
    if (isOpen) {
      console.log('🎛️ Quick Settings opened, loading values...');
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

  const handleAudioDeviceChange = useCallback(async (deviceId: string) => {
    try {
      await invoke('set_default_audio_device', { deviceId });
      // Reload devices to update default status
      const devices = await invoke<AudioDevice[]>('list_audio_devices');
      setAudioDevices(devices);
    } catch (error) {
      console.error('Failed to change audio device:', error);
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

  console.log('🎛️ QuickSettings rendering with:', {
    volume,
    audioDevices: audioDevices.length,
    supportsBrightness,
    supportsTDP,
  });

  // Get nearest supported refresh rate for slider
  const nearestRate = supportedRates.reduce((prev, curr) =>
    Math.abs(curr - refreshRate) < Math.abs(prev - refreshRate) ? curr : prev
  );

  // Get icon for audio device type
  const getDeviceIcon = (deviceType: AudioDeviceType) => {
    switch (deviceType) {
      case 'Headphones':
        return <Headphones size={20} />;
      case 'HDMI':
        return <Cable size={20} />;
      case 'DisplayPort':
        return <Monitor size={20} />;
      case 'USB':
        return <Usb size={20} />;
      case 'Bluetooth':
        return <Bluetooth size={20} />;
      case 'Speakers':
      case 'Generic':
      default:
        return <Speaker size={20} />;
    }
  };

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
      enableBlur={false} // No blur - InGameMenu already has it
      enableBackground={false} // No background - InGameMenu already has it
    >
      {/* Quick Actions */}
      <div className="quick-actions">
        <Button
          variant="ghost"
          size="lg"
          icon={
            <IconWrapper size="lg">
              <Wifi />
            </IconWrapper>
          }
          onClick={onOpenWiFiPanel}
          aria-label="Open WiFi settings"
          title="WiFi Settings (Ctrl+W)"
          fullWidth
        >
          WiFi
        </Button>
        <Button
          variant="ghost"
          size="lg"
          icon={
            <IconWrapper size="lg">
              <Bluetooth />
            </IconWrapper>
          }
          onClick={onOpenBluetoothPanel}
          aria-label="Open Bluetooth settings"
          title="Bluetooth Settings (Ctrl+B)"
          fullWidth
        >
          Bluetooth
        </Button>
      </div>

      <RadixSlider
        label="Volume"
        value={volume}
        min={0}
        max={100}
        step={5}
        onChange={(value) => void handleVolumeChange(value)}
        icon={
          <IconWrapper size="lg">
            <Volume2 />
          </IconWrapper>
        }
        unit="%"
        isFocused={focusedSliderIndex === 0}
      />

      {/* Audio Output Devices */}
      {audioDevices.length > 0 && (
        <div className="audio-devices-section">
          <SectionHeader level={3}>Audio Output</SectionHeader>
          <div className="audio-devices-list">
            {audioDevices.map((device) => (
              <button
                key={device.id}
                className={`audio-device-item ${device.is_default ? 'default' : ''}`}
                onClick={() => void handleAudioDeviceChange(device.id)}
                title={device.name}
              >
                <span className="device-icon">{getDeviceIcon(device.device_type)}</span>
                <span className="device-name">{device.name}</span>
                {device.is_default ? <span className="default-badge">Default</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}

      <RadixSlider
        label="Brightness"
        value={brightness}
        min={0}
        max={100}
        step={5}
        onChange={(value) => void handleBrightnessChange(value)}
        icon={
          <IconWrapper size="lg">
            <Sun />
          </IconWrapper>
        }
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
        icon={
          <IconWrapper size="lg">
            <RotateCw />
          </IconWrapper>
        }
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
        icon={
          <IconWrapper size="lg">
            <Zap />
          </IconWrapper>
        }
        unit="W"
        isFocused={focusedSliderIndex === 3}
        disabled={!supportsTDP}
      />
    </OverlayPanel>
  );
};
