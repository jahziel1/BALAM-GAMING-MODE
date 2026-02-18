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
    window.dispatchEvent(event);
  }
}
