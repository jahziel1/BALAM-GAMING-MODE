import './TopBar.css';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Battery,
  BatteryCharging,
  Bell,
  Bluetooth,
  Gamepad2,
  Plug,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React, { memo, useEffect, useState } from 'react';

import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';

interface SystemStatus {
  battery_level: number | null;
  is_charging: boolean;
  network_name: string | null;
  volume: number;
  connection_type: 'WiFi' | 'Ethernet' | 'None';
}

interface TopBarProps {
  onVolumeChange?: (newVolume: number) => void;
  onOpenWiFiPanel?: () => void;
  onOpenBluetoothPanel?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  onVolumeChange,
  onOpenWiFiPanel,
  onOpenBluetoothPanel,
}) => {
  const [time, setTime] = useState(new Date());
  const [status, setStatus] = useState<SystemStatus | null>(null);

  // Clock Ticker (updates every minute to save CPU)
  useEffect(() => {
    // Calculate milliseconds until next minute
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    let interval: NodeJS.Timeout | null = null;

    // Wait until next minute, then update every 60 seconds
    const timeout = setTimeout(() => {
      setTime(new Date());
      interval = setInterval(() => setTime(new Date()), 60000);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  // System Status Poller (Lightweight, every 10 seconds)
  useEffect(() => {
    const updateStatus = async () => {
      try {
        const result = await invoke<SystemStatus>('get_system_status');
        setStatus(result);
      } catch (err) {
        console.error('Failed to get system status:', err);
      }
    };

    void updateStatus();
    const poller = setInterval(() => void updateStatus(), 10000);
    return () => clearInterval(poller);
  }, []);

  // Listen for background volume changes (Keyboard/System) for instant icon update
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<number>('volume-changed', (event) => {
        setStatus((prev) => (prev ? { ...prev, volume: event.payload } : null));
        // Also trigger OSD if changed externally
        onVolumeChange?.(event.payload);
      });
      return unlisten;
    };

    const unlistenPromise = setupListener();
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onVolumeChange]);

  const handleVolumeClick = async () => {
    const currentVol = status?.volume ?? 75;
    const nextVol = currentVol + 10 > 100 ? 0 : currentVol + 10;

    try {
      await invoke('set_volume', { level: nextVol });
      // The background monitor will emit 'volume-changed', which updates the state.
    } catch (err) {
      console.error('Failed to set volume:', err);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="top-bar" data-testid="top-bar">
      {/* Left: User Profile (Compact) */}
      <div className="user-section">
        <div className="avatar-small"></div>
        <span className="username">DIABLO</span>
        <span className="level-badge">LVL 42</span>
      </div>

      {/* Right: System Status & Clock */}
      <div className="system-status">
        <div className="status-icons">
          <span title="Gamepad Connected">
            <Gamepad2 size={20} className="icon active" />
          </span>

          {/* Volume Indicator */}
          <div
            className="status-item clickable"
            onClick={() => void handleVolumeClick()}
            title="Click to Change Volume"
          >
            <Volume2 size={20} className="icon active" />
            <span className="status-label">{status?.volume ?? '--'}%</span>
          </div>

          {/* Network Indicator - Clickable to open WiFi panel */}
          <div
            className="status-item clickable"
            onClick={() => onOpenWiFiPanel?.()}
            title="WiFi Settings (Ctrl+W)"
          >
            {status?.connection_type === 'WiFi' ? (
              <span title={status.network_name ?? 'WiFi'}>
                <IconWrapper size="md">
                  <Wifi className="icon active" />
                </IconWrapper>
              </span>
            ) : status?.connection_type === 'Ethernet' ? (
              <span className="icon active" title="Ethernet Connected">
                <IconWrapper size="md">
                  <Plug />
                </IconWrapper>
              </span>
            ) : (
              <span title="Disconnected">
                <IconWrapper size="md">
                  <WifiOff className="icon disabled" />
                </IconWrapper>
              </span>
            )}
          </div>

          {/* Bluetooth Indicator - Clickable to open Bluetooth panel */}
          <div
            className="status-item clickable"
            onClick={() => onOpenBluetoothPanel?.()}
            title="Bluetooth Settings (Ctrl+B)"
          >
            <Bluetooth size={20} className="icon active" />
          </div>

          {/* Battery Indicator */}
          {status?.battery_level !== null && status?.battery_level !== undefined && (
            <div className="status-item">
              {status.is_charging ? (
                <BatteryCharging size={20} className="icon charging" />
              ) : (
                <Battery
                  size={20}
                  className={`icon ${status.battery_level < 20 ? 'low' : 'active'}`}
                />
              )}
              <span className="status-label">{status.battery_level}%</span>
            </div>
          )}

          <div className="icon-with-badge" title="Notifications">
            <Bell size={20} className="icon" />
            {/* Notification badge - example with count */}
            {/* <span className="notification-badge">3</span> */}
          </div>
        </div>
        <div className="clock" data-testid="clock">
          {formatTime(time)} | {formatDate(time)}
        </div>
      </div>
    </div>
  );
};

export default memo(TopBar);
