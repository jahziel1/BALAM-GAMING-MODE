import './Toast.css';

import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match CSS animation duration
  }, [id, onClose]);

  useEffect(() => {
    // Progress bar animation
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 16); // 60fps

    // Auto-close timer
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, handleClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="toast-icon toast-icon-success" size={20} />;
      case 'error':
        return <XCircle className="toast-icon toast-icon-error" size={20} />;
      case 'warning':
        return <AlertCircle className="toast-icon toast-icon-warning" size={20} />;
      case 'info':
        return <Info className="toast-icon toast-icon-info" size={20} />;
    }
  };

  return (
    <div className={`toast toast-${type} ${isExiting ? 'toast-exit' : ''}`}>
      <div className="toast-content">
        {getIcon()}
        <div className="toast-text">
          <div className="toast-title">{title}</div>
          {message ? <div className="toast-message">{message}</div> : null}
        </div>
        <button className="toast-close" onClick={handleClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className="toast-progress">
        <div className="toast-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};
