import { useCallback } from 'react';

import { NavigationAction } from '../../domain/input/NavigationEvent';
import { NavAction, NavState } from './types';

export const useSidebarNav = (state: NavState, dispatch: React.Dispatch<NavAction>) => {
  const handleSidebarMove = useCallback(
    (direction: NavigationAction, sidebarItemCount: number) => {
      if (!state.isSidebarOpen) return;

      if (direction === NavigationAction.UP) {
        dispatch({ type: 'SET_SIDEBAR_INDEX', index: Math.max(0, state.sidebarIndex - 1) });
      } else if (direction === NavigationAction.DOWN) {
        dispatch({
          type: 'SET_SIDEBAR_INDEX',
          index: Math.min(sidebarItemCount - 1, state.sidebarIndex + 1),
        });
      } else if (direction === NavigationAction.RIGHT) {
        dispatch({ type: 'SET_SIDEBAR', open: false });
      }
    },
    [state.isSidebarOpen, state.sidebarIndex, dispatch]
  );

  return { handleSidebarMove };
};
