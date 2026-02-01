import { expect } from '@wdio/globals';
import { waitForTauri } from './helpers/tauri';

/**
 * Screenshot tests - Capture visual state of the application
 */
describe('Visual Regression - Screenshots', () => {
  before(async () => {
    await waitForTauri();
    // Give extra time for app to fully load
    await browser.pause(2000);
  });

  it('should capture home screen', async () => {
    // Wait for page to be ready
    await browser.pause(1000);

    // Take full page screenshot
    await browser.saveScreenshot('./e2e/screenshots/baseline/01-home-screen.png');

    // Verify screenshot was taken
    const title = await browser.getTitle();
    expect(title).toBeDefined();
  });

  it('should capture application state after load', async () => {
    // Wait a bit more for any async loading
    await browser.pause(1500);

    // Capture current state
    await browser.saveScreenshot('./e2e/screenshots/baseline/02-app-loaded.png');

    // Check if body exists
    const body = await $('body');
    expect(await body.isExisting()).toBe(true);
  });

  it('should capture main layout', async () => {
    // Try to find and capture main content
    await browser.pause(1000);

    // Full screenshot
    await browser.saveScreenshot('./e2e/screenshots/baseline/03-main-layout.png');

    // Verify we have some content
    const html = await browser.execute(() => {
      return document.body.innerHTML.length;
    });

    expect(html).toBeGreaterThan(0);
  });

  it('should capture window dimensions', async () => {
    // Get window size
    const size = await browser.getWindowSize();
    console.log('Window size:', size);

    // Screenshot with dimensions
    await browser.saveScreenshot('./e2e/screenshots/baseline/04-window-size.png');

    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });

  it('should capture document structure', async () => {
    // Get page structure info
    const structure = await browser.execute(() => {
      return {
        hasBody: document.body !== null,
        bodyClasses: document.body?.className || '',
        childCount: document.body?.children.length || 0,
      };
    });

    console.log('Page structure:', structure);

    // Final screenshot
    await browser.saveScreenshot('./e2e/screenshots/baseline/05-document-structure.png');

    expect(structure.hasBody).toBe(true);
  });
});
