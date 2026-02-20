import './WiFiPanel.css';

import { invoke } from '@tauri-apps/api/core';
import { Lock, Wifi, WifiOff } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/hooks/useToast';

import ButtonHint from '../../ui/ButtonHint/ButtonHint';
import { Skeleton } from '../../ui/Skeleton/Skeleton';
import { OverlayPanel } from '../OverlayPanel/OverlayPanel';
import WiFiPasswordModal from './WiFiPasswordModal';

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

interface WiFiNetworkItemProps {
  network: WiFiNetwork;
  isConnecting: boolean;
  onConnect: (network: WiFiNetwork) => void;
}

const WiFiNetworkItem: React.FC<WiFiNetworkItemProps> = ({ network, isConnecting, onConnect }) => {
  return (
    <div
      className={`wifi-network ${network.is_connected ? 'connected' : ''} ${isConnecting ? 'connecting' : ''}`}
      role="option"
      tabIndex={0}
      aria-selected={network.is_connected}
      aria-label={`${network.ssid}${network.is_connected ? ', connected' : ''}${network.security !== 'Open' ? ', secured' : ', open'}`}
      onClick={() => onConnect(network)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onConnect(network);
        }
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
  );
};

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
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);

  // Toast notifications
  const { success, error: showErrorToast } = useToast();

  const loadNetworks = useCallback(async () => {
    try {
      setIsScanning(true);
      setErrorMessage(null);
      const nets = await invoke<WiFiNetwork[]>('scan_wifi_networks');
      setNetworks(nets);
    } catch {
      const errorMsg = 'Failed to scan WiFi networks';
      const hint = 'Make sure WiFi adapter is enabled and working';
      showErrorToast(errorMsg, hint);
      setErrorMessage(errorMsg);
    } finally {
      setIsScanning(false);
    }
  }, [showErrorToast]);

  useEffect(() => {
    if (isOpen) {
      void loadNetworks();
    }
  }, [isOpen, loadNetworks]);

  const handleConnect = useCallback(
    async (network: WiFiNetwork) => {
      if (network.is_connected) return;

      // Open networks can connect immediately
      if (network.security === 'Open') {
        try {
          setIsConnecting(true);
          setErrorMessage(null);
          await invoke('connect_wifi', { ssid: network.ssid, password: '' });
          success('Connected successfully', `Connected to ${network.ssid}`);
          await loadNetworks();
        } catch {
          const errorMsg = `Failed to connect to ${network.ssid}`;
          const hint = 'The network may be out of range or have connection issues';
          showErrorToast(errorMsg, hint);
          setErrorMessage(errorMsg);
        } finally {
          setIsConnecting(false);
        }
      } else {
        // Secured networks need password modal
        setSelectedNetwork(network);
        setPasswordModalOpen(true);
      }
    },
    [loadNetworks, success, showErrorToast]
  );

  const handleConnectWithPassword = useCallback(
    async (password: string, remember: boolean) => {
      if (!selectedNetwork) return;

      try {
        setIsConnecting(true);
        setErrorMessage(null);
        await invoke('connect_wifi', {
          ssid: selectedNetwork.ssid,
          password: password,
        });
        success('Connected successfully', `Connected to ${selectedNetwork.ssid}`);
        setPasswordModalOpen(false);
        await loadNetworks();
      } catch (error) {
        const errorMsg = `Failed to connect to ${selectedNetwork.ssid}`;
        let hint = 'Check your password and try again';

        const errorStr =
          error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        if (
          errorStr.includes('password') ||
          errorStr.includes('incorrect') ||
          errorStr.includes('invalid')
        ) {
          hint = 'Incorrect password. Check your router settings for the correct password';
        } else if (errorStr.includes('timeout')) {
          hint = 'Connection timed out. The network may be out of range';
        } else if (errorStr.includes('not found')) {
          hint = 'Network not found. It may have moved out of range';
        }

        showErrorToast(errorMsg, hint);
        setErrorMessage(errorMsg);
      } finally {
        setIsConnecting(false);
      }

      // TODO: Implement "remember network" functionality
      if (remember) {
        console.log('Remember network feature not yet implemented');
      }
    },
    [selectedNetwork, success, showErrorToast, loadNetworks]
  );

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
      <div className="wifi-networks" role="listbox" aria-label="Available networks">
        {networks.map((network) => (
          <WiFiNetworkItem
            key={network.ssid}
            network={network}
            isConnecting={isConnecting}
            onConnect={(network) => void handleConnect(network)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
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

      {/* Password Modal for Secured Networks */}
      <WiFiPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onConnect={(password, remember) => void handleConnectWithPassword(password, remember)}
        ssid={selectedNetwork?.ssid ?? ''}
        securityType={selectedNetwork?.security ?? 'WPA2'}
        isConnecting={isConnecting}
      />
    </>
  );
};

WiFiPanel.displayName = 'WiFiPanel';

export default WiFiPanel;
