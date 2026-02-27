/**
 * Adapter: Keyboard Event Dispatcher
 *
 * Dispatches synthetic keyboard events.
 * Used to convert gamepad inputs into keyboard events that components can listen to.
 */

import { KeyboardEventDispatcher as IKeyboardEventDispatcher } from '../../ports/InputPort';

export class KeyboardEventDispatcher implements IKeyboardEventDispatcher {
  dispatchKeyEvent(key: string, modifiers?: { shift?: boolean }): void {
    const target = (document.activeElement as HTMLElement | null) ?? document.body;

    // For Enter on buttons/links: use .click() directly.
    // Tauri's WebView (Chromium) only fires button activation for trusted keyboard events
    // (isTrusted=true). Synthetic KeyboardEvent dispatches are NOT trusted, so the browser
    // won't fire a click. .click() bypasses this restriction and triggers React's onClick.
    if (key === 'Enter' && (target.tagName === 'BUTTON' || target.tagName === 'A')) {
      target.click();
      return;
    }

    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      shiftKey: modifiers?.shift ?? false,
    });
    // Dispatch on the focused element so the event bubbles through the DOM tree,
    // reaching React onKeyDown handlers and native element behaviours (e.g. range sliders).
    target.dispatchEvent(event);
  }
}
