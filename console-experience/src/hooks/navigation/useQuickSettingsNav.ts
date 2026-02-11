import { useCallback } from 'react';

import { NavigationAction } from '../../domain/input/NavigationEvent';
import { NavAction, NavState } from './types';

export const useQuickSettingsNav = (state: NavState, dispatch: React.Dispatch<NavAction>) => {
  const handleQuickSettingsMove = useCallback(
    (direction: NavigationAction, sliderCount: number) => {
      if (state.focusArea !== 'QUICK_SETTINGS') return;

      if (direction === NavigationAction.UP) {
        dispatch({
          type: 'SET_QUICK_SETTINGS_SLIDER_INDEX',
          index: Math.max(0, state.quickSettingsSliderIndex - 1),
        });
      } else if (direction === NavigationAction.DOWN) {
        dispatch({
          type: 'SET_QUICK_SETTINGS_SLIDER_INDEX',
          index: Math.min(sliderCount - 1, state.quickSettingsSliderIndex + 1),
        });
      }
    },
    [state.focusArea, state.quickSettingsSliderIndex, dispatch]
  );

  return { handleQuickSettingsMove };
};
