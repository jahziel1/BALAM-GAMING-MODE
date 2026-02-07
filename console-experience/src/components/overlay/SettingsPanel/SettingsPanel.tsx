import './SettingsPanel.css';

import { invoke } from '@tauri-apps/api/core';
import {
  Bolt,
  BookOpen,
  Gamepad2,
  Globe,
  Info,
  Palette,
  Settings as SettingsIcon,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { usePerformanceOverlayStore } from '@/application/stores/performance-overlay-store';

import ButtonHint from '../../ui/ButtonHint/ButtonHint';
import { OverlayPanel } from '../OverlayPanel/OverlayPanel';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  controllerType?: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';
  onOpenQuickSettings?: () => void;
}

type SettingsCategory =
  | 'general'
  | 'appearance'
  | 'library'
  | 'input'
  | 'performance'
  | 'system'
  | 'about';

interface CategoryItem {
  id: SettingsCategory;
  icon: React.ReactNode;
  label: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'general', icon: <Globe size={20} />, label: 'General' },
  { id: 'appearance', icon: <Palette size={20} />, label: 'Appearance' },
  { id: 'library', icon: <BookOpen size={20} />, label: 'Library' },
  { id: 'input', icon: <Gamepad2 size={20} />, label: 'Input' },
  { id: 'performance', icon: <Bolt size={20} />, label: 'Performance' },
  { id: 'system', icon: <Zap size={20} />, label: 'System' },
  { id: 'about', icon: <Info size={20} />, label: 'About' },
];

