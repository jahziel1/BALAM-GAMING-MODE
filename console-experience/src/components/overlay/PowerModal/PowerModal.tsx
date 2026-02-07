import './PowerModal.css';

import { invoke } from '@tauri-apps/api/core';
import { LogOut, Power, RotateCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface PowerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PowerAction = 'shutdown' | 'restart' | 'logout' | null;

export const PowerModal: React.FC<PowerModalProps> = ({ isOpen, onClose }) => {
  const [selectedAction, setSelectedAction] = useState<PowerAction>(null);
  const [countdown, setCountdown] = useState(5);
  const [isExecuting, setIsExecuting] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAction(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountdown(5);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsExecuting(false);
    }
  }, [isOpen]);

  const executeAction = useCallback(async () => {
    if (!selectedAction || isExecuting) return;

    setIsExecuting(true);
    try {
      switch (selectedAction) {
        case 'shutdown':
          await invoke('shutdown_pc');
          break;
        case 'restart':
          await invoke('restart_pc');
          break;
        case 'logout':
          await invoke('logout_pc');
          break;
      }
    } catch (error) {
      console.error('Power action failed:', error);
      onClose();
    }
  }, [selectedAction, isExecuting, onClose]);

  // Countdown timer
  useEffect(() => {
    if (selectedAction && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (selectedAction && countdown === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void executeAction();
    }
  }, [selectedAction, countdown, executeAction]);

  const handleCancel = () => {
    setSelectedAction(null);
    setCountdown(5);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="power-modal-backdrop" onClick={handleCancel}>
      <div className="power-modal" onClick={(e) => e.stopPropagation()}>
        <button className="power-modal-close" onClick={handleCancel}>
          <X size={20} />
        </button>

        {!selectedAction ? (
          // Action selection
          <>
            <h2 className="power-modal-title">Power Options</h2>
            <div className="power-modal-actions">
              <button
                className="power-action-button shutdown"
                onClick={() => setSelectedAction('shutdown')}
              >
                <Power size={32} />
                <span>Shutdown</span>
              </button>

              <button
                className="power-action-button restart"
                onClick={() => setSelectedAction('restart')}
              >
                <RotateCw size={32} />
                <span>Restart</span>
              </button>

              <button
                className="power-action-button logout"
                onClick={() => setSelectedAction('logout')}
              >
                <LogOut size={32} />
                <span>Logout</span>
              </button>
            </div>
          </>
        ) : (
          // Confirmation countdown
          <>
            <h2 className="power-modal-title">Confirmation</h2>
            <p className="power-modal-message">
              {selectedAction === 'shutdown' && `Shutting down in ${countdown} seconds...`}
              {selectedAction === 'restart' && `Restarting in ${countdown} seconds...`}
              {selectedAction === 'logout' && `Logging out in ${countdown} seconds...`}
            </p>
            <div className="power-modal-countdown">{countdown}</div>
            <button className="power-modal-cancel" onClick={handleCancel} disabled={isExecuting}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};
