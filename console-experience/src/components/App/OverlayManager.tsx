/**
 * @module components/App/OverlayManager
 *
 * Centralized manager for all overlay components.
 *
 * FIXES:
 * - #1: Map HTML input types to supported keyboard types
 * - #2: Memoize props to avoid function calls during render
 * - #22: Pass controllerType correctly to VirtualKeyboard
 */

import { useMemo } from 'react';

import { useAppStore } from '../../application/providers/StoreProvider';
import type { Game } from '../../domain/entities/game';
import type { VirtualKeyboardHook } from '../../hooks/useVirtualKeyboard';
import { BluetoothPanel } from '../overlay/BluetoothPanel';
import FileExplorer from '../overlay/FileExplorer';
import { InGameMenuOptimized } from '../overlay/InGameMenuOptimized';
import { QuickSettings } from '../overlay/QuickSettings';
import SearchOverlay from '../overlay/SearchOverlay/SearchOverlay';
import { SettingsPanel } from '../overlay/SettingsPanel';
import VirtualKeyboard from '../overlay/VirtualKeyboard/VirtualKeyboard';
import { WiFiPanel } from '../overlay/WiFiPanel';

/**
 * Props for OverlayManager component
 */
interface OverlayManagerProps {
  // File Explorer
  isExplorerOpen: boolean;
  onCloseExplorer: () => void;
  onSelectManualGame: (path: string, title: string) => Promise<void>;

  // Search
  isSearchOpen: boolean;
  onCloseSearch: () => void;
  games: Game[];
  onLaunchFromSearch: (game: Game) => void;
  onRegisterSearchInput?: (ref: React.RefObject<HTMLInputElement>) => void;
  onOpenVirtualKeyboard?: () => void;

  // Settings Panel
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  onOpenQuickSettingsFromSettings?: () => void;

  // Quick Settings (managed by app-store)
  onOpenWiFiPanel?: () => void;
  onOpenBluetoothPanel?: () => void;

  // WiFi Panel
  isWiFiPanelOpen: boolean;
  onCloseWiFiPanel: () => void;

  // Bluetooth Panel
  isBluetoothPanelOpen: boolean;
  onCloseBluetoothPanel: () => void;

  // Virtual Keyboard
  virtualKeyboard: VirtualKeyboardHook;

  // Controller type
  /** Type of controller for displaying appropriate button hints */
  controllerType: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';
}

/**
 * Fix #1: Map HTML input types to VirtualKeyboard supported types
 * Handles all HTML input types and maps them to keyboard layouts
 */
const mapInputType = (htmlType: string): 'text' | 'email' | 'password' | 'number' | 'url' => {
  switch (htmlType) {
    // Email types
    case 'email':
      return 'email';

    // Password types
    case 'password':
      return 'password';

    // Number types
    case 'number':
    case 'tel': // Phone numbers use numeric layout
      return 'number';

    // URL types
    case 'url':
      return 'url';

    // Search and text types default to text
    case 'search':
    case 'text':
    default:
      return 'text';
  }
};

/**
 * OverlayManager Component
 *
 * Centralized manager for all overlay components in the application:
 * - InGameMenu (self-managed via overlay-store)
 * - FileExplorer
 * - VirtualKeyboard
 * - SearchOverlay
 * - QuickSettings
 *
 * Handles state and callbacks for all overlays in one place,
 * reducing prop drilling in parent components.
 *
 * @param props - All overlay states and callbacks
 * @returns Fragment containing all overlay components
 */
export function OverlayManager({
  isExplorerOpen,
  onCloseExplorer,
  onSelectManualGame,
  isSearchOpen,
  onCloseSearch,
  games,
  onLaunchFromSearch,
  onRegisterSearchInput,
  onOpenVirtualKeyboard,
  isSettingsOpen,
  onCloseSettings,
  onOpenQuickSettingsFromSettings,
  onOpenWiFiPanel,
  onOpenBluetoothPanel,
  isWiFiPanelOpen,
  onCloseWiFiPanel,
  isBluetoothPanelOpen,
  onCloseBluetoothPanel,
  virtualKeyboard,
  controllerType,
}: OverlayManagerProps) {
  // Get QuickSettings state from app-store (right sidebar)
  const { overlay, closeRightSidebar } = useAppStore();
  // Fix #2: Memoize keyboard props to avoid function calls during render
  const keyboardProps = useMemo(() => {
    // Use getTargetInput to support custom inputs (e.g., Command.Input in SearchOverlay)
    const targetInput = virtualKeyboard.getTargetInput();

    // Get initial value
    const initialValue = virtualKeyboard.getInitialValue();

    // Fix #1: Map input type correctly
    const rawInputType = virtualKeyboard.getInputType();
    const inputType = mapInputType(rawInputType);

    // Get placeholder
    const placeholder =
      targetInput instanceof HTMLInputElement
        ? targetInput.placeholder || 'Type here...'
        : 'Type here...';

    // Get maxLength
    const maxLength =
      targetInput instanceof HTMLInputElement && targetInput.maxLength > 0
        ? targetInput.maxLength
        : undefined;

    return {
      initialValue,
      inputType,
      placeholder,
      maxLength,
    };
  }, [virtualKeyboard]); // React Compiler: use full object for correct memoization

  return (
    <>
      {/* InGameMenu (self-managed via overlay-store) */}
      <InGameMenuOptimized />

      {/* File Explorer */}
      {isExplorerOpen ? (
        <FileExplorer
          onClose={onCloseExplorer}
          onSelectGame={(path, title) => void onSelectManualGame(path, title)}
          controllerType={controllerType}
        />
      ) : null}

      {/* Virtual Keyboard - Fix #22: Pass controllerType */}
      {virtualKeyboard.isOpen ? (
        <VirtualKeyboard
          isOpen={virtualKeyboard.isOpen}
          onClose={virtualKeyboard.close}
          onSubmit={virtualKeyboard.handleSubmit}
          onTextChange={virtualKeyboard.handleTextChange} // Use debounced version from hook
          controllerType={controllerType} // Fix #22
          {...keyboardProps} // Fix #2: Memoized props
        />
      ) : null}

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={onCloseSearch}
        games={games}
        onLaunch={onLaunchFromSearch}
        onRegisterInputRef={onRegisterSearchInput}
        onOpenVirtualKeyboard={onOpenVirtualKeyboard}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={onCloseSettings}
        controllerType={controllerType}
        onOpenQuickSettings={onOpenQuickSettingsFromSettings}
      />

      {/* Quick Settings (Right Sidebar - managed by app-store) */}
      <QuickSettings
        isOpen={overlay.rightSidebarOpen}
        onClose={closeRightSidebar}
        controllerType={controllerType}
        onOpenWiFiPanel={onOpenWiFiPanel}
        onOpenBluetoothPanel={onOpenBluetoothPanel}
      />

      {/* WiFi Panel */}
      <WiFiPanel
        isOpen={isWiFiPanelOpen}
        onClose={onCloseWiFiPanel}
        controllerType={controllerType}
      />

      {/* Bluetooth Panel */}
      <BluetoothPanel
        isOpen={isBluetoothPanelOpen}
        onClose={onCloseBluetoothPanel}
        controllerType={controllerType}
      />
    </>
  );
}
