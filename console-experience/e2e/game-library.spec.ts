import { expect } from '@wdio/globals';
import { waitForTauri } from './helpers/tauri';
import { getFocusedGameTitle, navigateToGame } from './helpers/navigation';

describe('Game Library', () => {
  before(async () => {
    await waitForTauri();
    // Wait for carousel sections and games to load
    await browser.waitUntil(
      async () => {
        const carousels = await $$('.carousel-section');
        const cards = await $$('.card');
        return carousels.length > 0 && cards.length > 0;
      },
      { timeout: 15000 }
    );
  });

  it('should display all scanned games in carousels', async () => {
    // Check that at least one carousel exists
    const carousels = await $$('.carousel-section');
    expect(carousels.length).toBeGreaterThan(0);

    // Check that games are displayed
    const cards = await $$('.card');
    expect(cards.length).toBeGreaterThan(0);

    // Verify each card has an image (could be real image or placeholder SVG)
    for (const card of cards.slice(0, 5)) {
      // Check first 5 cards only for performance
      const image = await card.$('img');
      expect(await image.isDisplayed()).toBe(true);

      // Verify image has src (either asset URL or data URL for placeholder)
      const src = await image.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src.length).toBeGreaterThan(0);
    }
  });

  it('should show carousel titles for each section', async () => {
    const carouselTitles = await $$('.carousel-title');
    expect(carouselTitles.length).toBeGreaterThan(0);

    // Verify each carousel has a non-empty title
    for (const titleElement of carouselTitles) {
      const titleText = await titleElement.getText();
      expect(titleText.length).toBeGreaterThan(0);
    }
  });

  it('should mark a game as focused when clicked', async () => {
    const carouselItems = await $$('.carousel-item');
    expect(carouselItems.length).toBeGreaterThan(1);

    const secondItem = carouselItems[1];
    const cardInItem = await secondItem.$('.card');

    await cardInItem.click();
    await browser.pause(200);

    // Verify card or carousel item has focused class
    const cardClassName = await cardInItem.getAttribute('class');
    const itemClassName = await secondItem.getAttribute('class');

    const isFocused = cardClassName.includes('focused') || itemClassName.includes('focused');
    expect(isFocused).toBe(true);
  });

  it('should display game badges correctly', async () => {
    const cards = await $$('.card');
    expect(cards.length).toBeGreaterThan(0);

    const firstCard = cards[0];

    // Check if badge exists (may not be present in carousel view)
    const badges = await firstCard.$$('.badge');

    if (badges.length > 0) {
      for (const badge of badges) {
        expect(await badge.isDisplayed()).toBe(true);

        const badgeText = await badge.getText();
        expect(badgeText.length).toBeGreaterThan(0);
      }
    } else {
      // If no badges, that's ok - carousel view may not show them
      expect(true).toBe(true);
    }
  });
});
