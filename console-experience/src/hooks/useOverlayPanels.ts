import { useEffect, useState } from 'react';

// Dev-mode E2E test globals
declare global {
  interface Window {
    __TOGGLE_WIFI__?: () => void;
    __TOGGLE_BLUETOOTH__?: () => void;
    __OPEN_EXPLORER__?: () => void;
    __CLOSE_EXPLORER__?: () => void;
    __OPEN_SETTINGS__?: () => void;
    __CLOSE_SETTINGS__?: () => void;
    __OPEN_POWER__?: () => void;
    __CLOSE_POWER__?: () => void;
  }
}

/**
 * Manages all local panel open/close state for the main window.
 * Also exposes dev-mode window globals for E2E tests.
 */
export function useOverlayPanels() {
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWiFiPanelOpen, setIsWiFiPanelOpen] = useState(false);
  const [isBluetoothPanelOpen, setIsBluetoothPanelOpen] = useState(false);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);

  // DEV globals for E2E tests
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__TOGGLE_WIFI__ = () => setIsWiFiPanelOpen((p) => !p);
    window.__TOGGLE_BLUETOOTH__ = () => setIsBluetoothPanelOpen((p) => !p);
    window.__OPEN_EXPLORER__ = () => setIsExplorerOpen(true);
    window.__CLOSE_EXPLORER__ = () => setIsExplorerOpen(false);
    window.__OPEN_SETTINGS__ = () => setIsSettingsOpen(true);
    window.__CLOSE_SETTINGS__ = () => setIsSettingsOpen(false);
    window.__OPEN_POWER__ = () => setIsPowerModalOpen(true);
    window.__CLOSE_POWER__ = () => setIsPowerModalOpen(false);
    return () => {
      delete window.__TOGGLE_WIFI__;
      delete window.__TOGGLE_BLUETOOTH__;
      delete window.__OPEN_EXPLORER__;
      delete window.__CLOSE_EXPLORER__;
      delete window.__OPEN_SETTINGS__;
      delete window.__CLOSE_SETTINGS__;
      delete window.__OPEN_POWER__;
      delete window.__CLOSE_POWER__;
    };
  }, []);

  return {
    isExplorerOpen,
    setIsExplorerOpen,
    isSearchOpen,
    setIsSearchOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isWiFiPanelOpen,
    setIsWiFiPanelOpen,
    isBluetoothPanelOpen,
    setIsBluetoothPanelOpen,
    isPowerModalOpen,
    setIsPowerModalOpen,
    isKeyboardShortcutsOpen,
    setIsKeyboardShortcutsOpen,
  };
}
