import './WiFiPanel.css';

import { invoke } from '@tauri-apps/api/core';
import { Lock, Wifi, WifiOff } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import ButtonHint from '../../ui/ButtonHint/ButtonHint';
import { Skeleton } from '../../ui/Skeleton/Skeleton';
import { OverlayPanel } from '../OverlayPanel/OverlayPanel';

interface WiFiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  controllerType?: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';
}

interface WiFiNetwork {
  ssid: string;
  signal_strength: number;
  security: 'Open' | 'WEP' | 'WPA' | 'WPA2' | 'WPA3' | 'Unknown';
  is_connected: boolean;
}

/**
 * WiFi Panel - Network management overlay
 *
 * Follows established architecture:
 * - Uses OverlayPanel component
 * - Tauri commands for backend communication
 * - Gamepad/keyboard navigation
 */
export const WiFiPanel: React.FC<WiFiPanelProps> = ({
  isOpen,
  onClose,
  controllerType = 'KEYBOARD',
}) => {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const networkRefs = useRef<(HTMLDivElement | null)[]>([]);

  const loadNetworks = useCallback(async () => {
    try {
      setIsScanning(true);
      setErrorMessage(null);
      const nets = await invoke<WiFiNetwork[]>('scan_wifi_networks');
      setNetworks(nets);
      // Reset selection if out of bounds
      setSelectedIndex((current) => {
        if (nets.length > 0 && current >= nets.length) {
          return 0;
        }
        return current;
      });
    } catch (error) {
      console.error('Failed to scan WiFi:', error);
      setErrorMessage(String(error));
    } finally {
      setIsScanning(false);
    }
  }, []); // No dependencies - stable callback

  useEffect(() => {
    if (isOpen) {
      void loadNetworks();
    }
  }, [isOpen, loadNetworks]);

  // Auto-scroll to selected network for keyboard/gamepad navigation
  useEffect(() => {
    const selectedElement = networkRefs.current[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [selectedIndex]);

  const handleConnect = useCallback(
    async (network: WiFiNetwork) => {
      if (network.is_connected) return;

      if (network.security === 'Open') {
        try {
          setIsConnecting(true);
          setErrorMessage(null);
          await invoke('connect_wifi', { ssid: network.ssid, password: '' });
          await loadNetworks();
        } catch (error) {
          setErrorMessage(`Connection failed: ${String(error)}`);
        } finally {
          setIsConnecting(false);
        }
      } else {
        setErrorMessage(
          'Password input not yet implemented. Use Windows Settings for secured networks.'
        );
      }
    },
    [loadNetworks]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keys if WiFi panel is open
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
            // Get current networks length from state
            const maxIndex = networks.length - 1;
            return Math.min(maxIndex, prev + 1);
          });
          break;
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setSelectedIndex((currentIndex) => {
            // Use current index to get network
            if (networks[currentIndex]) {
              void handleConnect(networks[currentIndex]);
            }
            return currentIndex;
          });
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          void loadNetworks();
          break;
      }
    };

    // Use capture phase to intercept events BEFORE other handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, networks, onClose, handleConnect, loadNetworks]);

  const getSignalBars = (dbm: number): number => {
    if (dbm >= -50) return 4;
    if (dbm >= -60) return 3;
    if (dbm >= -70) return 2;
    if (dbm >= -80) return 1;
    return 0;
  };

  const getSignalColor = (dbm: number): string => {
    const bars = getSignalBars(dbm);
    if (bars >= 3) return 'var(--color-success)';
    if (bars >= 2) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const footer = (
    <div className="wifi-footer">
      <ButtonHint action="BACK" type={controllerType} label="Close" />
      <ButtonHint action="DPAD_VERTICAL" type={controllerType} label="Navigate" />
      <ButtonHint action="CONFIRM" type={controllerType} label="Connect" />
      <span className="wifi-hint">R: Refresh</span>
    </div>
  );

  const renderContent = () => {
    if (isScanning) {
      return (
        <div className="wifi-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="60px" />
          ))}
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="wifi-state wifi-error">
          <WifiOff size={32} />
          <p>{errorMessage}</p>
          <button onClick={() => void loadNetworks()} className="wifi-button">
            Retry Scan
          </button>
        </div>
      );
    }

    if (networks.length === 0) {
      return (
        <div className="wifi-state">
          <WifiOff size={32} />
          <p>No networks found</p>
          <button onClick={() => void loadNetworks()} className="wifi-button">
            Scan Again
          </button>
        </div>
      );
    }

    return (
      <div className="wifi-networks">
        {networks.map((network, index) => (
          <div
            key={network.ssid}
            ref={(el) => {
              networkRefs.current[index] = el;
            }}
            className={`wifi-network ${index === selectedIndex ? 'focused' : ''} ${network.is_connected ? 'connected' : ''} ${isConnecting ? 'connecting' : ''}`}
            onClick={() => {
              setSelectedIndex(index);
              void handleConnect(network);
            }}
          >
            <div className="wifi-network-header">
              <Wifi
                className="wifi-icon"
                size={20}
                style={{ color: getSignalColor(network.signal_strength) }}
              />
              <span className="wifi-ssid">{network.ssid}</span>
              {network.security !== 'Open' && <Lock className="wifi-lock" size={16} />}
              {network.is_connected ? <span className="wifi-badge">Connected</span> : null}
            </div>
            <div className="wifi-network-meta">
              <div className="wifi-signal">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`wifi-bar ${i < getSignalBars(network.signal_strength) ? 'active' : ''}`}
                    style={{
                      backgroundColor:
                        i < getSignalBars(network.signal_strength)
                          ? getSignalColor(network.signal_strength)
                          : 'var(--color-surface-secondary)',
                    }}
                  />
                ))}
              </div>
              <span className="wifi-security">{network.security}</span>
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
      title="WiFi Networks"
      side="left"
      width="500px"
      footer={footer}
    >
      {renderContent()}
    </OverlayPanel>
  );
};

WiFiPanel.displayName = 'WiFiPanel';

export default WiFiPanel;
