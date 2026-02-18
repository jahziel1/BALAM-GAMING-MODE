/**
 * @module components/overlay/WiFiPanel/AdvancedWiFiSettings
 *
 * Advanced WiFi configuration modal.
 * Allows configuration of static IP, custom DNS, and proxy settings.
 */

import './AdvancedWiFiSettings.css';

import { Globe, Network, Server, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { Button } from '@/components/core/Button/Button';
import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';
import { SectionHeader } from '@/components/core/SectionHeader/SectionHeader';
import { useModalFocus } from '@/hooks/useModalFocus';

export interface AdvancedWiFiConfig {
  /** Use DHCP (true) or static IP (false) */
  useDHCP: boolean;
  /** Static IP address (if useDHCP is false) */
  staticIP: string;
  /** Subnet mask (if useDHCP is false) */
  subnetMask: string;
  /** Default gateway (if useDHCP is false) */
  gateway: string;
  /** Use custom DNS (false = automatic) */
  useCustomDNS: boolean;
  /** Primary DNS server */
  primaryDNS: string;
  /** Secondary DNS server (optional) */
  secondaryDNS: string;
  /** Use proxy (false = no proxy) */
  useProxy: boolean;
  /** Proxy type */
  proxyType: 'HTTP' | 'SOCKS5';
  /** Proxy server address */
  proxyServer: string;
  /** Proxy port */
  proxyPort: string;
}

interface AdvancedWiFiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AdvancedWiFiConfig) => void;
  initialConfig?: Partial<AdvancedWiFiConfig>;
}

const DEFAULT_CONFIG: AdvancedWiFiConfig = {
  useDHCP: true,
  staticIP: '',
  subnetMask: '255.255.255.0',
  gateway: '',
  useCustomDNS: false,
  primaryDNS: '1.1.1.1',
  secondaryDNS: '1.0.0.1',
  useProxy: false,
  proxyType: 'HTTP',
  proxyServer: '',
  proxyPort: '8080',
};

/**
 * AdvancedWiFiSettings Component
 *
 * Modal for configuring advanced WiFi network settings.
 *
 * Features:
 * - Static IP configuration
 * - Custom DNS servers
 * - Proxy settings
 * - Validation for IP addresses and ports
 *
 * @param props - Component props
 * @returns Advanced WiFi settings modal
 */
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const isValidIP = (ip: string) => IP_REGEX.test(ip) && ip.split('.').every((n) => Number(n) <= 255);

