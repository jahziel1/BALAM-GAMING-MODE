import './PowerModal.css';

import { invoke } from '@tauri-apps/api/core';
import { LogOut, Power, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/core/Button/Button';
import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';
import { OverlayPanel } from '@/components/overlay/OverlayPanel/OverlayPanel';
import ButtonHint from '@/components/ui/ButtonHint/ButtonHint';

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

      setCountdown(5);

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

  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={handleCancel}
      title={selectedAction ? 'Confirmation' : 'Power Options'}
      width="500px"
      className="power-modal-centered"
      footer={
        !selectedAction ? (
          <div className="button-hints-footer">
            <ButtonHint action="BACK" type="KEYBOARD" label="Cancel" />
            <ButtonHint action="CONFIRM" type="KEYBOARD" label="Select" />
          </div>
        ) : undefined
      }
    >
      {!selectedAction ? (
        // Action selection
        <div className="power-modal-actions">
          <Button
            variant="danger"
            size="lg"
            icon={
              <IconWrapper size="lg">
                <Power />
              </IconWrapper>
            }
            onClick={() => setSelectedAction('shutdown')}
            fullWidth
          >
            Shutdown
          </Button>

          <Button
            variant="primary"
            size="lg"
            icon={
              <IconWrapper size="lg">
                <RotateCw />
              </IconWrapper>
            }
            onClick={() => setSelectedAction('restart')}
            fullWidth
          >
            Restart
          </Button>

          <Button
            variant="secondary"
            size="lg"
            icon={
              <IconWrapper size="lg">
                <LogOut />
              </IconWrapper>
            }
            onClick={() => setSelectedAction('logout')}
            fullWidth
          >
            Logout
          </Button>
        </div>
      ) : (
        // Confirmation countdown
        <>
          <p className="power-modal-message">
            {selectedAction === 'shutdown' && `Shutting down in ${countdown} seconds...`}
            {selectedAction === 'restart' && `Restarting in ${countdown} seconds...`}
            {selectedAction === 'logout' && `Logging out in ${countdown} seconds...`}
          </p>
          <div className="power-modal-countdown">{countdown}</div>
          <Button variant="secondary" size="md" onClick={handleCancel} disabled={isExecuting}>
            Cancel
          </Button>
        </>
      )}
    </OverlayPanel>
  );
};