/**
 * Settings Panel - Application configuration
 *
 * Comprehensive settings interface for Balam Console Experience,
 * following patterns from Steam Big Picture, Xbox Game Bar, and Playnite.
 *
 * Categories:
 * - General: Language, startup options
 * - Appearance: Theme, colors, animations
 * - Library: Game folders, scanning
 * - Input: Gamepad, keyboard shortcuts
 * - Performance: Hardware acceleration, optimizations
 * - System: Default hardware settings (TDP, display, audio)
 * - About: Version, credits, updates
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  controllerType = 'KEYBOARD',
  onOpenQuickSettings,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory>('general');
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Performance Overlay configuration (Zustand store - shared with App.tsx)
  const {
    config: perfOverlayConfig,
    setEnabled: setPerfOverlayEnabled,
    setMode: setPerfOverlayMode,
    setPosition: setPerfOverlayPosition,
    setAutoStartFPS: setPerfOverlayAutoStartFPS,
    setUpdateInterval: setPerfOverlayUpdateInterval,
  } = usePerformanceOverlayStore();

  // General settings
  const [language, setLanguage] = useState('en');
  const [startWithWindows, setStartWithWindows] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);

  // Appearance settings
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [blurEffects, setBlurEffects] = useState(true);
  const [cardSize, setCardSize] = useState('medium');

  // Performance settings
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);

  // RTSS (RivaTuner Statistics Server) settings
  const [rtssAvailable, setRTSSAvailable] = useState(false);
  const [rtssEnabled, setRTSSEnabled] = useState(false);
  const [wingetAvailable, setWingetAvailable] = useState(false);
  const [isInstallingRTSS, setIsInstallingRTSS] = useState(false);
  const [isUninstallingRTSS, setIsUninstallingRTSS] = useState(false);
  const [rtssVersion, setRTSSVersion] = useState<string | null>(null);

  // System settings
  const [defaultTDP, setDefaultTDP] = useState(15);
  const [defaultRefreshRate, setDefaultRefreshRate] = useState(60);

  // Version info
  const version = '0.1.0';

  // Load settings on open
  useEffect(() => {
    if (isOpen) {
      // TODO: Load settings from backend or localStorage
      console.log('📋 Loading settings...');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(CATEGORIES.length - 1, prev + 1));
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          // Navigate between category list and content (future enhancement)
          break;
        case 'Enter':
          e.preventDefault();
          setSelectedCategory(CATEGORIES[focusedIndex].id);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, onClose]);

  // Check RTSS availability and winget on mount
  useEffect(() => {
    const checkRTSSAndWinget = async () => {
      try {
        // Check if winget is available for auto-installation
        const winget = await invoke<boolean>('is_winget_available');
        setWingetAvailable(winget);

        // Check if RTSS is available (shared memory detection)
        const available = await invoke<boolean>('is_rtss_available');
        setRTSSAvailable(available);

        if (available) {
          const enabled = await invoke<boolean>('is_using_rtss_overlay');
          setRTSSEnabled(enabled);

          // Get RTSS version if installed
          const version = await invoke<string | null>('get_rtss_version');
          setRTSSVersion(version);
        }
      } catch (error) {
        console.error('Failed to check RTSS and winget:', error);
        setRTSSAvailable(false);
        setWingetAvailable(false);
      }
    };
    void checkRTSSAndWinget();
  }, []);

  // Handler for RTSS toggle
  const handleToggleRTSS = async (enabled: boolean) => {
    try {
      if (enabled) {
        await invoke('enable_rtss_overlay');
      } else {
        await invoke('disable_rtss_overlay');
      }
      setRTSSEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle RTSS:', error);
    }
  };

  // Handler for RTSS auto-installation via winget (async with polling)
  const handleAutoInstallRTSS = async () => {
    try {
      setIsInstallingRTSS(true);
      console.log('🔽 Starting RTSS installation via winget (background thread)...');

      // Start installation in background (returns immediately)
      await invoke('install_rtss_via_winget');
      console.log('✅ Installation started, polling for completion...');

      // Poll every 2 seconds to check if installation completed
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max (60 * 2s = 120s)

      const checkInterval = setInterval(() => {
        void (async () => {
          attempts++;

          try {
            // Check if RTSS is now available
            const available = await invoke<boolean>('is_rtss_available');

            if (available) {
              // Installation completed successfully!
              clearInterval(checkInterval);
              console.log('✅ RTSS installation completed successfully');

              const version = await invoke<string | null>('get_rtss_version');
              setRTSSVersion(version);
              setRTSSAvailable(true);
              setIsInstallingRTSS(false);

              // eslint-disable-next-line no-alert
              alert(
                `RTSS installed successfully! ${version ? `(v${version})` : ''}\n\nPlease restart Balam to enable fullscreen overlay support.`
              );
            } else if (attempts >= maxAttempts) {
              // Timeout - installation took too long
              clearInterval(checkInterval);
              setIsInstallingRTSS(false);
              console.warn('⚠️ Installation timeout - please check manually');

              // eslint-disable-next-line no-alert
              alert(
                'Installation timeout.\n\nRTSS installation may still be running in background.\nPlease check Windows Settings → Apps or try manual installation.'
              );
            } else {
              // Still installing, keep polling
              console.log(`⏳ Polling attempt ${attempts}/${maxAttempts}...`);
            }
          } catch (error) {
            console.error('Error checking RTSS availability:', error);
          }
        })();
      }, 2000); // Check every 2 seconds
    } catch (error) {
      console.error('❌ Failed to start RTSS installation:', error);
      setIsInstallingRTSS(false);

      // eslint-disable-next-line no-alert
      alert(
        `Failed to start RTSS installation:\n\n${String(error)}\n\nPlease try manual installation or check if you have administrator privileges.`
      );
    }
  };

  // Handler for RTSS uninstallation via winget (async with polling)
  const handleUninstallRTSS = async () => {
    try {
      // eslint-disable-next-line no-alert
      const confirmed = confirm(
        'Are you sure you want to uninstall RTSS?\n\nThis will remove fullscreen overlay support.'
      );

      if (!confirmed) {
        return;
      }

      setIsUninstallingRTSS(true);
      console.log('🗑️ Starting RTSS uninstallation via winget (background thread)...');

      // Start uninstallation in background (returns immediately)
      await invoke('uninstall_rtss_via_winget');
      console.log('✅ Uninstallation started, polling for completion...');

      // Poll every 2 seconds to check if uninstallation completed
      let attempts = 0;
      const maxAttempts = 30; // 1 minute max (30 * 2s = 60s)

      const checkInterval = setInterval(() => {
        void (async () => {
          attempts++;

          try {
            // Check if RTSS is now unavailable (uninstalled)
            const available = await invoke<boolean>('is_rtss_available');

            if (!available) {
              // Uninstallation completed successfully!
              clearInterval(checkInterval);
              console.log('✅ RTSS uninstallation completed successfully');

              setRTSSVersion(null);
              setRTSSAvailable(false);
              setRTSSEnabled(false);
              setIsUninstallingRTSS(false);

              // eslint-disable-next-line no-alert
              alert(
                'RTSS uninstalled successfully!\n\nFullscreen overlay support has been removed.'
              );
            } else if (attempts >= maxAttempts) {
              // Timeout - uninstallation took too long
              clearInterval(checkInterval);
              setIsUninstallingRTSS(false);
              console.warn('⚠️ Uninstallation timeout - please check manually');

              // eslint-disable-next-line no-alert
              alert(
                'Uninstallation timeout.\n\nRTSS uninstallation may still be running in background.\nPlease check Windows Settings → Apps.'
              );
            } else {
              // Still uninstalling, keep polling
              console.log(`⏳ Polling attempt ${attempts}/${maxAttempts}...`);
            }
          } catch (error_inner) {
            console.error('Error checking RTSS availability:', error_inner);
          }
        })();
      }, 2000); // Check every 2 seconds
    } catch (error) {
      console.error('❌ Failed to start RTSS uninstallation:', error);
      setIsUninstallingRTSS(false);

      // eslint-disable-next-line no-alert
      alert(
        `Failed to start RTSS uninstallation:\n\n${String(error)}\n\nPlease try manual uninstallation from Windows Settings.`
      );
    }
  };

  const renderCategoryContent = () => {
    switch (selectedCategory) {
      case 'general':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">General Settings</h3>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Language</span>
                <span className="settings-item-description">Interface language</span>
              </div>
              <select
                className="settings-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
              </select>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Start with Windows</span>
                <span className="settings-item-description">
                  Launch Balam automatically when Windows starts
                </span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={startWithWindows}
                  onChange={(e) => setStartWithWindows(e.target.checked)}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Start Minimized</span>
                <span className="settings-item-description">Start in system tray</span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={startMinimized}
                  onChange={(e) => setStartMinimized(e.target.checked)}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">Appearance</h3>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Animations</span>
                <span className="settings-item-description">Enable smooth transitions</span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={animationsEnabled}
                  onChange={(e) => setAnimationsEnabled(e.target.checked)}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Blur Effects</span>
                <span className="settings-item-description">Background blur on overlays</span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={blurEffects}
                  onChange={(e) => setBlurEffects(e.target.checked)}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Card Size</span>
                <span className="settings-item-description">Game card display size</span>
              </div>
              <select
                className="settings-select"
                value={cardSize}
                onChange={(e) => setCardSize(e.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        );

      case 'library':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">Library</h3>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Game Folders</span>
                <span className="settings-item-description">
                  Manage folders where games are scanned
                </span>
              </div>
              <button className="settings-button">Manage Folders</button>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Auto-Scan Games</span>
                <span className="settings-item-description">Automatically detect new games</span>
              </div>
              <label className="settings-toggle">
                <input type="checkbox" defaultChecked />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Rescan Library</span>
                <span className="settings-item-description">Force a manual library scan</span>
              </div>
              <button className="settings-button">Scan Now</button>
            </div>
          </div>
        );

      case 'input':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">Input</h3>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Controller Type</span>
                <span className="settings-item-description">Detected controller layout</span>
              </div>
              <select className="settings-select" value={controllerType} disabled>
                <option value="XBOX">Xbox</option>
                <option value="PLAYSTATION">PlayStation</option>
                <option value="SWITCH">Nintendo Switch</option>
                <option value="GENERIC">Generic</option>
                <option value="KEYBOARD">Keyboard</option>
              </select>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Vibration</span>
                <span className="settings-item-description">Controller haptic feedback</span>
              </div>
              <label className="settings-toggle">
                <input type="checkbox" defaultChecked />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Keyboard Shortcuts</span>
                <span className="settings-item-description">Customize keyboard bindings</span>
              </div>
              <button className="settings-button">Configure</button>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">Performance</h3>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Hardware Acceleration</span>
                <span className="settings-item-description">
                  Use GPU for rendering (recommended)
                </span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={hardwareAcceleration}
                  onChange={(e) => setHardwareAcceleration(e.target.checked)}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Background Behavior</span>
                <span className="settings-item-description">
                  Continue running when game launches
                </span>
              </div>
              <label className="settings-toggle">
                <input type="checkbox" defaultChecked />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            {/* Performance Overlay Section */}
            <h3 className="settings-section-title" style={{ marginTop: '2rem' }}>
              Performance Overlay
            </h3>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Enable Performance Overlay</span>
                <span className="settings-item-description">
                  Show real-time FPS, CPU, GPU, and RAM metrics
                </span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={perfOverlayConfig.enabled}
                  onChange={(e) => setPerfOverlayEnabled(e.target.checked)}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            {perfOverlayConfig.enabled ? (
              <>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Display Mode</span>
                    <span className="settings-item-description">
                      Choose which metrics to display
                    </span>
                  </div>
                  <select
                    className="settings-select"
                    value={perfOverlayConfig.mode}
                    onChange={(e) =>
                      setPerfOverlayMode(e.target.value as 'minimal' | 'compact' | 'full')
                    }
                  >
                    <option value="minimal">Minimal (FPS only)</option>
                    <option value="compact">Compact (FPS + CPU + GPU)</option>
                    <option value="full">Full (All metrics)</option>
                  </select>
                </div>

                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Position</span>
                    <span className="settings-item-description">
                      Screen corner for overlay placement
                    </span>
                  </div>
                  <select
                    className="settings-select"
                    value={perfOverlayConfig.position}
                    onChange={(e) =>
                      setPerfOverlayPosition(
                        e.target.value as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
                      )
                    }
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>

                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Auto-Start FPS Monitoring</span>
                    <span className="settings-item-description">
                      Automatically start FPS counter when game launches
                    </span>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={perfOverlayConfig.autoStartFPS}
                      onChange={(e) => setPerfOverlayAutoStartFPS(e.target.checked)}
                    />
                    <span className="settings-toggle-slider" />
                  </label>
                </div>

                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Update Interval</span>
                    <span className="settings-item-description">
                      How often to refresh metrics (lower = more CPU usage)
                    </span>
                  </div>
                  <select
                    className="settings-select"
                    value={perfOverlayConfig.updateInterval}
                    onChange={(e) => setPerfOverlayUpdateInterval(Number(e.target.value))}
                  >
                    <option value="500">Fast (0.5s) - Higher CPU usage</option>
                    <option value="1000">Normal (1s) - Recommended</option>
                    <option value="2000">Slow (2s) - Lower CPU usage</option>
                  </select>
                </div>

                {/* RTSS Fullscreen Overlay Section */}
                <h3 className="settings-section-title" style={{ marginTop: '2rem' }}>
                  Fullscreen Overlay (RTSS)
                </h3>

                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">RTSS Fullscreen Support</span>
                    <span className="settings-item-description">
                      {rtssAvailable ? (
                        <>
                          ✅ RTSS detected - Fullscreen overlay enabled
                          {rtssVersion ? ` (v${rtssVersion})` : null}
                        </>
                      ) : isInstallingRTSS ? (
                        <>
                          ⏳ Installing RTSS in background...
                          <br />
                          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                            This may take 30-60 seconds. UI remains responsive.
                          </span>
                        </>
                      ) : isUninstallingRTSS ? (
                        <>
                          🗑️ Uninstalling RTSS in background...
                          <br />
                          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                            This may take 10-30 seconds. UI remains responsive.
                          </span>
                        </>
                      ) : (
                        'RTSS not detected - Required for fullscreen exclusive games'
                      )}
                    </span>
                  </div>
                  {rtssAvailable ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <label className="settings-toggle">
                        <input
                          type="checkbox"
                          checked={rtssEnabled}
                          onChange={(e) => void handleToggleRTSS(e.target.checked)}
                          disabled={isUninstallingRTSS}
                        />
                        <span className="settings-toggle-slider" />
                      </label>
                      {wingetAvailable ? (
                        <button
                          className="settings-button"
                          onClick={() => void handleUninstallRTSS()}
                          disabled={isUninstallingRTSS}
                          style={{
                            backgroundColor: 'rgba(255, 59, 48, 0.2)',
                            color: '#ff3b30',
                            border: '1px solid rgba(255, 59, 48, 0.3)',
                            fontSize: '0.85rem',
                            padding: '6px 12px',
                          }}
                        >
                          {isUninstallingRTSS ? '🗑️ Uninstalling...' : '🗑️ Uninstall'}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Option 1: Auto-install via winget (preferred) */}
                      {wingetAvailable ? (
                        <button
                          className="settings-button"
                          onClick={() => void handleAutoInstallRTSS()}
                          disabled={isInstallingRTSS}
                          style={{
                            backgroundColor: '#00d9ff',
                            color: '#000',
                            fontWeight: 600,
                          }}
                        >
                          {isInstallingRTSS ? '⏳ Installing...' : '⚡ Auto-Install'}
                        </button>
                      ) : null}

                      {/* Option 2: Manual download (fallback) */}
                      <button
                        className="settings-button"
                        onClick={() => {
                          window.open(
                            'https://www.guru3d.com/download/rtss-rivatuner-statistics-server-download/',
                            '_blank'
                          );
                        }}
                        disabled={isInstallingRTSS}
                      >
                        📥 Manual Download
                      </button>
                    </div>
                  )}
                </div>

                {/* Winget availability warning */}
                {!rtssAvailable && !wingetAvailable ? (
                  <div
                    className="settings-item"
                    style={{
                      backgroundColor: 'rgba(255, 149, 0, 0.1)',
                      border: '1px solid rgba(255, 149, 0, 0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div className="settings-item-info">
                      <span className="settings-item-description" style={{ fontSize: '0.85rem' }}>
                        ⚠️ <strong>Windows Package Manager (winget) not detected.</strong>
                        <br />
                        Auto-installation unavailable. Please use manual download or update Windows
                        to version 10 1809+ / Windows 11.
                      </span>
                    </div>
                  </div>
                ) : null}

                {rtssAvailable ? (
                  <div className="settings-item">
                    <div className="settings-item-info">
                      <span className="settings-item-label">How RTSS Works</span>
                      <span className="settings-item-description">
                        RTSS injects the overlay directly into fullscreen games. Enable this when
                        playing in fullscreen exclusive mode. Disable for borderless windowed.
                      </span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        );

      case 'system':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">System</h3>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Quick Settings</span>
                <span className="settings-item-description">
                  Access volume, brightness, TDP controls
                </span>
              </div>
              <button
                className="settings-button-primary"
                onClick={() => {
                  if (onOpenQuickSettings) {
                    onOpenQuickSettings();
                  }
                }}
              >
                Open Quick Settings
              </button>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Default TDP</span>
                <span className="settings-item-description">
                  Power limit when launching games (if supported)
                </span>
              </div>
              <div className="settings-slider-container">
                <input
                  type="range"
                  className="settings-slider"
                  min="5"
                  max="30"
                  value={defaultTDP}
                  onChange={(e) => setDefaultTDP(Number(e.target.value))}
                />
                <span className="settings-slider-value">{defaultTDP}W</span>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Default Refresh Rate</span>
                <span className="settings-item-description">Preferred display refresh rate</span>
              </div>
              <select
                className="settings-select"
                value={defaultRefreshRate}
                onChange={(e) => setDefaultRefreshRate(Number(e.target.value))}
              >
                <option value="60">60 Hz</option>
                <option value="90">90 Hz</option>
                <option value="120">120 Hz</option>
                <option value="144">144 Hz</option>
              </select>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="settings-section">
            <h3 className="settings-section-title">About Balam</h3>

            <div className="settings-about">
              <div className="settings-about-logo">
                <SettingsIcon size={64} />
              </div>
              <h2 className="settings-about-title">Balam Console Experience</h2>
              <p className="settings-about-version">Version {version}</p>
              <p className="settings-about-description">
                A modern game launcher designed for handheld gaming devices, bringing console-like
                experience to Windows handhelds.
              </p>

              <div className="settings-about-actions">
                <button className="settings-button">Check for Updates</button>
                <button className="settings-button">View on GitHub</button>
                <button className="settings-button">View License</button>
              </div>

              <div className="settings-about-credits">
                <p className="settings-about-credits-title">Credits</p>
                <p className="settings-about-credits-text">
                  Built with Tauri, React, and TypeScript
                  <br />
                  Co-Authored-By: Claude Sonnet 4.5
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const footer = (
    <div className="prompts-container">
      <ButtonHint action="BACK" type={controllerType} label="Close" />
      <ButtonHint action="DPAD_VERTICAL" type={controllerType} label="Navigate" />
      <ButtonHint action="CONFIRM" type={controllerType} label="Select" />
    </div>
  );

  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      side="left"
      width="900px"
      footer={footer}
    >
      <div className="settings-container">
        {/* Category Sidebar */}
        <div className="settings-sidebar">
          {CATEGORIES.map((category, index) => (
            <button
              key={category.id}
              className={`settings-category ${selectedCategory === category.id ? 'active' : ''} ${focusedIndex === index ? 'focused' : ''}`}
              onClick={() => {
                setSelectedCategory(category.id);
                setFocusedIndex(index);
              }}
            >
              <span className="settings-category-icon">{category.icon}</span>
              <span className="settings-category-label">{category.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="settings-content">{renderCategoryContent()}</div>
      </div>
    </OverlayPanel>
  );
};

export default SettingsPanel;
