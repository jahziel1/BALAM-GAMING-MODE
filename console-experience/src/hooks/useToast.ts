/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { useCallback, useState } from 'react';

import { ToastType } from '../components/ui/Toast/Toast';

interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration?: number) => {
      const id = `toast-${++toastId}`;
      const newToast: ToastData = {
        id,
        type,
        title,
        message,
        duration: duration || 5000,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast('success', title, message, duration);
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast('error', title, message, duration);
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast('warning', title, message, duration);
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast('info', title, message, duration);
    },
    [showToast]
  );

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    success,
    error,
    warning,
    info,
    closeToast,
  };
};
