/**
 * Adapter: Keyboard Event Dispatcher
 *
 * Dispatches synthetic keyboard events.
 * Used to convert gamepad inputs into keyboard events that components can listen to.
 */

import { KeyboardEventDispatcher as IKeyboardEventDispatcher } from '../../ports/InputPort';

export class KeyboardEventDispatcher implements IKeyboardEventDispatcher {
  dispatchKeyEvent(key: string, modifiers?: { shift?: boolean }): void {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      shiftKey: modifiers?.shift ?? false,
    });
    // Dispatch on the focused element so the event bubbles through the DOM tree,
    // reaching React onKeyDown handlers and native element behaviours (e.g. range sliders).
    // window.dispatchEvent() only reaches window-level listeners and is ignored by React and
    // native elements — that's why gamepad key events had no effect inside panels.
    const target = (document.activeElement as HTMLElement | null) ?? document.body;
    target.dispatchEvent(event);
  }
}
