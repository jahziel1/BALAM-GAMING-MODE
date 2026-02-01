/**
 * Property Tests: Overlay Store
 *
 * Property-based tests for overlay store using fast-check.
 *
 * @module tests/property/overlay-store.property.test
 */

import { type OverlayType, useOverlayStore } from '@application/stores/overlay-store';
import { act, renderHook } from '@testing-library/react';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

describe('Property: Overlay Store', () => {
  const overlayTypeArbitrary = fc.constantFrom(
    'inGameMenu' as const,
    'quickSettings' as const,
    'fileExplorer' as const,
    'virtualKeyboard' as const,
    'search' as const
  );

  it('should always have a current overlay after showing any overlay', () => {
    fc.assert(
      fc.property(
        fc.array(overlayTypeArbitrary, { minLength: 1, maxLength: 10 }),
        (overlays: OverlayType[]) => {
          const { result } = renderHook(() => useOverlayStore());

          // Reset state
          act(() => {
            useOverlayStore.setState({
              currentOverlay: null,
              previousOverlay: null,
            });
          });

          // Show overlays in sequence
          overlays.forEach((overlay) => {
            act(() => {
              result.current.showOverlay(overlay);
            });
          });

          // Should have a current overlay (the last one shown)
          const lastOverlay = overlays[overlays.length - 1];
          expect(result.current.currentOverlay).toBe(lastOverlay);
        }
      )
    );
  });

  it('should always clear both overlays when hiding', () => {
    fc.assert(
      fc.property(overlayTypeArbitrary, (overlay: OverlayType) => {
        const { result } = renderHook(() => useOverlayStore());

        act(() => {
          result.current.showOverlay(overlay);
        });

        act(() => {
          result.current.hideOverlay();
        });

        expect(result.current.currentOverlay).toBeNull();
        expect(result.current.previousOverlay).toBeNull();
      })
    );
  });

  it('should toggle consistently: show → hide → show', () => {
    fc.assert(
      fc.property(overlayTypeArbitrary, (overlay: OverlayType) => {
        const { result } = renderHook(() => useOverlayStore());

        // Reset state
        act(() => {
          useOverlayStore.setState({
            currentOverlay: null,
            previousOverlay: null,
          });
        });

        // First toggle: show
        act(() => {
          result.current.toggleOverlay(overlay);
        });

        expect(result.current.currentOverlay).toBe(overlay);

        // Second toggle: hide
        act(() => {
          result.current.toggleOverlay(overlay);
        });

        expect(result.current.currentOverlay).toBeNull();

        // Third toggle: show again
        act(() => {
          result.current.toggleOverlay(overlay);
        });

        expect(result.current.currentOverlay).toBe(overlay);
      })
    );
  });

  it('should track previous overlay correctly after navigation', () => {
    fc.assert(
      fc.property(
        overlayTypeArbitrary,
        overlayTypeArbitrary,
        (overlay1: OverlayType, overlay2: OverlayType) => {
          const { result } = renderHook(() => useOverlayStore());

          // Reset state
          act(() => {
            useOverlayStore.setState({
              currentOverlay: null,
              previousOverlay: null,
            });
          });

          // Show first overlay
          act(() => {
            result.current.showOverlay(overlay1);
          });

          // Show second overlay
          act(() => {
            result.current.showOverlay(overlay2);
          });

          if (overlay1 !== overlay2) {
            expect(result.current.currentOverlay).toBe(overlay2);
            expect(result.current.previousOverlay).toBe(overlay1);
          }
        }
      )
    );
  });

  it('should handle goBack idempotently when no previous overlay', () => {
    fc.assert(
      fc.property(overlayTypeArbitrary, (overlay: OverlayType) => {
        const { result } = renderHook(() => useOverlayStore());

        // Show overlay without previous
        act(() => {
          useOverlayStore.setState({
            currentOverlay: overlay,
            previousOverlay: null,
          });
        });

        // Go back
        act(() => {
          result.current.goBack();
        });

        expect(result.current.currentOverlay).toBeNull();
        expect(result.current.previousOverlay).toBeNull();
      })
    );
  });
});
