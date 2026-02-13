import './WiFiPasswordModal.css';

import { Eye, EyeOff, Lock, Wifi } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/core/Button/Button';
import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';
import { SectionHeader } from '@/components/core/SectionHeader/SectionHeader';

interface WiFiPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (password: string, remember: boolean) => void;
  ssid: string;
  securityType: string;
  isConnecting?: boolean;
}

/**
 * WiFi Password Modal - Password input for secured networks
 *
 * Features:
 * - Password input with show/hide toggle
 * - Remember network checkbox
 * - Min 8 characters validation
 * - Keyboard navigation (Enter to submit, Escape to cancel)
 * - Gamepad support
 *
 * @example
 * ```tsx
 * <WiFiPasswordModal
 *   isOpen={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   onConnect={(password, remember) => handleConnect(password, remember)}
 *   ssid="MyNetwork"
 *   securityType="WPA2"
 * />
 * ```
 */
export const WiFiPasswordModal: React.FC<WiFiPasswordModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  ssid,
  securityType,
  isConnecting = false,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Reset form state when modal opens
    const resetForm = () => {
      setPassword('');
      setShowPassword(false);
      setRemember(false);
      setValidationError(null);
    };

    resetForm();
  }, [isOpen]);

  // Validate password
  const validatePassword = useCallback((pwd: string): boolean => {
    if (pwd.length === 0) {
      setValidationError('Password is required');
      return false;
    }

    if (pwd.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return false;
    }

    setValidationError(null);
    return true;
  }, []);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!validatePassword(password)) {
      return;
    }

    onConnect(password, remember);
  }, [password, remember, onConnect, validatePassword]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose, handleSubmit]);

  if (!isOpen) return null;

  return (
    <div className="wifi-password-modal-overlay" onClick={onClose}>
      <div className="wifi-password-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wifi-password-modal-header">
          <div className="wifi-password-modal-icon">
            <IconWrapper size="lg">
              <Wifi />
            </IconWrapper>
          </div>
          <div className="wifi-password-modal-info">
            <SectionHeader level={3}>Connect to Network</SectionHeader>
            <p className="wifi-password-modal-ssid">{ssid}</p>
            <div className="wifi-password-modal-security">
              <Lock size={14} />
              <span>{securityType}</span>
            </div>
          </div>
        </div>

        {/* Password Input */}
        <div className="wifi-password-input-group">
          <label htmlFor="wifi-password" className="wifi-password-label">
            Password
          </label>
          <div className="wifi-password-input-wrapper">
            <input
              id="wifi-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setValidationError(null);
              }}
              placeholder="Enter network password"
              autoFocus
              disabled={isConnecting}
              className={validationError ? 'error' : ''}
            />
            <button
              type="button"
              className="wifi-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isConnecting}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <IconWrapper size="sm">{showPassword ? <EyeOff /> : <Eye />}</IconWrapper>
            </button>
          </div>
          {validationError ? <p className="wifi-password-error">{validationError}</p> : null}
        </div>

        {/* Remember Network Checkbox */}
        <label className="wifi-password-remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={isConnecting}
          />
          <span>Remember this network</span>
        </label>

        {/* Actions */}
        <div className="wifi-password-actions">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isConnecting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!password || isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        </div>

        {/* Hint */}
        <p className="wifi-password-hint">
          Passwords are typically 8-63 characters. Check your router settings if you don&apos;t know
          the password.
        </p>
      </div>
    </div>
  );
};

WiFiPasswordModal.displayName = 'WiFiPasswordModal';

export default WiFiPasswordModal;
