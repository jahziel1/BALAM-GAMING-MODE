import './BluetoothPanel.css';

import { invoke } from '@tauri-apps/api/core';
import { Bluetooth, BluetoothOff } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';

import ButtonHint from '../../ui/ButtonHint/ButtonHint';
import { Skeleton } from '../../ui/Skeleton/Skeleton';
import { OverlayPanel } from '../OverlayPanel/OverlayPanel';

interface BluetoothPanelProps {
  isOpen: boolean;
  onClose: () => void;
  controllerType?: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';
}

interface BluetoothDevice {
  name: string;
  address: string;
  signal_strength: number | null;
  device_type:
    | 'AudioVideo'
    | 'Computer'
    | 'Phone'
    | 'Peripheral'
    | 'Imaging'
    | 'Wearable'
    | 'Toy'
    | 'Health'
    | 'Unknown';
  pairing_state: 'Unpaired' | 'Paired' | 'PairingInProgress';
  is_connected: boolean;
  is_remembered: boolean;
}

/**
 * Bluetooth Panel - Device management overlay
 *
 * Follows established architecture:
 * - Uses OverlayPanel component
 * - Tauri commands for backend communication
 * - Gamepad/keyboard navigation
 * - Auto-scroll for selected items
 */
export const BluetoothPanel: React.FC<BluetoothPanelProps> = ({
  isOpen,
  onClose,
  controllerType = 'KEYBOARD',
}) => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const deviceRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Toast notifications
  const { success, error: showErrorToast, warning } = useToast();

  // Check Bluetooth availability
  const checkBluetoothStatus = useCallback(async () => {
    try {
      const available = await invoke<boolean>('is_bluetooth_available');
      setBluetoothEnabled(available);
      if (!available) {
        warning('Bluetooth unavailable', 'Your device may not have Bluetooth support');
      }
    } catch (error) {
      console.error('Failed to check Bluetooth status:', error);
      showErrorToast('Bluetooth check failed', 'Could not detect Bluetooth adapter');
      setBluetoothEnabled(false);
    }
  }, [warning, showErrorToast]);

  // Load devices
  const loadDevices = useCallback(async () => {
    try {
      setIsScanning(true);
      setErrorMessage(null);
      const devs = await invoke<BluetoothDevice[]>('scan_bluetooth_devices');
      setDevices(devs);
      // Reset selection if out of bounds
      setSelectedIndex((prevIndex) => {
        if (devs.length > 0 && prevIndex >= devs.length) {
          return 0;
        }
        return prevIndex;
      });
    } catch (error) {
      console.error('Failed to scan Bluetooth devices:', error);
      const errorMsg = 'Failed to scan Bluetooth devices';
      const hint = 'Make sure Bluetooth is enabled and in range';
      showErrorToast(errorMsg, hint);
      setErrorMessage(errorMsg);
    } finally {
      setIsScanning(false);
    }
  }, [showErrorToast]);

  // Load on open
  useEffect(() => {
    if (isOpen) {
      void checkBluetoothStatus();
      void loadDevices();
    }
  }, [isOpen, checkBluetoothStatus, loadDevices]);

  // Auto-scroll to selected device
  useEffect(() => {
    const selectedElement = deviceRefs.current[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Handle device action (pair/connect)
  const handleDeviceAction = useCallback(
    async (device: BluetoothDevice) => {
      setIsOperating(true);
      setErrorMessage(null);

      try {
        if (device.pairing_state === 'Unpaired') {
          // Pair the device
          await invoke('pair_bluetooth_device', {
            address: device.address,
            pin: '',
          });
          success('Device paired', `Successfully paired with ${device.name}`);
          await loadDevices();
        } else if (device.pairing_state === 'Paired') {
          if (device.is_connected) {
            // Disconnect
            await invoke('disconnect_bluetooth_device', {
              address: device.address,
            });
            success('Device disconnected', `Disconnected from ${device.name}`);
            await loadDevices();
          } else {
            // Connect
            await invoke('connect_bluetooth_device', {
              address: device.address,
            });
            success('Device connected', `Connected to ${device.name}`);
            await loadDevices();
          }
        }
      } catch (error) {
        console.error('Bluetooth operation failed:', error);

        let errorMsg = 'Operation failed';
        let hint = '';

        if (device.pairing_state === 'Unpaired') {
          errorMsg = `Failed to pair with ${device.name}`;
          hint = 'Make sure the device is in pairing mode and nearby';
        } else if (device.is_connected) {
          errorMsg = `Failed to disconnect from ${device.name}`;
          hint = 'Try turning the device off and on again';
        } else {
          errorMsg = `Failed to connect to ${device.name}`;
          hint = 'The device may be out of range or already connected to another device';
        }

        showErrorToast(errorMsg, hint);
        setErrorMessage(errorMsg);
      } finally {
        setIsOperating(false);
      }
    },
    [loadDevices, success, showErrorToast]
  );

  // Toggle Bluetooth on/off
  const toggleBluetooth = useCallback(async () => {
    try {
      setIsOperating(true);
      await invoke('set_bluetooth_enabled', { enabled: !bluetoothEnabled });
      await checkBluetoothStatus();
      if (!bluetoothEnabled) {
        await loadDevices();
      }
    } catch (error) {
      setErrorMessage(`Failed to toggle Bluetooth: ${String(error)}`);
    } finally {
      setIsOperating(false);
    }
  }, [bluetoothEnabled, checkBluetoothStatus, loadDevices]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          onClose();
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setSelectedIndex((prev) => {
            const maxIndex = devices.length - 1;
            return Math.min(maxIndex, prev + 1);
          });
          break;
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setSelectedIndex((currentIndex) => {
            if (devices[currentIndex]) {
              void handleDeviceAction(devices[currentIndex]);
            }
            return currentIndex;
          });
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          void loadDevices();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          void toggleBluetooth();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, devices, onClose, handleDeviceAction, loadDevices, toggleBluetooth]);

  const getDeviceIcon = (_type: BluetoothDevice['device_type']) => {
    // Return appropriate icon based on device type
    // TODO: Use different icons based on device type (AudioVideo, Computer, Phone, etc.)
    return <Bluetooth size={20} />;
  };

  const getActionLabel = (device: BluetoothDevice): string => {
    if (device.pairing_state === 'Unpaired') return 'Pair';
    if (device.is_connected) return 'Disconnect';
    return 'Connect';
  };

  const footer = (
    <div className="bluetooth-footer">
      <ButtonHint action="BACK" type={controllerType} label="Close" />
      <ButtonHint action="DPAD_VERTICAL" type={controllerType} label="Navigate" />
      <ButtonHint action="CONFIRM" type={controllerType} label="Action" />
      <span className="bluetooth-hint">R: Refresh | T: Toggle BT</span>
    </div>
  );

  const renderContent = () => {
    if (!bluetoothEnabled) {
      return (
        <div className="bluetooth-state">
          <BluetoothOff size={32} />
          <p>Bluetooth is disabled</p>
          <button onClick={() => void toggleBluetooth()} className="bluetooth-button">
            Enable Bluetooth
          </button>
        </div>
      );
    }

    if (isScanning) {
      return (
        <div className="bluetooth-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="60px" />
          ))}
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="bluetooth-state bluetooth-error">
          <BluetoothOff size={32} />
          <p>{errorMessage}</p>
          <button onClick={() => void loadDevices()} className="bluetooth-button">
            Retry Scan
          </button>
        </div>
      );
    }

    if (devices.length === 0) {
      return (
        <div className="bluetooth-state">
          <BluetoothOff size={32} />
          <p>No devices found</p>
          <button onClick={() => void loadDevices()} className="bluetooth-button">
            Scan Again
          </button>
        </div>
      );
    }

    return (
      <div className="bluetooth-devices">
        {devices.map((device, index) => (
          <div
            key={device.address}
            ref={(el) => {
              deviceRefs.current[index] = el;
            }}
            className={`bluetooth-device ${index === selectedIndex ? 'focused' : ''} ${device.is_connected ? 'connected' : ''} ${isOperating ? 'operating' : ''}`}
            onClick={() => {
              setSelectedIndex(index);
              void handleDeviceAction(device);
            }}
          >
            <div className="bluetooth-device-header">
              {getDeviceIcon(device.device_type)}
              <span className="bluetooth-device-name">{device.name || 'Unknown Device'}</span>
              {device.is_connected ? <span className="bluetooth-badge">Connected</span> : null}
              {device.pairing_state === 'Paired' && !device.is_connected ? (
                <span className="bluetooth-badge paired">Paired</span>
              ) : null}
            </div>
            <div className="bluetooth-device-meta">
              <span className="bluetooth-address">{device.address}</span>
              <span className="bluetooth-type">{device.device_type}</span>
              <span className="bluetooth-action">{getActionLabel(device)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Bluetooth Devices"
      side="left"
      width="500px"
      footer={footer}
    >
      {renderContent()}
    </OverlayPanel>
  );
};

BluetoothPanel.displayName = 'BluetoothPanel';

export default BluetoothPanel;
