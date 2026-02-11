import { NavigationAction } from '../../domain/input/NavigationEvent';

export type FocusArea =
  | 'SIDEBAR'
  | 'LIBRARY'
  | 'HERO'
  | 'INGAME_MENU'
  | 'VIRTUAL_KEYBOARD'
  | 'QUICK_SETTINGS'
  | 'SEARCH';

export interface NavState {
  focusArea: FocusArea;
  isSidebarOpen: boolean;
  isInGameMenuOpen: boolean;
  isQuickSettingsOpen: boolean;
  activeIndex: number;
  sidebarIndex: number;
  gameMenuIndex: number;
  quickSettingsSliderIndex: number;
}

export type NavAction =
  | {
      type: 'MOVE';
      direction: NavigationAction;
      itemCount: number;
      sidebarItemCount: number;
      quickSettingsSliderCount: number;
    }
  | { type: 'SET_FOCUS'; area: FocusArea }
  | { type: 'SET_SIDEBAR'; open: boolean }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'SET_SIDEBAR_INDEX'; index: number }
  | { type: 'SET_GAME_MENU_INDEX'; index: number }
  | { type: 'SET_QUICK_SETTINGS_SLIDER_INDEX'; index: number }
  | { type: 'OPEN_INGAME_MENU' }
  | { type: 'CLOSE_INGAME_MENU' }
  | { type: 'OPEN_QUICK_SETTINGS' }
  | { type: 'CLOSE_QUICK_SETTINGS' };
