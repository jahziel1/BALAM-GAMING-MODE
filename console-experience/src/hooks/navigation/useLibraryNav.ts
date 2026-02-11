import { useCallback } from 'react';

import { NavigationAction } from '../../domain/input/NavigationEvent';
import { NavAction, NavState } from './types';

export const useLibraryNav = (state: NavState, dispatch: React.Dispatch<NavAction>) => {
  const handleMove = useCallback(
    (direction: NavigationAction, itemCount: number) => {
      switch (direction) {
        case NavigationAction.UP:
          if (state.focusArea === 'LIBRARY') dispatch({ type: 'SET_FOCUS', area: 'HERO' });
          break;
        case NavigationAction.DOWN:
          if (state.focusArea === 'HERO') dispatch({ type: 'SET_FOCUS', area: 'LIBRARY' });
          break;
        case NavigationAction.LEFT:
          if (state.activeIndex > 0) dispatch({ type: 'SET_INDEX', index: state.activeIndex - 1 });
          break;
        case NavigationAction.RIGHT:
          if (state.activeIndex < itemCount - 1) {
            dispatch({ type: 'SET_INDEX', index: state.activeIndex + 1 });
            dispatch({ type: 'SET_FOCUS', area: 'LIBRARY' });
          }
          break;
        default:
          break;
      }
    },
    [state.focusArea, state.activeIndex, dispatch]
  );

  return { handleMove };
};
