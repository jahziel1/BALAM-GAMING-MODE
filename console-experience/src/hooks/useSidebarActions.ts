import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback } from 'react';

import type { FocusArea } from './useNavigation';

interface UseSidebarActionsOptions {
  setFocusArea: (area: FocusArea) => void;
  setSidebarOpen: (open: boolean) => void;
  setIsExplorerOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsPowerModalOpen: (open: boolean) => void;
}

/**
 * Handles navigation sidebar item actions (home, library, add-game, etc.).
 */
export function useSidebarActions({
  setFocusArea,
  setSidebarOpen,
  setIsExplorerOpen,
  setIsSearchOpen,
  setIsSettingsOpen,
  setIsPowerModalOpen,
}: UseSidebarActionsOptions) {
  const handleSidebarAction = useCallback(
    async (id: string) => {
      switch (id) {
        case 'home':
          setFocusArea('HERO');
          setSidebarOpen(false);
          break;
        case 'library':
          setFocusArea('LIBRARY');
          setSidebarOpen(false);
          break;
        case 'add-game':
          setIsExplorerOpen(true);
          setSidebarOpen(false);
          break;
        case 'search':
          setIsSearchOpen(true);
          setSidebarOpen(false);
          break;
        case 'settings':
          setIsSettingsOpen(true);
          setSidebarOpen(false);
          break;
        case 'desktop':
          await getCurrentWindow().minimize();
          setSidebarOpen(false);
          break;
        case 'power':
          setIsPowerModalOpen(true);
          setSidebarOpen(false);
          break;
        default:
          setSidebarOpen(false);
      }
    },
    [
      setFocusArea,
      setSidebarOpen,
      setIsExplorerOpen,
      setIsSearchOpen,
      setIsSettingsOpen,
      setIsPowerModalOpen,
    ]
  );

  return { handleSidebarAction };
}
