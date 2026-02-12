import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

import { useAppStore } from '../application/providers/StoreProvider';

/**
 * PiP Window Manager Hook
 *
 * Manages the lifecycle of the performance PiP window:
 * - Shows/hides window based on overlay level
 * - Sends configuration updates to PiP window
 * - Handles window positioning
 * - Only runs in main window (not in PiP window itself)
 */
export const usePipWindow = () => {
  const { performance } = useAppStore();
  const level = performance.config.level;
  const [isPipWindow] = useState<boolean>(() => {
    try {
      const currentWindow = getCurrentWindow();
      const windowLabel = currentWindow.label;
      return windowLabel === 'performance-pip';
    } catch (error) {
      console.error('Failed to get window label:', error);
      return false;
    }
  });

  useEffect(() => {
    // Don't manage PiP from within the PiP window itself
    if (isPipWindow) return;

    const managePipWindow = async () => {
      try {
        if (level > 0) {
          // Show PiP window
          await invoke('show_performance_pip');

          // Send configuration to PiP window
          await emit('pip-config-changed', { level });
        } else {
          // Hide PiP window
          await invoke('hide_performance_pip');
        }
      } catch (error) {
        console.error('Failed to manage PiP window:', error);
      }
    };

    void managePipWindow();
  }, [level, isPipWindow]);
};
