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

/**
 * Wait for the app to be fully ready:
 * - document.readyState === 'complete'
 * - window.__STORE__ available (DEV mode store)
 */
export async function waitForApp(timeout = 20000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const ready = await browser.execute(() => {
        return (
          document.readyState === 'complete' &&
          document.body !== null &&
          (window as any).__STORE__ !== undefined
        );
      });

      if (ready) {
        await browser.pause(500);
        return;
      }
    } catch {
      // Window not ready yet
    }

    await browser.pause(300);
  }

  throw new Error('App did not become ready in time (document + __STORE__)');
}

/**
 * Wait for an ARIA dialog to appear.
 * @param label optional aria-label to match
 */
export async function waitForDialog(label?: string, timeout = 5000): Promise<WebdriverIO.Element> {
  const selector = label
    ? `[role="dialog"][aria-label="${label}"]`
    : '[role="dialog"][aria-modal="true"]';
  const el = await $(selector);
  await el.waitForDisplayed({ timeout });
  return el;
}

/**
 * Close all open overlays/dialogs by pressing Escape repeatedly
 * until no dialog is visible.
 */
export async function closeAllOverlays(maxAttempts = 5): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const hasDialog = await browser.execute(() => {
      return document.querySelector('[role="dialog"]') !== null;
    });

    if (!hasDialog) break;

    await browser.keys('Escape');
    await browser.pause(300);
  }
  await browser.pause(150);
}
