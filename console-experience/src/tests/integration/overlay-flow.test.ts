/**
 * Integration Tests: Overlay Flow
 *
 * Tests overlay state management flows.
 *
 * @module tests/integration/overlay-flow.test
 */

import { useOverlayStore } from '@application/stores/overlay-store';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Integration: Overlay Flow', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useOverlayStore.setState({ currentOverlay: null, previousOverlay: null });
    });
  });

  it('should complete navigation flow: menu → settings → back', () => {
    const { result } = renderHook(() => useOverlayStore());

    // Open in-game menu
    act(() => {
      result.current.showOverlay('inGameMenu');
    });

    expect(result.current.currentOverlay).toBe('inGameMenu');
    expect(result.current.previousOverlay).toBeNull();

    // Navigate to quick settings
    act(() => {
      result.current.showOverlay('quickSettings');
    });

    expect(result.current.currentOverlay).toBe('quickSettings');
    expect(result.current.previousOverlay).toBe('inGameMenu');

    // Go back
    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentOverlay).toBe('inGameMenu');
    expect(result.current.previousOverlay).toBeNull();
  });

  it('should complete toggle flow: show → hide', () => {
    const { result } = renderHook(() => useOverlayStore());

    // Show overlay
    act(() => {
      result.current.toggleOverlay('fileExplorer');
    });

    expect(result.current.currentOverlay).toBe('fileExplorer');

    // Hide overlay (toggle again)
    act(() => {
      result.current.toggleOverlay('fileExplorer');
    });

    expect(result.current.currentOverlay).toBeNull();
  });

  it('should complete multi-level navigation flow', () => {
    const { result } = renderHook(() => useOverlayStore());

    // Level 1: In-game menu
    act(() => {
      result.current.showOverlay('inGameMenu');
    });

    // Level 2: Quick settings
    act(() => {
      result.current.showOverlay('quickSettings');
    });

    // Level 3: File explorer
    act(() => {
      result.current.showOverlay('fileExplorer');
    });

    expect(result.current.currentOverlay).toBe('fileExplorer');
    expect(result.current.previousOverlay).toBe('quickSettings');

    // Back to level 2
    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentOverlay).toBe('quickSettings');

    // Hide all
    act(() => {
      result.current.hideOverlay();
    });

    expect(result.current.currentOverlay).toBeNull();
    expect(result.current.previousOverlay).toBeNull();
  });
});
