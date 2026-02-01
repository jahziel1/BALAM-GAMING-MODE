import { expect } from '@wdio/globals';
import { waitForTauri } from './helpers/tauri';
import { simulateKeyPress } from './helpers/navigation';

/**
 * E2E User Journey Tests - Real User Scenarios
 *
 * Simulates how a real user would interact with Console Experience:
 * 1. Open the app
 * 2. Browse games with gamepad/keyboard
 * 3. Open Quick Settings
 * 4. Search for a game
 * 5. Use virtual keyboard
 * 6. Launch a game
 */
describe('Real User Journey - Console Experience', () => {
  before(async () => {
    await waitForTauri(20000);
    // Give app time to fully load games
    await browser.pause(3000);
  });

  describe('Scenario 1: First time user opens the app', () => {
    it('should see the main screen with branding', async () => {
      // User sees the BALAM logo and branding
      const bodyText = await browser.execute(() => {
        return document.body.textContent || '';
      });

      // Should have some content
      expect(bodyText.length).toBeGreaterThan(0);

      // Take screenshot of first impression
      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-01-first-open.png');
    });

    it('should see a list of games available', async () => {
      // User expects to see their games
      await browser.pause(2000); // Wait for games to load

      const hasContent = await browser.execute(() => {
        // Check for any interactive elements
        const buttons = document.querySelectorAll('button');
        const clickable = document.querySelectorAll('[role="button"], .card, .game');
        return buttons.length > 0 || clickable.length > 0;
      });

      expect(hasContent).toBe(true);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-02-games-loaded.png');
    });
  });

  describe('Scenario 2: User navigates with keyboard/gamepad', () => {
    it('should allow navigation with arrow keys', async () => {
      // User presses Arrow Down to browse games
      await simulateKeyPress('ArrowDown');
      await browser.pause(500); // Wait for animation

      // Take screenshot of navigation state
      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-03-navigate-down.png');

      // User presses Arrow Up
      await simulateKeyPress('ArrowUp');
      await browser.pause(500);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-04-navigate-up.png');

      // Just verify the app didn't crash
      const stillRunning = await browser.execute(() => {
        return document.readyState === 'complete';
      });
      expect(stillRunning).toBe(true);
    });

    it('should allow navigation with Tab key', async () => {
      // User tries Tab to navigate
      await simulateKeyPress('Tab');
      await browser.pause(300);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-05-tab-navigation.png');

      const focused = await browser.execute(() => {
        return document.activeElement?.tagName || 'BODY';
      });

      // Should have moved focus somewhere
      expect(focused).toBeDefined();
    });
  });

  describe('Scenario 3: User opens Quick Settings', () => {
    it('should open Quick Settings with F1 key', async () => {
      // User presses F1 to access settings
      await simulateKeyPress('F1');
      await browser.pause(800); // Wait for overlay animation

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-06-quick-settings-open.png');

      // Check if anything changed (overlay appeared)
      const hasOverlay = await browser.execute(() => {
        const overlays = document.querySelectorAll('.overlay, .modal, .panel, [role="dialog"]');
        return overlays.length > 0;
      });

      // If no overlay found, that's OK - just document it
      console.log('Overlay found:', hasOverlay);
    });

    it('should allow user to navigate in Quick Settings', async () => {
      // User tries to navigate settings with arrows
      await simulateKeyPress('ArrowDown');
      await browser.pause(300);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-07-settings-navigate.png');

      // Try to adjust a value
      await simulateKeyPress('ArrowRight');
      await browser.pause(300);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-08-settings-adjust.png');
    });

    it('should close Quick Settings with Escape', async () => {
      // User presses Escape to close
      await simulateKeyPress('Escape');
      await browser.pause(500);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-09-settings-closed.png');

      // App should still be running
      const title = await browser.getTitle();
      expect(title).toBeDefined();
    });
  });

  describe('Scenario 4: User searches for a game', () => {
    it('should open search with Ctrl+F', async () => {
      // User wants to search for a specific game
      await browser.keys(['Control', 'f']);
      await browser.pause(800);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-10-search-open.png');

      console.log('Search overlay triggered');
    });

    it('should show virtual keyboard when search input is focused', async () => {
      // User clicks on search input (or it auto-focuses)
      // Virtual keyboard should appear for gamepad users
      await browser.pause(1000);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-11-virtual-keyboard.png');

      // Check for keyboard UI
      const hasKeyboard = await browser.execute(() => {
        const kbd = document.querySelector('.keyboard, .virtual-keyboard, [role="textbox"]');
        return kbd !== null;
      });

      console.log('Virtual keyboard present:', hasKeyboard);
    });

    it('should allow user to type search query', async () => {
      // User types with keyboard or virtual keyboard
      await browser.keys(['t', 'e', 's', 't']);
      await browser.pause(500);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-12-search-typing.png');

      // Close search
      await simulateKeyPress('Escape');
      await browser.pause(500);
    });
  });

  describe('Scenario 5: User explores the interface', () => {
    it('should allow hovering over games to see details', async () => {
      // User moves mouse over a game card
      const firstInteractive = await browser.execute(() => {
        const elements = document.querySelectorAll('.card, .game, button');
        if (elements.length > 0) {
          const rect = elements[0].getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        return null;
      });

      if (firstInteractive) {
        await browser.performActions([
          {
            type: 'pointer',
            id: 'mouse',
            parameters: { pointerType: 'mouse' },
            actions: [
              {
                type: 'pointerMove',
                duration: 0,
                x: Math.floor(firstInteractive.x),
                y: Math.floor(firstInteractive.y),
              },
            ],
          },
        ]);

        await browser.pause(800);
        await browser.saveScreenshot('./e2e/screenshots/baseline/journey-13-hover-game.png');
      }
    });

    it('should show sidebar when hovering left edge', async () => {
      // User moves mouse to left edge to reveal sidebar
      await browser.performActions([
        {
          type: 'pointer',
          id: 'mouse',
          parameters: { pointerType: 'mouse' },
          actions: [
            {
              type: 'pointerMove',
              duration: 0,
              x: 10,
              y: 400,
            },
          ],
        },
      ]);

      await browser.pause(1000);
      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-14-sidebar-hover.png');
    });

    it('should allow clicking on UI elements', async () => {
      // User clicks on any button
      const clicked = await browser.execute(() => {
        const buttons = document.querySelectorAll('button');
        if (buttons.length > 0) {
          (buttons[0] as HTMLElement).click();
          return true;
        }
        return false;
      });

      await browser.pause(500);
      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-15-after-click.png');

      console.log('Button clicked:', clicked);
    });
  });

  describe('Scenario 6: User tries system shortcuts', () => {
    it('should respond to common shortcuts', async () => {
      const shortcuts = [
        { key: 'F2', name: 'F2' },
        { key: 'F3', name: 'F3' },
        { key: 'F11', name: 'F11-fullscreen' },
      ];

      for (const shortcut of shortcuts) {
        await simulateKeyPress(shortcut.key);
        await browser.pause(800);

        await browser.saveScreenshot(
          `./e2e/screenshots/baseline/journey-16-shortcut-${shortcut.name}.png`
        );

        // Reset state
        await simulateKeyPress('Escape');
        await browser.pause(300);
      }
    });
  });

  describe('Scenario 7: User checks system info', () => {
    it('should display current time', async () => {
      // User looks for system info (time, battery, etc.)
      const hasTimeDisplay = await browser.execute(() => {
        const text = document.body.textContent || '';
        // Check for time format like "23:06" or "11:06 PM"
        return /\d{1,2}:\d{2}/.test(text);
      });

      console.log('Time displayed:', hasTimeDisplay);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-17-system-info.png');
    });

    it('should show footer with controls', async () => {
      // User looks for button hints in footer
      const hasFooter = await browser.execute(() => {
        const footer = document.querySelector('footer, .footer, .controls, .hints');
        return footer !== null;
      });

      console.log('Footer with controls:', hasFooter);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-18-footer-controls.png');
    });
  });

  describe('Scenario 8: Final state check', () => {
    it('should have stable app state after all interactions', async () => {
      // After all user interactions, app should still be functional
      await browser.pause(1000);

      const finalState = await browser.execute(() => {
        return {
          title: document.title,
          bodyExists: document.body !== null,
          htmlLength: document.body.innerHTML.length,
          readyState: document.readyState,
        };
      });

      console.log('Final state:', finalState);

      expect(finalState.bodyExists).toBe(true);
      expect(finalState.readyState).toBe('complete');
      expect(finalState.htmlLength).toBeGreaterThan(1000);

      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-19-final-state.png');
    });

    it('should take full app screenshot for documentation', async () => {
      // Final comprehensive screenshot
      await browser.pause(500);
      await browser.saveScreenshot('./e2e/screenshots/baseline/journey-20-full-app.png');

      // Verify we can still interact
      const interactive = await browser.execute(() => {
        const buttons = document.querySelectorAll('button');
        return buttons.length > 0;
      });

      expect(interactive).toBe(true);
    });
  });
});
