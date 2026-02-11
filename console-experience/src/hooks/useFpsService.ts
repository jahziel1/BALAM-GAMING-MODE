/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';

export interface ServiceStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  error: string | null;
}

export interface FpsServiceStatus {
  installed: boolean;
  running: boolean;
  available: boolean;
  current_fps: number | null;
}

export const useFpsService = () => {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresAdmin, setRequiresAdmin] = useState(false);

  // Check service status (robust version)
  const checkStatus = useCallback(async () => {
    try {
      const serviceStatus = await invoke<ServiceStatus>('get_fps_service_status');
      setStatus(serviceStatus);
      setError(null);
      setRequiresAdmin(false);
    } catch (err) {
      console.error('Failed to check FPS service status:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);

      // Check if error is due to admin privileges
      if (errorMessage.includes('Administrator') || errorMessage.includes('privileges')) {
        setRequiresAdmin(true);
      }
    }
  }, []);

  // Toggle service on/off (simple, robust)
  const toggle = useCallback(async (enabled: boolean) => {
    setLoading(true);
    setError(null);
    setRequiresAdmin(false);

    try {
      const newStatus = await invoke<ServiceStatus>('toggle_fps_service', { enabled });
      setStatus(newStatus);

      // If enabling and not running, might need admin
      if (enabled && !newStatus.running && newStatus.error) {
        setRequiresAdmin(true);
        throw new Error(newStatus.error || 'Failed to enable FPS monitoring');
      }
    } catch (err: any) {
      console.error('Failed to toggle FPS service:', err);
      const errorMessage = err?.toString() || 'Toggle failed';
      setError(errorMessage);

      // Check if error is due to admin privileges
      if (errorMessage.includes('Administrator') || errorMessage.includes('privileges')) {
        setRequiresAdmin(true);
      }

      throw err; // Re-throw to allow component to handle
    } finally {
      setLoading(false);
    }
  }, []);

  // Legacy methods (for backward compatibility)
  const install = async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('install_fps_service');
      await checkStatus();
    } catch (err: any) {
      console.error('Failed to install FPS service:', err);
      setError(err?.toString() || 'Installation failed');
    } finally {
      setLoading(false);
    }
  };

  const uninstall = async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('uninstall_fps_service');
      await checkStatus();
    } catch (err: any) {
      console.error('Failed to uninstall FPS service:', err);
      setError(err?.toString() || 'Uninstallation failed');
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('start_fps_service');
      await checkStatus();
    } catch (err: any) {
      console.error('Failed to start FPS service:', err);
      setError(err?.toString() || 'Start failed');
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('stop_fps_service');
      await checkStatus();
    } catch (err: any) {
      console.error('Failed to stop FPS service:', err);
      setError(err?.toString() || 'Stop failed');
    } finally {
      setLoading(false);
    }
  };

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    status,
    loading,
    error,
    requiresAdmin,
    toggle,
    install,
    uninstall,
    start,
    stop,
    refresh: checkStatus,
  };
};
