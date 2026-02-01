import { expect } from '@wdio/globals';
import { waitForTauri } from './helpers/tauri';

describe('WiFi Panel Debug', () => {
  before(async () => {
    await waitForTauri();
    await browser.pause(2000); // Extra wait for app to be ready
  });

  it('should open WiFi panel with Ctrl+W and take screenshot', async () => {
    console.log('Taking initial screenshot...');
    await browser.saveScreenshot('./e2e/screenshots/wifi-01-before.png');

    console.log('Pressing Ctrl+W...');
    await browser.keys(['Control', 'w']);
    await browser.pause(1000);

    console.log('Taking screenshot after Ctrl+W...');
    await browser.saveScreenshot('./e2e/screenshots/wifi-02-after-ctrl-w.png');

    // Check if overlay wrapper exists
    const overlayWrapper = await $('.overlay-panel-wrapper');
    const exists = await overlayWrapper.isExisting();
    console.log('Overlay wrapper exists:', exists);

    if (exists) {
      const isDisplayed = await overlayWrapper.isDisplayed();
      console.log('Overlay wrapper displayed:', isDisplayed);

      // Get computed style
      const zIndex = await overlayWrapper.getCSSProperty('z-index');
      console.log('Overlay z-index:', zIndex.value);

      // Check for panel
      const panel = await $('.overlay-panel');
      const panelExists = await panel.isExisting();
      console.log('Panel exists:', panelExists);

      if (panelExists) {
        const panelDisplayed = await panel.isDisplayed();
        console.log('Panel displayed:', panelDisplayed);

        // Take screenshot with inspector
        await browser.saveScreenshot('./e2e/screenshots/wifi-03-panel-found.png');
      }
    }

    // Get page HTML for inspection
    const html = await browser.execute(() => {
      const wrapper = document.querySelector('.overlay-panel-wrapper');
      return wrapper ? wrapper.outerHTML : 'NOT FOUND';
    });
    console.log('Overlay HTML:', html.substring(0, 500));
  });

  it('should open WiFi panel by clicking TopBar WiFi icon', async () => {
    console.log('Looking for WiFi icon in TopBar...');

    // Find the WiFi icon in TopBar (it's in status-icons)
    const wifiIcon = await $('.status-icons .status-item.clickable');
    const exists = await wifiIcon.isExisting();
    console.log('WiFi icon exists:', exists);

    if (exists) {
      console.log('Clicking WiFi icon...');
      await wifiIcon.click();
      await browser.pause(1000);

      console.log('Taking screenshot after click...');
      await browser.saveScreenshot('./e2e/screenshots/wifi-04-after-click.png');

      // Check for panel
      const overlayWrapper = await $('.overlay-panel-wrapper');
      const wrapperDisplayed = await overlayWrapper.isDisplayed();
      console.log('Overlay displayed after click:', wrapperDisplayed);
    }
  });
});
