/* eslint-disable */
// WebdriverIO globals (browser, $, $$) provided by framework

describe('Overlay Panels - Visual Regression', () => {
  before(async () => {
    // Wait for app to fully load
    await browser.pause(2000);
  });

  describe('InGameMenu Overlay', () => {
    it('should match baseline when opened', async () => {
      // Open InGameMenu (Home button)
      await browser.keys(['Home']);
      await browser.pause(500); // Wait for animation

      await browser.checkScreen('in-game-menu-open');
    });

    it('should match baseline when closed', async () => {
      // Close InGameMenu (Escape)
      await browser.keys(['Escape']);
      await browser.pause(500); // Wait for animation

      await browser.checkScreen('in-game-menu-closed');
    });
  });

  describe('SettingsPanel Overlay', () => {
    it('should match baseline when opened', async () => {
      // Open Settings (F11 or settings button)
      await browser.keys(['F11']);
      await browser.pause(500);

      await browser.checkScreen('settings-panel-open');
    });

    it('should match baseline with Performance tab', async () => {
      await browser.$('[data-testid="settings-tab-performance"]').click();
      await browser.pause(300);

      await browser.checkScreen('settings-panel-performance-tab');
    });

    it('should match baseline with Display tab', async () => {
      await browser.$('[data-testid="settings-tab-display"]').click();
      await browser.pause(300);

      await browser.checkScreen('settings-panel-display-tab');
    });

    it('should match baseline when closed', async () => {
      await browser.keys(['Escape']);
      await browser.pause(500);

      await browser.checkScreen('settings-panel-closed');
    });
  });

  describe('QuickSettings Overlay', () => {
    it('should match baseline when opened', async () => {
      // Open QuickSettings (QAM button)
      await browser.keys(['F10']);
      await browser.pause(500);

      await browser.checkScreen('quick-settings-open');
    });

    it('should match baseline when closed', async () => {
      await browser.keys(['Escape']);
      await browser.pause(500);

      await browser.checkScreen('quick-settings-closed');
    });
  });

  describe('PerformancePip Overlay', () => {
    it('should match baseline at detail level 0 (hidden)', async () => {
      // Cycle through performance detail levels (F9)
      await browser.keys(['F9']); // Level 1
      await browser.keys(['F9']); // Level 2
      await browser.keys(['F9']); // Level 3
      await browser.keys(['F9']); // Level 4
      await browser.keys(['F9']); // Back to 0
      await browser.pause(300);

      await browser.checkScreen('performance-pip-level-0');
    });

    it('should match baseline at detail level 1 (FPS only)', async () => {
      await browser.keys(['F9']);
      await browser.pause(300);

      await browser.checkElement(
        await browser.$('[data-testid="performance-pip"]'),
        'performance-pip-level-1'
      );
    });

    it('should match baseline at detail level 2 (FPS + frame time)', async () => {
      await browser.keys(['F9']);
      await browser.pause(300);

      await browser.checkElement(
        await browser.$('[data-testid="performance-pip"]'),
        'performance-pip-level-2'
      );
    });

    it('should match baseline at detail level 3 (+ CPU/GPU/temps)', async () => {
      await browser.keys(['F9']);
      await browser.pause(300);

      await browser.checkElement(
        await browser.$('[data-testid="performance-pip"]'),
        'performance-pip-level-3'
      );
    });

    it('should match baseline at detail level 4 (+ RAM/GPU power)', async () => {
      await browser.keys(['F9']);
      await browser.pause(300);

      await browser.checkElement(
        await browser.$('[data-testid="performance-pip"]'),
        'performance-pip-level-4'
      );
    });
  });

  describe('PowerModal Overlay', () => {
    it('should match baseline when opened', async () => {
      // Open PowerModal (power button or sequence)
      await browser.keys(['Control', 'Alt', 'Delete']);
      await browser.pause(500);

      await browser.checkScreen('power-modal-open');
    });

    it('should match baseline when closed', async () => {
      await browser.keys(['Escape']);
      await browser.pause(500);

      await browser.checkScreen('power-modal-closed');
    });
  });

  describe('Overlay Backdrop Blur', () => {
    it('should have consistent glassmorphism effect', async () => {
      // Open InGameMenu to test backdrop
      await browser.keys(['Home']);
      await browser.pause(500);

      await browser.checkElement(
        await browser.$('[data-testid="overlay-backdrop"]'),
        'overlay-backdrop-blur'
      );

      await browser.keys(['Escape']);
      await browser.pause(500);
    });
  });
});
