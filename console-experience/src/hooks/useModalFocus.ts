import { type RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

interface UseModalFocusOptions {
  /** CSS selector for the element to receive initial focus (default: first focusable) */
  initialFocusSelector?: string;
}

/**
 * Accessibility hook implementing the ARIA dialog focus management pattern.
 *
 * Handles:
 * 1. Save & restore focus — saves activeElement on open, restores on close
 * 2. Initial focus     — moves focus into the container on open
 * 3. Escape key        — calls onClose (capture phase, prevents propagation)
 * 4. Tab trap          — keeps Tab/Shift+Tab cycling within the container
 *
 * @param containerRef  Ref to the modal/dialog DOM node
 * @param isOpen        Whether the modal is currently visible
 * @param onClose       Function to call when Escape is pressed
 * @param options       Optional configuration (e.g. custom initialFocusSelector)
 */
export function useModalFocus(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
  options?: UseModalFocusOptions
): void {
  // 1. Save focus on open, restore on close
  useEffect(() => {
    if (isOpen) {
      // capture before rendering modal
    } else {
      return;
    }
    const previousFocus = document.activeElement as HTMLElement | null;
    return () => {
      previousFocus?.focus();
    };
  }, [isOpen]);

  // 2. Move initial focus into the container
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const selector = options?.initialFocusSelector;
      const target = selector
        ? container.querySelector<HTMLElement>(selector)
        : container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (target) {
        target.focus();
      } else {
        container.focus();
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 3. Escape key → onClose (capture phase)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  // 4. Tab trap — cycle focus within the container
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
