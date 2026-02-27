import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

interface GlobalShortcutsProps {
  onOpenSearch: () => void;
  onToggleWiFi: () => void;
  onToggleBluetooth: () => void;
  onVolumeChange: (newVolume: number) => void;
  onOpenKeyboardShortcuts?: () => void;
}

/**
 * Hook to manage global keyboard shortcuts and system events
 * - Ctrl+K / Ctrl+F: Open Search
 * - Ctrl+Shift+Q: Toggle Overlay (handled in backend)
 * - volume-changed: Update OSD
 * - toggle-wifi-panel: Toggle WiFi Panel
 * - toggle-bluetooth-panel: Toggle Bluetooth Panel
 */
export function useGlobalShortcuts({
  onOpenSearch,
  onToggleWiFi,
  onToggleBluetooth,
  onVolumeChange,
  onOpenKeyboardShortcuts,
}: GlobalShortcutsProps) {
  // Global keyboard shortcuts (Ctrl+K, Ctrl+F, F1, ?)
  useEffect(() => {
    const handleGlobalKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault();
          onOpenSearch();
        }
      }
      if ((e.key === 'F1' || e.key === '?') && onOpenKeyboardShortcuts) {
        e.preventDefault();
        onOpenKeyboardShortcuts();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyboard);
    return () => window.removeEventListener('keydown', handleGlobalKeyboard);
  }, [onOpenSearch, onOpenKeyboardShortcuts]);

  // Toggle Overlay (Global Shortcut)
  // REMOVED: toggle-overlay listener (obsolete)
  // Now handled by toggle_game_overlay() command from backend
  // which creates dedicated overlay window with TOPMOST style

  // Volume Change Listener
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<number>('volume-changed', (event) => {
        onVolumeChange(event.payload);
      });
      return unlisten;
    };
    const unlistenPromise = setupListener();
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onVolumeChange]);

  // WiFi Panel Toggle (Ctrl+W)
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen('toggle-wifi-panel', () => {
        onToggleWiFi();
      });
      return unlisten;
    };
    const unlistenPromise = setupListener();
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onToggleWiFi]);

  // Bluetooth Panel Toggle (Ctrl+B)
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen('toggle-bluetooth-panel', () => {
        onToggleBluetooth();
      });
      return unlisten;
    };
    const unlistenPromise = setupListener();
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onToggleBluetooth]);
}
