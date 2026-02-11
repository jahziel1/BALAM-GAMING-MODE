import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect } from 'react';

interface GlobalShortcutsProps {
  onOpenSearch: () => void;
  onOpenLeftSidebar: () => void;
  onToggleWiFi: () => void;
  onToggleBluetooth: () => void;
  onVolumeChange: (newVolume: number) => void;
}

/**
 * Hook to manage global keyboard shortcuts and system events
 * - Ctrl+K / Ctrl+F: Open Search
 * - toggle-overlay: Open Left Sidebar
 * - volume-changed: Update OSD
 * - toggle-wifi-panel: Toggle WiFi Panel
 * - toggle-bluetooth-panel: Toggle Bluetooth Panel
 */
export function useGlobalShortcuts({
  onOpenSearch,
  onOpenLeftSidebar,
  onToggleWiFi,
  onToggleBluetooth,
  onVolumeChange,
}: GlobalShortcutsProps) {
  // Global keyboard shortcuts (Ctrl+K, Ctrl+F)
  useEffect(() => {
    const handleGlobalKeyboard = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
      // Ctrl+F or Cmd+F (Mac) - only if not in an input
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault();
          onOpenSearch();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyboard);
    return () => window.removeEventListener('keydown', handleGlobalKeyboard);
  }, [onOpenSearch]);

  // Toggle Overlay (Global Shortcut)
  useEffect(() => {
    const unlisten = listen('toggle-overlay', () => {
      void (async () => {
        const win = getCurrentWindow();
        if (await win.isVisible()) {
          await win.setFocus();
          onOpenLeftSidebar();
        } else {
          await win.show();
          await win.setFocus();
          onOpenLeftSidebar();
        }
      })();
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [onOpenLeftSidebar]);

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
