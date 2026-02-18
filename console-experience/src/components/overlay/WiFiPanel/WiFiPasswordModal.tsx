import './WiFiPasswordModal.css';

import { Eye, EyeOff, Lock, Settings, Wifi } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/core/Button/Button';
import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';
import { SectionHeader } from '@/components/core/SectionHeader/SectionHeader';
import { TooltipWrapper } from '@/components/ui/Tooltip';
import { useModalFocus } from '@/hooks/useModalFocus';

import { type AdvancedWiFiConfig, AdvancedWiFiSettings } from './AdvancedWiFiSettings';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedWiFiConfig | null>(null);

  useModalFocus(containerRef, isOpen, onClose);

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

  // Handle Enter key to submit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, handleSubmit]);

  if (!isOpen) return null;

  return (
    <div className="wifi-password-modal-overlay" onClick={onClose}>
      <div
        ref={containerRef}
        className="wifi-password-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Connect to WiFi Network"
        tabIndex={-1}
      >
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
            <TooltipWrapper
              content={showPassword ? 'Hide password' : 'Show password'}
              placement="top"
            >
              <button
                type="button"
                className="wifi-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isConnecting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <IconWrapper size="sm">{showPassword ? <EyeOff /> : <Eye />}</IconWrapper>
              </button>
            </TooltipWrapper>
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

        {/* Advanced Settings Button */}
        <button
          className="wifi-password-advanced"
          onClick={() => setAdvancedSettingsOpen(true)}
          disabled={isConnecting}
          type="button"
        >
          <IconWrapper size="sm">
            <Settings />
          </IconWrapper>
          <span>Advanced network settings...</span>
        </button>

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

      {/* Advanced Settings Modal */}
      <AdvancedWiFiSettings
        isOpen={advancedSettingsOpen}
        onClose={() => setAdvancedSettingsOpen(false)}
        onSave={(config) => setAdvancedConfig(config)}
        initialConfig={advancedConfig ?? undefined}
      />
    </div>
  );
};

WiFiPasswordModal.displayName = 'WiFiPasswordModal';

export default WiFiPasswordModal;
