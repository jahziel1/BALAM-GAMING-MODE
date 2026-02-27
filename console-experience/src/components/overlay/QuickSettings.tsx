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

import { useHdrManager } from '@/hooks/useHdrManager';
import { useToast } from '@/hooks/useToast';

import { Button } from '../core/Button/Button';
import { IconWrapper } from '../core/IconWrapper/IconWrapper';
import { SectionHeader } from '../core/SectionHeader/SectionHeader';
import ButtonHint from '../ui/ButtonHint/ButtonHint';
import { RadixSlider } from '../ui/RadixSlider/RadixSlider';
import { OverlayPanel } from './OverlayPanel/OverlayPanel';

interface QuickSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  controllerType?: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';
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
 * Error message mapping for user-friendly feedback
 * Maps backend error types to readable messages with helpful hints
 */
const ERROR_MESSAGES: Record<string, { message: string; hint: string }> = {
  volume_failed: {
    message: 'Volume adjustment failed',
    hint: 'Check your audio drivers or restart the audio service',
  },
  brightness_failed: {
    message: 'Brightness adjustment failed',
    hint: 'Your device may not support brightness control or drivers are outdated',
  },
  refresh_rate_failed: {
    message: 'Refresh rate change failed',
    hint: 'Make sure your monitor supports this refresh rate',
  },
  tdp_failed: {
    message: 'TDP adjustment failed',
    hint: 'TDP control requires administrator privileges and compatible hardware',
  },
  audio_device_failed: {
    message: 'Audio device switch failed',
    hint: 'The device may be disconnected, disabled, or in use by another application',
  },
  audio_list_failed: {
    message: 'Failed to load audio devices',
    hint: 'Audio service may be stopped. Check Windows Audio service status',
  },
  default: {
    message: 'Operation failed',
    hint: 'An unexpected error occurred. Try restarting the application',
  },
};

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
  controllerType = 'KEYBOARD',
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

  // Toast notifications
  const { error: showErrorToast } = useToast();

  // HDR management
  const {
    getPrimaryDisplay,
    isHdrSupported,
    isHdrEnabled,
    toggleHdr,
    refresh: refreshDisplays,
  } = useHdrManager();

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
        const errorInfo = ERROR_MESSAGES.audio_list_failed;
        showErrorToast(errorInfo.message, errorInfo.hint);
      }
    } catch (error) {
      console.error('Failed to load Quick Settings values:', error);
      showErrorToast('Failed to load settings', 'Some settings may not be available');
    }
  }, [showErrorToast]);

  // Load initial values
  useEffect(() => {
    if (isOpen) {
      console.log('🎛️ Quick Settings opened, loading values...');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadCurrentValues();
    }
  }, [isOpen, loadCurrentValues]);

  // Refresh HDR display info when panel opens
  useEffect(() => {
    if (isOpen) void refreshDisplays();
  }, [isOpen, refreshDisplays]);

  // HDR toggle handler with error feedback
  const handleHdrToggle = useCallback(
    async (displayId: number, currentEnabled: boolean) => {
      try {
        await toggleHdr(displayId, !currentEnabled);
      } catch {
        showErrorToast('HDR toggle failed', 'Check if your display supports HDR');
      }
    },
    [toggleHdr, showErrorToast]
  );

  // Handlers
  const handleVolumeChange = useCallback(
    async (value: number) => {
      setVolume(value);
      try {
        await invoke('set_volume', { level: value });
      } catch (error) {
        console.error('Failed to set volume:', error);
        const errorInfo = ERROR_MESSAGES.volume_failed;
        showErrorToast(errorInfo.message, errorInfo.hint);
      }
    },
    [showErrorToast]
  );

  const handleBrightnessChange = useCallback(
    async (value: number) => {
      setBrightness(value);
      try {
        await invoke('set_brightness', { level: value });
      } catch (error) {
        console.error('Failed to set brightness:', error);
        const errorInfo = ERROR_MESSAGES.brightness_failed;
        showErrorToast(errorInfo.message, errorInfo.hint);
      }
    },
    [showErrorToast]
  );

  const handleRefreshRateChange = useCallback(
    async (value: number) => {
      setRefreshRate(value);
      try {
        await invoke('set_refresh_rate', { hz: value });
      } catch (error) {
        console.error('Failed to set refresh rate:', error);
        const errorInfo = ERROR_MESSAGES.refresh_rate_failed;
        showErrorToast(errorInfo.message, errorInfo.hint);
      }
    },
    [showErrorToast]
  );

  const handleTDPChange = useCallback(
    async (value: number) => {
      setTdp(value);
      try {
        await invoke('set_tdp', { watts: value });
      } catch (error) {
        console.error('Failed to set TDP:', error);
        const errorInfo = ERROR_MESSAGES.tdp_failed;
        showErrorToast(errorInfo.message, errorInfo.hint);
      }
    },
    [showErrorToast]
  );

  const handleAudioDeviceChange = useCallback(
    async (deviceId: string) => {
      try {
        await invoke('set_default_audio_device', { deviceId });
        // Reload devices to update default status
        const devices = await invoke<AudioDevice[]>('list_audio_devices');
        setAudioDevices(devices);
      } catch (error) {
        console.error('Failed to change audio device:', error);
        const errorInfo = ERROR_MESSAGES.audio_device_failed;
        showErrorToast(errorInfo.message, errorInfo.hint);
      }
    },
    [showErrorToast]
  );

  // Manual DOM focus navigation — moveFocusInOverlay() from useNavigation handles UP/DOWN.
  // Radix Slider's built-in keyboard handlers process LEFT/RIGHT Arrow keys to adjust values.

  if (!isOpen) return null;

  // Derived HDR state — computed after early-return so they're only evaluated when open
  const primaryDisplay = getPrimaryDisplay();
  const hdrSupported = primaryDisplay ? isHdrSupported(primaryDisplay.id) : false;
  const hdrEnabled = primaryDisplay ? isHdrEnabled(primaryDisplay.id) : false;

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
        {hdrSupported && primaryDisplay ? (
          <Button
            variant={hdrEnabled ? 'primary' : 'ghost'}
            size="lg"
            icon={
              <IconWrapper size="lg">
                <Monitor />
              </IconWrapper>
            }
            onClick={() => void handleHdrToggle(primaryDisplay.id, hdrEnabled)}
            aria-label={hdrEnabled ? 'Disable HDR' : 'Enable HDR'}
            fullWidth
          >
            HDR {hdrEnabled ? 'On' : 'Off'}
          </Button>
        ) : null}
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
        disabled={!supportsTDP}
      />
    </OverlayPanel>
  );
};
