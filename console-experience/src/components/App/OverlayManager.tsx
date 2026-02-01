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

import type { VirtualKeyboardHook } from '../../hooks/useVirtualKeyboard';
import type { Game } from '../../types/game';
import FileExplorer from '../overlay/FileExplorer';
import { InGameMenuOptimized } from '../overlay/InGameMenuOptimized';
import { QuickSettings } from '../overlay/QuickSettings';
import SearchOverlay from '../overlay/SearchOverlay/SearchOverlay';
import VirtualKeyboard from '../overlay/VirtualKeyboard/VirtualKeyboard';

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

  // Quick Settings
  isQuickSettingsOpen: boolean;
  onCloseQuickSettings: () => void;
  quickSettingsSliderIndex: number;
  onQuickSettingsFocusChange: (index: number) => void;
  onRegisterQuickSettingsAdjustHandler: (handler: (direction: number) => void) => void;

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
  isQuickSettingsOpen,
  onCloseQuickSettings,
  quickSettingsSliderIndex,
  onQuickSettingsFocusChange,
  onRegisterQuickSettingsAdjustHandler,
  virtualKeyboard,
  controllerType,
}: OverlayManagerProps) {
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
      <VirtualKeyboard
        isOpen={virtualKeyboard.isOpen}
        onClose={virtualKeyboard.close}
        onSubmit={virtualKeyboard.handleSubmit}
        onTextChange={virtualKeyboard.handleTextChange} // Use debounced version from hook
        controllerType={controllerType} // Fix #22
        {...keyboardProps} // Fix #2: Memoized props
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={onCloseSearch}
        games={games}
        onLaunch={onLaunchFromSearch}
        onRegisterInputRef={onRegisterSearchInput}
        onOpenVirtualKeyboard={onOpenVirtualKeyboard}
      />

      {/* Quick Settings */}
      <QuickSettings
        isOpen={isQuickSettingsOpen}
        onClose={onCloseQuickSettings}
        focusedSliderIndex={quickSettingsSliderIndex}
        onFocusChange={onQuickSettingsFocusChange}
        controllerType={controllerType}
        onRegisterAdjustHandler={onRegisterQuickSettingsAdjustHandler}
      />
    </>
  );
}
