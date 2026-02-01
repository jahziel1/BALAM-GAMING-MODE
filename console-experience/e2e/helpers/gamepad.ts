/**
 * Helper functions for simulating gamepad input
 * Note: WebDriver doesn't have native gamepad support,
 * so we simulate gamepad events through JavaScript
 */

/**
 * Simulate a gamepad button press
 */
export async function simulateGamepadButton(buttonIndex: number): Promise<void> {
  await browser.execute((btnIndex) => {
    // Create a synthetic gamepad event
    const event = new CustomEvent('gamepad:button', {
      detail: { button: btnIndex, pressed: true },
    });
    window.dispatchEvent(event);
  }, buttonIndex);

  await browser.pause(100);
}

/**
 * Simulate D-Pad input
 */
export async function simulateDPad(direction: 'up' | 'down' | 'left' | 'right'): Promise<void> {
  await browser.execute((dir) => {
    const event = new CustomEvent('gamepad:dpad', {
      detail: { direction: dir },
    });
    window.dispatchEvent(event);
  }, direction);

  await browser.pause(100);
}

/**
 * Simulate gamepad A button (typically Enter/Select)
 */
export async function pressGamepadA(): Promise<void> {
  await simulateGamepadButton(0); // A button is typically index 0
}

/**
 * Simulate gamepad B button (typically Back/Cancel)
 */
export async function pressGamepadB(): Promise<void> {
  await simulateGamepadButton(1); // B button is typically index 1
}

/**
 * Simulate gamepad X button
 */
export async function pressGamepadX(): Promise<void> {
  await simulateGamepadButton(2);
}

/**
 * Simulate gamepad Y button
 */
export async function pressGamepadY(): Promise<void> {
  await simulateGamepadButton(3);
}

/**
 * Simulate Guide button (Xbox button)
 */
export async function pressGuideButton(): Promise<void> {
  await simulateGamepadButton(16); // Guide button is typically index 16
}

/**
 * Check if gamepad is connected (from app's perspective)
 */
export async function isGamepadConnected(): Promise<boolean> {
  return browser.execute(() => {
    // @ts-expect-error - Global state access
    return window.__GAMEPAD_CONNECTED__ === true;
  });
}
