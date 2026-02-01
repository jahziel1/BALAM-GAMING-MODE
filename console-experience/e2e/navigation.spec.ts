import { expect } from '@wdio/globals';
import { waitForTauri } from './helpers/tauri';
import {
  simulateKeyPress,
  getFocusedGameIndex,
  navigateToGame,
  openOverlay,
  closeOverlay,
} from './helpers/navigation';

describe('Keyboard Navigation', () => {
  before(async () => {
    await waitForTauri();
    // Wait for games to load
    await browser.waitUntil(
      async () => {
        const cards = await $$('.card');
        return cards.length > 0;
      },
      { timeout: 15000 }
    );
  });

  it('should navigate between games with arrow keys', async () => {
    // Get initial focused index
    const initialIndex = await getFocusedGameIndex();

    // Navigate down
    await simulateKeyPress('ArrowDown');
    await browser.pause(200);

    const newIndex = await getFocusedGameIndex();
    expect(newIndex).toBeGreaterThan(initialIndex);
  });

  it('should navigate up with ArrowUp key', async () => {
    // Navigate to game index 2 first
    await navigateToGame(2);

    // Navigate up
    await simulateKeyPress('ArrowUp');
    await browser.pause(200);

    const index = await getFocusedGameIndex();
    expect(index).toBe(1);
  });

  it('should open Quick Settings with F1 key', async () => {
    await openOverlay('F1');

    // Verify overlay is visible
    const overlay = await $('.overlay-panel');
    expect(await overlay.isDisplayed()).toBe(true);

    // Verify it shows Quick Settings title
    const title = await overlay.$('h2');
    const titleText = await title.getText();
    expect(titleText).toContain('Quick Settings');

    // Close overlay
    await closeOverlay();
  });

  it('should close overlays with Escape key', async () => {
    // Open Quick Settings
    await openOverlay('F1');

    let overlay = await $('.overlay-panel');
    expect(await overlay.isDisplayed()).toBe(true);

    // Close with Escape
    await closeOverlay();

    // Verify it's closed
    overlay = await $('.overlay-panel');
    expect(await overlay.isDisplayed()).toBe(false);
  });

  it('should open Search Overlay with Ctrl+F', async () => {
    await browser.keys(['Control', 'f']);
    await browser.pause(300);

    // Verify search overlay is visible
    const searchOverlay = await $('.search-overlay');
    expect(await searchOverlay.isDisplayed()).toBe(true);

    // Close
    await closeOverlay();
  });
});
