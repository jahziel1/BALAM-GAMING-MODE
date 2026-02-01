import { expect } from '@wdio/globals';
import { waitForTauri, waitForElement } from './helpers/tauri';

describe('Application Launch', () => {
  before(async () => {
    // Wait for Tauri to be ready
    await waitForTauri();
  });

  it('should launch the application successfully', async () => {
    // Verify window exists
    const title = await browser.getTitle();
    expect(title).toContain('Console Experience');
  });

  it('should display the hero section', async () => {
    // Wait for hero section to be visible
    const heroSection = await waitForElement('.hero-section', 10000);
    expect(await heroSection.isDisplayed()).toBe(true);
  });

  it('should load at least one game', async () => {
    // Wait for game cards to load
    await browser.waitUntil(
      async () => {
        const cards = await $$('.card');
        return cards.length > 0;
      },
      {
        timeout: 15000,
        timeoutMsg: 'No games were loaded',
      }
    );

    const cards = await $$('.card');
    expect(cards.length).toBeGreaterThan(0);
  });
});