export const AdvancedWiFiSettings: React.FC<AdvancedWiFiSettingsProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<AdvancedWiFiConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [staticIPError, setStaticIPError] = useState<string | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [proxyPortError, setProxyPortError] = useState<string | null>(null);

  useModalFocus(containerRef, isOpen, onClose);

  const handleSave = () => {
    let hasError = false;
    if (!config.useDHCP) {
      if (!config.staticIP || !isValidIP(config.staticIP)) {
        setStaticIPError('Enter a valid IP address (e.g. 192.168.1.100)');
        hasError = true;
      } else {
        setStaticIPError(null);
      }
      if (!config.gateway || !isValidIP(config.gateway)) {
        setGatewayError('Enter a valid gateway address (e.g. 192.168.1.1)');
        hasError = true;
      } else {
        setGatewayError(null);
      }
    }
    if (config.useProxy && config.proxyPort) {
      const port = parseInt(config.proxyPort, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        setProxyPortError('Port must be between 1 and 65535');
        hasError = true;
      } else {
        setProxyPortError(null);
      }
    }
    if (hasError) return;
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setStaticIPError(null);
    setGatewayError(null);
    setProxyPortError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="advanced-wifi-overlay" onClick={onClose}>
      <div
        ref={containerRef}
        className="advanced-wifi-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced Network Settings"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="advanced-wifi-header">
          <div className="advanced-wifi-title">
            <IconWrapper size="lg">
              <Network />
            </IconWrapper>
            <SectionHeader level={2}>Advanced Network Settings</SectionHeader>
          </div>
          <button
            className="advanced-wifi-close"
            onClick={onClose}
            aria-label="Close advanced settings"
          >
            <IconWrapper size="sm">
              <X />
            </IconWrapper>
          </button>
        </div>

        {/* Content */}
        <div className="advanced-wifi-content">
          {/* IP Configuration */}
          <div className="advanced-wifi-section">
            <div className="advanced-wifi-section-header">
              <IconWrapper size="md">
                <Network />
              </IconWrapper>
              <h3>IP Configuration</h3>
            </div>

            <label className="advanced-wifi-toggle">
              <input
                type="checkbox"
                checked={config.useDHCP}
                onChange={(e) => setConfig({ ...config, useDHCP: e.target.checked })}
              />
              <span>Obtain IP address automatically (DHCP)</span>
            </label>

            {!config.useDHCP && (
              <div className="advanced-wifi-inputs">
                <div className="advanced-wifi-input-group">
                  <label>IP Address</label>
                  <input
                    type="text"
                    value={config.staticIP}
                    onChange={(e) => {
                      setConfig({ ...config, staticIP: e.target.value });
                      setStaticIPError(null);
                    }}
                    placeholder="192.168.1.100"
                    aria-describedby={staticIPError ? 'static-ip-error' : undefined}
                  />
                  {staticIPError ? (
                    <span id="static-ip-error" role="alert" className="settings-error">
                      {staticIPError}
                    </span>
                  ) : null}
                </div>
                <div className="advanced-wifi-input-group">
                  <label>Subnet Mask</label>
                  <input
                    type="text"
                    value={config.subnetMask}
                    onChange={(e) => setConfig({ ...config, subnetMask: e.target.value })}
                    placeholder="255.255.255.0"
                  />
                </div>
                <div className="advanced-wifi-input-group">
                  <label>Default Gateway</label>
                  <input
                    type="text"
                    value={config.gateway}
                    onChange={(e) => {
                      setConfig({ ...config, gateway: e.target.value });
                      setGatewayError(null);
                    }}
                    placeholder="192.168.1.1"
                    aria-describedby={gatewayError ? 'gateway-error' : undefined}
                  />
                  {gatewayError ? (
                    <span id="gateway-error" role="alert" className="settings-error">
                      {gatewayError}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* DNS Configuration */}
          <div className="advanced-wifi-section">
            <div className="advanced-wifi-section-header">
              <IconWrapper size="md">
                <Server />
              </IconWrapper>
              <h3>DNS Servers</h3>
            </div>

            <label className="advanced-wifi-toggle">
              <input
                type="checkbox"
                checked={config.useCustomDNS}
                onChange={(e) => setConfig({ ...config, useCustomDNS: e.target.checked })}
              />
              <span>Use custom DNS servers</span>
            </label>

            {config.useCustomDNS ? (
              <div className="advanced-wifi-inputs">
                <div className="advanced-wifi-input-group">
                  <label>Primary DNS</label>
                  <input
                    type="text"
                    value={config.primaryDNS}
                    onChange={(e) => setConfig({ ...config, primaryDNS: e.target.value })}
                    placeholder="1.1.1.1"
                  />
                  <span className="advanced-wifi-hint">Cloudflare DNS (1.1.1.1, 1.0.0.1)</span>
                </div>
                <div className="advanced-wifi-input-group">
                  <label>Secondary DNS (optional)</label>
                  <input
                    type="text"
                    value={config.secondaryDNS}
                    onChange={(e) => setConfig({ ...config, secondaryDNS: e.target.value })}
                    placeholder="1.0.0.1"
                  />
                  <span className="advanced-wifi-hint">
                    Google DNS (8.8.8.8, 8.8.4.4) / OpenDNS (208.67.222.222)
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Proxy Configuration */}
          <div className="advanced-wifi-section">
            <div className="advanced-wifi-section-header">
              <IconWrapper size="md">
                <Globe />
              </IconWrapper>
              <h3>Proxy Settings</h3>
            </div>

            <label className="advanced-wifi-toggle">
              <input
                type="checkbox"
                checked={config.useProxy}
                onChange={(e) => setConfig({ ...config, useProxy: e.target.checked })}
              />
              <span>Use proxy server</span>
            </label>

            {config.useProxy ? (
              <div className="advanced-wifi-inputs">
                <div className="advanced-wifi-input-group">
                  <label>Proxy Type</label>
                  <select
                    value={config.proxyType}
                    onChange={(e) =>
                      setConfig({ ...config, proxyType: e.target.value as 'HTTP' | 'SOCKS5' })
                    }
                  >
                    <option value="HTTP">HTTP/HTTPS</option>
                    <option value="SOCKS5">SOCKS5</option>
                  </select>
                </div>
                <div className="advanced-wifi-input-group">
                  <label>Proxy Server</label>
                  <input
                    type="text"
                    value={config.proxyServer}
                    onChange={(e) => setConfig({ ...config, proxyServer: e.target.value })}
                    placeholder="proxy.example.com"
                  />
                </div>
                <div className="advanced-wifi-input-group">
                  <label>Proxy Port</label>
                  <input
                    type="text"
                    value={config.proxyPort}
                    onChange={(e) => {
                      setConfig({ ...config, proxyPort: e.target.value });
                      setProxyPortError(null);
                    }}
                    placeholder="8080"
                    aria-describedby={proxyPortError ? 'proxy-port-error' : undefined}
                  />
                  {proxyPortError ? (
                    <span id="proxy-port-error" role="alert" className="settings-error">
                      {proxyPortError}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="advanced-wifi-actions">
          <Button variant="ghost" size="md" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="advanced-wifi-actions-right">
            <Button variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSave}>
              Apply Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

AdvancedWiFiSettings.displayName = 'AdvancedWiFiSettings';

export default AdvancedWiFiSettings;
