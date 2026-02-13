import './KeyboardShortcutsPanel.css';

import { Command, Gamepad2, Search, Settings, X } from 'lucide-react';
import React, { useEffect } from 'react';

import { Button } from '@/components/core/Button/Button';
import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';
import { SectionHeader } from '@/components/core/SectionHeader/SectionHeader';

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactElement;
  shortcuts: Shortcut[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Navigation',
    icon: <Gamepad2 />,
    shortcuts: [
      { keys: ['↑', '↓', '←', '→'], description: 'Navigate menu and game library' },
      { keys: ['Tab'], description: 'Switch between UI areas' },
      { keys: ['Enter'], description: 'Select / Confirm' },
      { keys: ['Escape'], description: 'Back / Cancel' },
      { keys: ['Home'], description: 'Jump to first item' },
      { keys: ['End'], description: 'Jump to last item' },
    ],
  },
  {
    title: 'Quick Actions',
    icon: <Command />,
    shortcuts: [
      { keys: ['Ctrl', 'Q'], description: 'Open Quick Settings' },
      { keys: ['Ctrl', 'W'], description: 'Open WiFi Panel' },
      { keys: ['Ctrl', 'B'], description: 'Open Bluetooth Panel' },
      { keys: ['Ctrl', 'P'], description: 'Open Power Menu' },
      { keys: ['Ctrl', ','], description: 'Open Settings' },
      { keys: ['F11'], description: 'Toggle Fullscreen' },
    ],
  },
  {
    title: 'Search & Library',
    icon: <Search />,
    shortcuts: [
      { keys: ['Ctrl', 'F'], description: 'Search games' },
      { keys: ['Ctrl', 'R'], description: 'Refresh library' },
      { keys: ['F'], description: 'Toggle favorite (on game)' },
      { keys: ['Del'], description: 'Delete manual game (with confirmation)' },
    ],
  },
  {
    title: 'In-Game',
    icon: <Settings />,
    shortcuts: [
      { keys: ['Shift', 'Tab'], description: 'Open in-game menu' },
      { keys: ['Ctrl', 'M'], description: 'Mute/Unmute volume' },
      { keys: ['Ctrl', '+'], description: 'Increase brightness' },
      { keys: ['Ctrl', '-'], description: 'Decrease brightness' },
    ],
  },
];

/**
 * Keyboard Shortcuts Panel
 *
 * Displays comprehensive list of keyboard shortcuts organized by category.
 * Accessible via F1 or ? key.
 *
 * Categories:
 * - Navigation: Arrow keys, Tab, Enter, Escape
 * - Quick Actions: Ctrl shortcuts for panels
 * - Search & Library: Game management shortcuts
 * - In-Game: Shortcuts available during gameplay
 */
export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="keyboard-shortcuts-header">
          <div className="keyboard-shortcuts-title">
            <IconWrapper size="lg">
              <Command />
            </IconWrapper>
            <SectionHeader level={2}>Keyboard Shortcuts</SectionHeader>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <IconWrapper size="sm">
              <X />
            </IconWrapper>
          </Button>
        </div>

        {/* Content */}
        <div className="keyboard-shortcuts-content">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.title} className="keyboard-shortcuts-category">
              <div className="keyboard-shortcuts-category-header">
                <IconWrapper size="md">{category.icon}</IconWrapper>
                <h3>{category.title}</h3>
              </div>

              <div className="keyboard-shortcuts-list">
                {category.shortcuts.map((shortcut, index) => (
                  <div key={index} className="keyboard-shortcut-item">
                    <div className="keyboard-shortcut-keys">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="keyboard-key">{key}</kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="keyboard-key-separator">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <span className="keyboard-shortcut-description">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="keyboard-shortcuts-footer">
          <p className="keyboard-shortcuts-hint">
            Press <kbd className="keyboard-key">F1</kbd> or <kbd className="keyboard-key">?</kbd>{' '}
            anytime to view this help
          </p>
        </div>
      </div>
    </div>
  );
};

KeyboardShortcutsPanel.displayName = 'KeyboardShortcutsPanel';

export default KeyboardShortcutsPanel;
