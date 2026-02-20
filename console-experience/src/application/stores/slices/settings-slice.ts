/**
 * Settings Slice
 *
 * Zustand slice for application settings.
 * Part of the app-store using the Slices Pattern.
 *
 * @module stores/slices/settings-slice
 */

export interface SettingsState {
  language: string;
  startWithWindows: boolean;
  startMinimized: boolean;
  animationsEnabled: boolean;
  blurEffects: boolean;
  cardSize: string;
  hardwareAcceleration: boolean;
  defaultTDP: number;
  defaultRefreshRate: number;
  autoScan: boolean;
  vibration: boolean;
}

export const DEFAULT_SETTINGS: SettingsState = {
  language: 'en',
  startWithWindows: false,
  startMinimized: false,
  animationsEnabled: true,
  blurEffects: true,
  cardSize: 'medium',
  hardwareAcceleration: true,
  defaultTDP: 15,
  defaultRefreshRate: 60,
  autoScan: true,
  vibration: true,
};

export interface SettingsSlice {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: () => void;
}

export const createSettingsSlice = (
  set: (fn: (state: SettingsSlice) => Partial<SettingsSlice>) => void
): SettingsSlice => ({
  settings: DEFAULT_SETTINGS,

  updateSetting: (key, value) =>
    set((state) => ({ settings: { ...state.settings, [key]: value } })),

  resetSettings: () => set((_state) => ({ settings: DEFAULT_SETTINGS })),
});
