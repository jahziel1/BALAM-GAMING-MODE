/**
 * Helper functions for navigation testing
 */

/**
 * Simulate a keyboard key press
 */
export async function simulateKeyPress(key: string): Promise<void> {
  await browser.keys(key);
  await browser.pause(100); // Wait for key event to process
}

/**
 * Navigate to a specific game by index using arrow keys
 */
export async function navigateToGame(targetIndex: number): Promise<void> {
  const currentIndex = await browser.execute(() => {
    // @ts-expect-error - Global state access
    return window.__ACTIVE_GAME_INDEX__ || 0;
  });

  const diff = targetIndex - currentIndex;

  if (diff > 0) {
    // Navigate down
    for (let i = 0; i < diff; i++) {
      await simulateKeyPress('ArrowDown');
    }
  } else if (diff < 0) {
    // Navigate up
    for (let i = 0; i < Math.abs(diff); i++) {
      await simulateKeyPress('ArrowUp');
    }
  }
}

/**
 * Get the currently focused game index
 */
export async function getFocusedGameIndex(): Promise<number> {
  return browser.execute(() => {
    const focusedCard = document.querySelector('.card.focused');
    if (!focusedCard) return -1;

    const allCards = Array.from(document.querySelectorAll('.card'));
    return allCards.indexOf(focusedCard);
  });
}

/**
 * Get the currently focused game title
 */
export async function getFocusedGameTitle(): Promise<string | null> {
  return browser.execute(() => {
    const focusedCard = document.querySelector('.card.focused');
    if (!focusedCard) return null;

    const titleElement = focusedCard.querySelector('h3');
    return titleElement?.textContent || null;
  });
}

/**
 * Open an overlay by key press
 */
export async function openOverlay(key: string): Promise<void> {
  await simulateKeyPress(key);
  await browser.pause(300); // Wait for overlay animation
}

/**
 * Close overlay with Escape key
 */
export async function closeOverlay(): Promise<void> {
  await simulateKeyPress('Escape');
  await browser.pause(300); // Wait for overlay animation
}

/**
 * Navigate menu items with arrow keys
 */
export async function navigateMenu(direction: 'up' | 'down', times = 1): Promise<void> {
  const key = direction === 'up' ? 'ArrowUp' : 'ArrowDown';

  for (let i = 0; i < times; i++) {
    await simulateKeyPress(key);
  }
}
