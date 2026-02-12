import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';

export interface HdrCapabilities {
  supported: boolean;
  enabled: boolean;
  wide_color_enforced: boolean;
  force_disabled: boolean;
  bits_per_channel: number;
  max_luminance_nits: number;
  min_luminance_nits: number;
}

export interface DisplayInfo {
  id: number;
  name: string;
  is_primary: boolean;
  adapter_id: [number, number];
  hdr: HdrCapabilities | null;
}

export const useHdrManager = () => {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches all displays with HDR capabilities.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const displayList = await invoke<DisplayInfo[]>('get_displays');
      setDisplays(displayList);
    } catch (err) {
      console.error('Failed to get displays:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setDisplays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Gets the primary display.
   */
  const getPrimaryDisplay = useCallback(() => {
    return displays.find((d) => d.is_primary) ?? displays[0] ?? null;
  }, [displays]);

  /**
   * Toggles HDR on/off for a specific display.
   *
   * @param displayId - Display ID from DisplayInfo
   * @param enabled - Whether to enable or disable HDR
   */
  const toggleHdr = useCallback(
    async (displayId: number, enabled: boolean) => {
      setLoading(true);
      setError(null);
      try {
        await invoke('set_hdr_enabled', { displayId, enabled });
        // Refresh display info to get updated HDR status
        await refresh();
      } catch (err) {
        console.error('Failed to toggle HDR:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw err; // Re-throw to allow component to handle
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  /**
   * Checks if a display supports HDR.
   *
   * @param displayId - Display ID from DisplayInfo
   */
  const isHdrSupported = useCallback(
    (displayId: number) => {
      const display = displays.find((d) => d.id === displayId);
      return display?.hdr?.supported ?? false;
    },
    [displays]
  );

  /**
   * Checks if HDR is currently enabled on a display.
   *
   * @param displayId - Display ID from DisplayInfo
   */
  const isHdrEnabled = useCallback(
    (displayId: number) => {
      const display = displays.find((d) => d.id === displayId);
      return display?.hdr?.enabled ?? false;
    },
    [displays]
  );

  // Fetch displays on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    displays,
    loading,
    error,
    refresh,
    getPrimaryDisplay,
    toggleHdr,
    isHdrSupported,
    isHdrEnabled,
  };
};
