import './SettingsPanel.css';

import {
  Bolt,
  BookOpen,
  Gamepad2,
  Globe,
  Info,
  Monitor,
  Palette,
  Settings as SettingsIcon,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import ButtonHint from '../../ui/ButtonHint/ButtonHint';
import { OverlayPanel } from '../OverlayPanel/OverlayPanel';
import { DisplayTab } from './components/tabs/DisplayTab';
import { PerformanceTab } from './components/tabs/PerformanceTab';

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
  | 'display'
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
  { id: 'display', icon: <Monitor size={20} />, label: 'Display' },
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

  // System settings
  const [defaultTDP, setDefaultTDP] = useState(15);
  const [defaultRefreshRate, setDefaultRefreshRate] = useState(60);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Version info
  const version = '0.1.0';

  // Load settings on open
  useEffect(() => {
    if (isOpen) {
      // TODO: Load settings from backend or localStorage
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

  // Reset all settings to defaults
  const handleResetConfirmed = () => {
    // Reset all state to defaults
    setLanguage('en');
    setStartWithWindows(false);
    setStartMinimized(false);
    setAnimationsEnabled(true);
    setBlurEffects(true);
    setCardSize('medium');
    setHardwareAcceleration(true);
    setDefaultTDP(15);
    setDefaultRefreshRate(60);

    // TODO: Clear localStorage or backend settings
    // TODO: Show success toast

    setShowResetConfirm(false);
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

      case 'display':
        return <DisplayTab />;

      case 'performance':
        return (
          <PerformanceTab
            hardwareAcceleration={hardwareAcceleration}
            setHardwareAcceleration={setHardwareAcceleration}
          />
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

            {/* Reset All Settings */}
            <div className="settings-item settings-item-danger">
              <div className="settings-item-info">
                <span className="settings-item-label">Reset All Settings</span>
                <span className="settings-item-description">
                  Restore all settings to their default values
                </span>
              </div>
              <button className="settings-button-danger" onClick={() => setShowResetConfirm(true)}>
                Reset to Defaults
              </button>
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
    <>
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

      {/* Reset Confirmation Dialog */}
      {showResetConfirm ? (
        <div className="settings-reset-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="settings-reset-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Reset All Settings?</h3>
            <p>All custom settings will be restored to their default values.</p>
            <p className="settings-reset-warning">This action cannot be undone.</p>
            <div className="settings-reset-actions">
              <button
                className="settings-button"
                onClick={() => setShowResetConfirm(false)}
                autoFocus
              >
                Cancel
              </button>
              <button className="settings-button-danger" onClick={handleResetConfirmed}>
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SettingsPanel;
