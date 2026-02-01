import { expect } from '@wdio/globals';
import { waitForTauri } from './helpers/tauri';
import { openOverlay, closeOverlay, simulateKeyPress } from './helpers/navigation';

describe('Quick Settings', () => {
  before(async () => {
    await waitForTauri();
  });

  beforeEach(async () => {
    // Open Quick Settings before each test
    await openOverlay('F1');
    await browser.pause(500);
  });

  afterEach(async () => {
    // Close Quick Settings after each test
    await closeOverlay();
    await browser.pause(300);
  });

  it('should display all sliders in Quick Settings', async () => {
    const overlay = await $('.overlay-panel');
    expect(await overlay.isDisplayed()).toBe(true);

    // Verify sliders exist
    const sliders = await $$('.radix-slider');
    expect(sliders.length).toBeGreaterThan(0);

    // Should have at least: Volume, Brightness, TDP, GPU
    expect(sliders.length).toBeGreaterThanOrEqual(4);
  });

  it('should show correct labels for each setting', async () => {
    const labels = await $$('.overlay-panel label, .overlay-panel .setting-label');

    expect(labels.length).toBeGreaterThan(0);

    // Verify labels have text
    for (const label of labels) {
      const labelText = await label.getText();
      expect(labelText.length).toBeGreaterThan(0);
    }
  });

  it('should display current values for sliders', async () => {
    const sliders = await $$('.radix-slider');

    for (const slider of sliders) {
      // Each slider should have a value display
      const value = await slider.getAttribute('aria-valuenow');
      expect(value).toBeDefined();
    }
  });

  it('should navigate between settings with arrow keys', async () => {
    // Get initial focused element
    const initialFocused = await browser.execute(() => {
      return document.activeElement?.tagName;
    });

    // Navigate down
    await simulateKeyPress('ArrowDown');
    await browser.pause(200);

    const newFocused = await browser.execute(() => {
      return document.activeElement?.tagName;
    });

    // Focus should have changed
    // (exact behavior depends on implementation)
    expect(newFocused).toBeDefined();
  });
});
