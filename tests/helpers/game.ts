import { test as base, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    // Phaser scenes expose private TS members at runtime. Tests inspect them without shipping test hooks.
    game: any;
    moshiNative: any;
    __native: any[];
  }
}

export const test = base.extend<{ cleanRuntime: void }>({
  cleanRuntime: [async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    page.on('console', (message) => {
      const offlineProbe = testInfo.annotations.some((a) => a.type === 'offline')
        && /Failed to load resource:.*(ERR_INTERNET_DISCONNECTED|ERR_EMPTY_RESPONSE|Internet connection appears to be offline|network connection was lost|server unexpectedly dropped|Connection terminated unexpectedly|WebKit encountered an internal error)/i.test(message.text());
      if (message.type() === 'error' && !offlineProbe) errors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      const failureText = request.failure()?.errorText || '';
      const isOffline = testInfo.annotations.some((a) => a.type === 'offline');
      const expectedProbe = isOffline && (
        new URL(request.url()).pathname.endsWith('/version.json')
        || /Connection terminated unexpectedly|WebKit encountered an internal error|ERR_INTERNET_DISCONNECTED|network connection was lost|server unexpectedly dropped/i.test(failureText)
      );
      if (!expectedProbe) errors.push(`${failureText} ${request.url()}`);
    });
    page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await use();
    await testInfo.attach('runtime-errors', { body: JSON.stringify(errors, null, 2), contentType: 'application/json' });
    expect(errors, 'runtime exceptions, console errors and HTTP failures').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function active(page: Page, scene: string) {
  await page.waitForFunction((key) => window.game?.scene.isActive(key), scene);
}
export async function boot(page: Page, query = '?god&seed=123') {
  await page.goto(`./${query}`);
  await active(page, 'Title');
}
export async function start(page: Page, query?: string) {
  await boot(page, query);
  await page.touchscreen.tap(426, 200);
  await active(page, 'Hud');
}
export async function tapObject(page: Page, scene: string, property: string) {
  const point = await page.evaluate(([key, field]) => {
    const object = window.game.scene.getScene(key)[field];
    const box = window.game.canvas.getBoundingClientRect();
    const scale = box.width / window.game.scale.width;
    const bounds = object.getBounds();
    return { x: box.left + bounds.centerX * scale, y: box.top + bounds.centerY * scale };
  }, [scene, property]);
  await page.touchscreen.tap(point.x, point.y);
}
