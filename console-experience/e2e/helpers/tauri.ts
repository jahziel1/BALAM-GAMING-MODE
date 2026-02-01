/**
 * Helper functions for Tauri testing
 */

/**
 * Wait for Tauri window to be ready
 */
export async function waitForTauri(timeout = 15000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      // Check if document is ready and has content
      const ready = await browser.execute(() => {
        // Check if __TAURI__ exists OR if the document has loaded with content
        return (
          window.__TAURI__ !== undefined ||
          (document.readyState === 'complete' && document.body !== null)
        );
      });

      if (ready) {
        // Additional wait for React/app initialization
        await browser.pause(1000);
        return;
      }
    } catch (error) {
      // Window not ready yet
    }

    await browser.pause(200);
  }

  throw new Error('Tauri window did not become ready in time');
}

/**
 * Invoke a Tauri command from the frontend
 */
export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  return browser.execute(
    (cmd, cmdArgs) => {
      // @ts-expect-error - Tauri API is injected
      return window.__TAURI__.invoke(cmd, cmdArgs);
    },
    command,
    args
  );
}

/**
 * Get the current window label
 */
export async function getWindowLabel(): Promise<string> {
  return browser.execute(() => {
    // @ts-expect-error - Tauri API is injected
    return window.__TAURI__.window.getCurrent().label;
  });
}

/**
 * Wait for an element to be visible
 */
export async function waitForElement(
  selector: string,
  timeout = 5000
): Promise<WebdriverIO.Element> {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout });
  return element;
}

/**
 * Wait for text to appear in an element
 */
export async function waitForText(selector: string, text: string, timeout = 5000): Promise<void> {
  const element = await $(selector);
  await browser.waitUntil(
    async () => {
      const elementText = await element.getText();
      return elementText.includes(text);
    },
    { timeout, timeoutMsg: `Text "${text}" did not appear in ${selector}` }
  );
}
