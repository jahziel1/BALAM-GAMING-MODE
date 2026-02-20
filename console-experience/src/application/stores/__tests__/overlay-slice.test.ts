/**
 * Unit tests for Overlay Slice
 * Tests all overlay state management actions in isolation.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { create } from 'zustand';

import { createOverlaySlice, type OverlaySlice } from '../slices/overlay-slice';

function makeStore() {
  return create<OverlaySlice>((set, get) => ({
    ...createOverlaySlice(set as (fn: (state: OverlaySlice) => Partial<OverlaySlice>) => void, get),
  }));
}

describe('overlay-slice', () => {
  let useStore: ReturnType<typeof makeStore>;

  beforeEach(() => {
    useStore = makeStore();
  });

  // ---- Initial state ----

  it('starts with no overlay and both sidebars closed', () => {
    const state = useStore.getState();
    expect(state.overlay.currentOverlay).toBeNull();
    expect(state.overlay.previousOverlay).toBeNull();
    expect(state.overlay.leftSidebarOpen).toBe(false);
    expect(state.overlay.rightSidebarOpen).toBe(false);
  });

  // ---- Fullscreen overlays ----

  it('showOverlay sets currentOverlay', () => {
    useStore.getState().showOverlay('search');
    expect(useStore.getState().overlay.currentOverlay).toBe('search');
  });

  it('showOverlay saves previousOverlay', () => {
    useStore.getState().showOverlay('search');
    useStore.getState().showOverlay('fileExplorer');
    expect(useStore.getState().overlay.previousOverlay).toBe('search');
    expect(useStore.getState().overlay.currentOverlay).toBe('fileExplorer');
  });

  it('hideOverlay clears currentOverlay and previousOverlay', () => {
    useStore.getState().showOverlay('search');
    useStore.getState().hideOverlay();
    expect(useStore.getState().overlay.currentOverlay).toBeNull();
    expect(useStore.getState().overlay.previousOverlay).toBeNull();
  });

  it('goBack restores previousOverlay', () => {
    useStore.getState().showOverlay('search');
    useStore.getState().showOverlay('virtualKeyboard');
    useStore.getState().goBack();
    expect(useStore.getState().overlay.currentOverlay).toBe('search');
  });

  // ---- Left sidebar ----

  it('openLeftSidebar sets leftSidebarOpen to true', () => {
    useStore.getState().openLeftSidebar();
    expect(useStore.getState().overlay.leftSidebarOpen).toBe(true);
  });

  it('closeLeftSidebar sets leftSidebarOpen to false', () => {
    useStore.getState().openLeftSidebar();
    useStore.getState().closeLeftSidebar();
    expect(useStore.getState().overlay.leftSidebarOpen).toBe(false);
  });

  // ---- Right sidebar ----

  it('openRightSidebar sets rightSidebarOpen to true', () => {
    useStore.getState().openRightSidebar();
    expect(useStore.getState().overlay.rightSidebarOpen).toBe(true);
  });

  it('closeAllSidebars closes both sidebars', () => {
    useStore.getState().openLeftSidebar();
    useStore.getState().openRightSidebar();
    useStore.getState().closeAllSidebars();
    expect(useStore.getState().overlay.leftSidebarOpen).toBe(false);
    expect(useStore.getState().overlay.rightSidebarOpen).toBe(false);
  });
});
