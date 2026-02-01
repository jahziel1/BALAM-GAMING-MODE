/**
 * Unit Tests: Overlay Store
 *
 * Tests for overlay store state management.
 *
 * @module application/stores/__tests__/overlay-store.test
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useOverlayStore } from '../overlay-store';

describe('OverlayStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useOverlayStore.setState({ currentOverlay: null, previousOverlay: null });
    });
  });

  describe('showOverlay', () => {
    it('should show overlay', () => {
      const { result } = renderHook(() => useOverlayStore());

      act(() => {
        result.current.showOverlay('inGameMenu');
      });

      expect(result.current.currentOverlay).toBe('inGameMenu');
    });

    it('should track previous overlay', () => {
      const { result } = renderHook(() => useOverlayStore());

      act(() => {
        result.current.showOverlay('inGameMenu');
      });

      act(() => {
        result.current.showOverlay('quickSettings');
      });

      expect(result.current.currentOverlay).toBe('quickSettings');
      expect(result.current.previousOverlay).toBe('inGameMenu');
    });
  });

  describe('hideOverlay', () => {
    it('should hide current overlay', () => {
      const { result } = renderHook(() => useOverlayStore());

      act(() => {
        result.current.showOverlay('inGameMenu');
      });

      act(() => {
        result.current.hideOverlay();
      });

      expect(result.current.currentOverlay).toBeNull();
      expect(result.current.previousOverlay).toBeNull();
    });
  });

  describe('toggleOverlay', () => {
    it('should show overlay when hidden', () => {
      const { result } = renderHook(() => useOverlayStore());

      act(() => {
        result.current.toggleOverlay('inGameMenu');
      });

      expect(result.current.currentOverlay).toBe('inGameMenu');
    });

    it('should hide overlay when shown', () => {
      const { result } = renderHook(() => useOverlayStore());

      act(() => {
        result.current.showOverlay('inGameMenu');
      });

      act(() => {
        result.current.toggleOverlay('inGameMenu');
      });

      expect(result.current.currentOverlay).toBeNull();
    });

    it('should switch to different overlay', () => {
      const { result } = renderHook(() => useOverlayStore());

      act(() => {
        result.current.showOverlay('inGameMenu');
      });

      act(() => {
        result.current.toggleOverlay('quickSettings');
      });

      expect(result.current.currentOverlay).toBe('quickSettings');
      expect(result.current.previousOverlay).toBe('inGameMenu');
    });
  });

  describe('goBack', () => {
    it('should navigate back to previous overlay', () => {
      const { result } = renderHook(() => useOverlayStore());

      act(() => {
        result.current.showOverlay('inGameMenu');
      });

      act(() => {
        result.current.showOverlay('quickSettings');
      });

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentOverlay).toBe('inGameMenu');
      expect(result.current.previousOverlay).toBeNull();
    });

    it('should clear overlay if no previous', () => {
      const { result } = renderHook(() => useOverlayStore());

      act(() => {
        result.current.showOverlay('inGameMenu');
      });

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentOverlay).toBeNull();
    });
  });
});
