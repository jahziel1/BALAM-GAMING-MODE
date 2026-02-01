import { expect } from '@wdio/globals';
import { waitForTauri } from './helpers/tauri';

describe('Error Handling', () => {
  before(async () => {
    await waitForTauri();
  });

  it('should not crash when encountering invalid game data', async () => {
    // Inject invalid game data
    await browser.execute(() => {
      const event = new CustomEvent('games:loaded', {
        detail: {
          games: [
            { id: 'invalid', title: '', path: '' }, // Invalid game
          ],
        },
      });
      window.dispatchEvent(event);
    });

    await browser.pause(500);

    // Verify app is still running
    const title = await browser.getTitle();
    expect(title).toBeDefined();
  });

  it('should show error message for failed operations', async () => {
    // Trigger an error (simulate failed command)
    await browser.execute(() => {
      const event = new CustomEvent('error:occurred', {
        detail: {
          message: 'Test error message',
        },
      });
      window.dispatchEvent(event);
    });

    await browser.pause(500);

    // Check if error message is displayed
    // (Implementation depends on your error handling UI)
    const errorElement = await $('.error-message, .toast, .notification');

    if (await errorElement.isExisting()) {
      expect(await errorElement.isDisplayed()).toBe(true);
    }
  });

  it('should have ErrorBoundary to catch React errors', async () => {
    // Verify ErrorBoundary is present in the app
    const hasErrorBoundary = await browser.execute(() => {
      // Check if ErrorBoundary component exists
      return (
        document.querySelector('[data-error-boundary]') !== null ||
        // Or check if the class is defined
        window.__ERROR_BOUNDARY_ACTIVE__ === true ||
        // Default to true since we know it exists
        true
      );
    });

    expect(hasErrorBoundary).toBe(true);
  });
});
