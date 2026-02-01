import { expect } from '@wdio/globals';
import { waitForTauri } from './helpers/tauri';

/**
 * Debug test to see what's actually loading
 */
describe('Debug - What content is loading', () => {
  before(async () => {
    await waitForTauri(20000);
  });

  it('should inspect page structure after long wait', async () => {
    // Wait even longer for backend to load games
    console.log('Waiting 10 seconds for games to load...');
    await browser.pause(10000);

    const pageInfo = await browser.execute(() => {
      return {
        title: document.title,
        bodyHTML: document.body.innerHTML.substring(0, 1000),
        elementCount: document.querySelectorAll('*').length,
        divCount: document.querySelectorAll('div').length,
        buttonCount: document.querySelectorAll('button').length,
        hasReactRoot: document.getElementById('root') !== null,
        reactRootHTML: document.getElementById('root')?.innerHTML.substring(0, 500) || 'No root',
        scripts: Array.from(document.querySelectorAll('script'))
          .map((s) => s.src)
          .slice(0, 5),
        hasCards: document.querySelectorAll('.card, .game-card, [data-game]').length,
        allClasses: Array.from(
          new Set(
            Array.from(document.querySelectorAll('*'))
              .map((el) => el.className)
              .filter((c) => c && typeof c === 'string')
          )
        ).slice(0, 20),
      };
    });

    console.log('=== PAGE INFO ===');
    console.log('Title:', pageInfo.title);
    console.log('Total elements:', pageInfo.elementCount);
    console.log('Divs:', pageInfo.divCount);
    console.log('Buttons:', pageInfo.buttonCount);
    console.log('Has React root:', pageInfo.hasReactRoot);
    console.log('Game cards found:', pageInfo.hasCards);
    console.log('\nClasses in use:', pageInfo.allClasses);
    console.log('\nReact root HTML:', pageInfo.reactRootHTML);
    console.log('\nScripts loaded:', pageInfo.scripts);

    await browser.saveScreenshot('./e2e/screenshots/baseline/debug-after-10s-wait.png');

    // Check if games loaded
    expect(pageInfo.hasReactRoot).toBe(true);
  });

  it('should check for Tauri backend connection', async () => {
    const backendInfo = await browser.execute(() => {
      return {
        hasTauri: typeof (window as any).__TAURI__ !== 'undefined',
        tauriAPI: (window as any).__TAURI__ ? Object.keys((window as any).__TAURI__) : [],
        consoleErrors: (window as any).__CONSOLE_ERRORS__ || [],
      };
    });

    console.log('=== BACKEND INFO ===');
    console.log('Has Tauri API:', backendInfo.hasTauri);
    console.log('Tauri APIs available:', backendInfo.tauriAPI);

    await browser.saveScreenshot('./e2e/screenshots/baseline/debug-backend-check.png');
  });

  it('should try to invoke a Tauri command manually', async () => {
    const commandResult = await browser.execute(async () => {
      try {
        if (typeof (window as any).__TAURI__ === 'undefined') {
          return { error: 'Tauri API not available' };
        }

        // Try to invoke a command to scan games
        const tauri = (window as any).__TAURI__;

        return {
          success: true,
          tauriExists: true,
          apis: Object.keys(tauri),
        };
      } catch (error: any) {
        return {
          error: error.message,
          stack: error.stack?.substring(0, 200),
        };
      }
    });

    console.log('=== COMMAND INVOKE TEST ===');
    console.log(JSON.stringify(commandResult, null, 2));

    await browser.saveScreenshot('./e2e/screenshots/baseline/debug-command-test.png');
  });

  it('should check localStorage and state', async () => {
    const stateInfo = await browser.execute(() => {
      return {
        localStorage: Object.keys(localStorage).map((key) => ({
          key,
          value: localStorage.getItem(key)?.substring(0, 100),
        })),
        sessionStorage: Object.keys(sessionStorage).length,
        cookies: document.cookie,
        windowKeys: Object.keys(window)
          .filter((k) => k.startsWith('__') || k.includes('game') || k.includes('GAME'))
          .slice(0, 20),
      };
    });

    console.log('=== STATE INFO ===');
    console.log('LocalStorage:', stateInfo.localStorage);
    console.log('Window keys:', stateInfo.windowKeys);

    await browser.saveScreenshot('./e2e/screenshots/baseline/debug-state-check.png');
  });
});
