import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';

interface ServiceStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
}

interface UseFpsServiceManagerReturn {
  status: ServiceStatus | null;
  loading: boolean;
  error: string | null;
  install: () => Promise<void>;
  uninstall: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * FPS Service Manager Hook
 *
 * Manages FPS monitoring service lifecycle without polling.
 * Uses manual refresh after actions for optimal performance.
 */
export const useFpsServiceManager = (): UseFpsServiceManagerReturn => {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh service status
  const refresh = useCallback(async () => {
    try {
      setError(null);
      const installed = await invoke<boolean>('is_fps_service_installed');
      const running = await invoke<boolean>('is_fps_service_running');
      const version = await invoke<string | null>('get_fps_service_version');

      setStatus({ installed, running, version });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus(null);
    }
  }, []);

  // Load initial status on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Install service
  const install = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('install_fps_service');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  // Uninstall service
  const uninstall = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('uninstall_fps_service');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  // Start service
  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('start_fps_service');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  // Stop service
  const stop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('stop_fps_service');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return {
    status,
    loading,
    error,
    install,
    uninstall,
    start,
    stop,
    refresh,
  };
};
