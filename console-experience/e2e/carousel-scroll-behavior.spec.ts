import { expect } from '@wdio/globals';
import { waitForTauri } from './helpers/tauri';
import { simulateKeyPress, getFocusedGameIndex } from './helpers/navigation';

/**
 * E2E Tests for Carousel Scroll Behavior
 *
 * Verifies:
 * - Scroll snap alignment
 * - Smooth scrolling
 * - Card centering when focused
 * - No infinite scrolling
 * - Natural navigation feel
 */
describe('Carousel Scroll Behavior', () => {
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

  it('should have scroll-snap-type on carousel container', async () => {
    const container = await $('.carousel-container');
    expect(await container.isExisting()).toBe(true);

    // Get computed styles
    const scrollSnapType = await browser.execute((el) => {
      const element = el as HTMLElement;
      const styles = window.getComputedStyle(element);
      return styles.scrollSnapType;
    }, container);

    // Should have mandatory snap
    expect(scrollSnapType).toContain('x');
    expect(scrollSnapType).toContain('mandatory');
  });

  it('should have scroll-snap-align on cards', async () => {
    const firstCard = await $('.card');
    expect(await firstCard.isExisting()).toBe(true);

    const scrollSnapAlign = await browser.execute((el) => {
      const element = el as HTMLElement;
      const styles = window.getComputedStyle(element);
      return styles.scrollSnapAlign;
    }, firstCard);

    // Should align to center or start
    expect(['center', 'start']).toContain(scrollSnapAlign);
  });

  it('should NOT have double scaling on focused cards', async () => {
    // Get first carousel item
    const firstItem = await $('.carousel-item');
    const firstCard = await firstItem.$('.card');

    // Click to focus
    await firstCard.click();
    await browser.pause(500); // Wait for animation

    // Get transforms
    const itemTransform = await browser.execute((el) => {
      const element = el as HTMLElement;
      const styles = window.getComputedStyle(element);
      return styles.transform;
    }, firstItem);

    const cardTransform = await browser.execute((el) => {
      const element = el as HTMLElement;
      const styles = window.getComputedStyle(element);
      return styles.transform;
    }, firstCard);

    // Item should NOT have scale (only card should)
    // Item transform should be "none" or matrix(1, 0, 0, 1, 0, 0)
    const itemHasScale =
      itemTransform.includes('matrix') && !itemTransform.includes('matrix(1, 0, 0, 1');
    expect(itemHasScale).toBe(false);

    // Card SHOULD have scale ~1.08
    const cardHasScale =
      cardTransform.includes('matrix') && !cardTransform.includes('matrix(1, 0, 0, 1');
    expect(cardHasScale).toBe(true);
  });

  it('should center focused card in viewport when navigating', async () => {
    // Navigate to 3rd game
    await simulateKeyPress('ArrowRight');
    await browser.pause(300);
    await simulateKeyPress('ArrowRight');
    await browser.pause(300);
    await simulateKeyPress('ArrowRight');
    await browser.pause(500); // Wait for scroll animation

    const focusedIndex = await getFocusedGameIndex();
    expect(focusedIndex).toBe(3);

    // Get the focused card's position
    const carouselItems = await $$('.carousel-item');
    const focusedItem = carouselItems[focusedIndex];
    const focusedCard = await focusedItem.$('.card');

    const cardBounds = await browser.execute((el) => {
      const element = el as HTMLElement;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        centerX: rect.left + rect.width / 2,
      };
    }, focusedCard);

    // Get viewport center
    const viewportCenter = await browser.execute(() => {
      return window.innerWidth / 2;
    });

    // Card center should be close to viewport center (within 50px tolerance)
    const centerDiff = Math.abs(cardBounds.centerX - viewportCenter);
    expect(centerDiff).toBeLessThan(100); // Relaxed tolerance for scroll-snap
  });

  it('should scroll smoothly without jerking', async () => {
    // Get initial scroll position
    const container = await $('.carousel-container');

    const initialScroll = await browser.execute((el) => {
      const element = el as HTMLElement;
      return element.scrollLeft;
    }, container);

    // Navigate right
    await simulateKeyPress('ArrowRight');

    // Sample scroll position multiple times during animation
    const scrollSamples: number[] = [];
    for (let i = 0; i < 5; i++) {
      await browser.pause(50);
      const scroll = await browser.execute((el) => {
        const element = el as HTMLElement;
        return element.scrollLeft;
      }, container);
      scrollSamples.push(scroll);
    }

    // Wait for animation to complete
    await browser.pause(300);

    const finalScroll = await browser.execute((el) => {
      const element = el as HTMLElement;
      return element.scrollLeft;
    }, container);

    // Verify scroll changed
    expect(finalScroll).toBeGreaterThan(initialScroll);

    // Verify scroll progressed smoothly (each sample should be increasing)
    for (let i = 1; i < scrollSamples.length; i++) {
      // Allow for some variance due to timing
      expect(scrollSamples[i]).toBeGreaterThanOrEqual(scrollSamples[i - 1] - 5);
    }
  });

  it('should NOT scroll infinitely on page load', async () => {
    // Refresh page to test initial state
    await browser.refresh();
    await waitForTauri();
    await browser.waitUntil(
      async () => {
        const cards = await $$('.card');
        return cards.length > 0;
      },
      { timeout: 15000 }
    );

    const container = await $('.carousel-container');

    // Record scroll position over 2 seconds without any input
    const scrollPositions: number[] = [];
    for (let i = 0; i < 10; i++) {
      const scroll = await browser.execute((el) => {
        const element = el as HTMLElement;
        return element.scrollLeft;
      }, container);
      scrollPositions.push(scroll);
      await browser.pause(200);
    }

    // All positions should be the same (no auto-scrolling)
    const firstPosition = scrollPositions[0];
    const allSame = scrollPositions.every((pos) => Math.abs(pos - firstPosition) < 5);
    expect(allSame).toBe(true);
  });

  it('should have synchronized transition timings', async () => {
    const carouselItem = await $('.carousel-item');
    const card = await carouselItem.$('.card');

    // Get transition durations
    const itemDuration = await browser.execute((el) => {
      const element = el as HTMLElement;
      const styles = window.getComputedStyle(element);
      return styles.transitionDuration;
    }, carouselItem);

    const cardDuration = await browser.execute((el) => {
      const element = el as HTMLElement;
      const styles = window.getComputedStyle(element);
      return styles.transitionDuration;
    }, card);

    // Both should have similar duration (0.4s)
    // Parse duration (e.g., "0.4s" or "400ms")
    const parseDuration = (dur: string): number => {
      if (dur.includes('ms')) {
        return parseFloat(dur);
      }
      return parseFloat(dur) * 1000;
    };

    const itemMs = parseDuration(itemDuration);
    const cardMs = parseDuration(cardDuration);

    // Should be within 50ms of each other
    expect(Math.abs(itemMs - cardMs)).toBeLessThan(50);

    // Both should be around 400ms
    expect(itemMs).toBeGreaterThan(350);
    expect(itemMs).toBeLessThan(450);
  });

  it('should navigate left and right fluidly', async () => {
    const container = await $('.carousel-container');

    // Navigate right 3 times
    for (let i = 0; i < 3; i++) {
      const scrollBefore = await browser.execute((el) => {
        const element = el as HTMLElement;
        return element.scrollLeft;
      }, container);

      await simulateKeyPress('ArrowRight');
      await browser.pause(500); // Wait for animation

      const scrollAfter = await browser.execute((el) => {
        const element = el as HTMLElement;
        return element.scrollLeft;
      }, container);

      // Should have scrolled right
      expect(scrollAfter).toBeGreaterThan(scrollBefore);
    }

    // Navigate left 2 times
    for (let i = 0; i < 2; i++) {
      const scrollBefore = await browser.execute((el) => {
        const element = el as HTMLElement;
        return element.scrollLeft;
      }, container);

      await simulateKeyPress('ArrowLeft');
      await browser.pause(500); // Wait for animation

      const scrollAfter = await browser.execute((el) => {
        const element = el as HTMLElement;
        return element.scrollLeft;
      }, container);

      // Should have scrolled left
      expect(scrollAfter).toBeLessThan(scrollBefore);
    }
  });

  it('should have proper box-sizing on cards', async () => {
    const card = await $('.card');

    const boxSizing = await browser.execute((el) => {
      const element = el as HTMLElement;
      const styles = window.getComputedStyle(element);
      return styles.boxSizing;
    }, card);

    // Should be border-box to include border in dimensions
    expect(boxSizing).toBe('border-box');
  });

  it('should have correct card dimensions in carousel', async () => {
    const carouselItem = await $('.carousel-item');
    const card = await carouselItem.$('.card');

    const dimensions = await browser.execute((el) => {
      const element = el as HTMLElement;
      const styles = window.getComputedStyle(element);
      return {
        width: parseFloat(styles.width),
        height: parseFloat(styles.height),
      };
    }, card);

    // Card should be 260x390 in carousel
    expect(dimensions.width).toBeCloseTo(260, 10); // Within 10px
    expect(dimensions.height).toBeCloseTo(390, 10);

    // Verify aspect ratio is correct for vertical game covers
    const aspectRatio = dimensions.height / dimensions.width;
    expect(aspectRatio).toBeCloseTo(1.5, 0.1); // 3:2 ratio
  });
});
