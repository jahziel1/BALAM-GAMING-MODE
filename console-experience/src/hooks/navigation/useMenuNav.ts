import { useCallback } from 'react';

import { NavigationAction } from '../../domain/input/NavigationEvent';
import { NavAction, NavState } from './types';

export const useMenuNav = (state: NavState, dispatch: React.Dispatch<NavAction>) => {
  const handleMenuMove = useCallback(
    (direction: NavigationAction) => {
      if (state.focusArea !== 'INGAME_MENU') return;

      if (direction === NavigationAction.UP) {
        dispatch({ type: 'SET_GAME_MENU_INDEX', index: Math.max(0, state.gameMenuIndex - 1) });
      } else if (direction === NavigationAction.DOWN) {
        dispatch({ type: 'SET_GAME_MENU_INDEX', index: Math.min(2, state.gameMenuIndex + 1) });
      }
    },
    [state.focusArea, state.gameMenuIndex, dispatch]
  );

  return { handleMenuMove };
};
