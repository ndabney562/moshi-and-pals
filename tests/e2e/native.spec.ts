import { test, expect, active } from '../helpers/game';

test('native host receives boot snapshot, validates settings, starts and exits', async ({ page }) => {
  await page.addInitScript(() => {
    window.__native = [];
    (window as any).webkit = { messageHandlers: { moshi: { postMessage: (message: unknown) => window.__native.push(message) } } };
  });
  await page.goto('./?native&god&seed=123');
  await page.waitForFunction(() => window.__native.some((m) => m.type === 'ready'));
  const snapshot = await page.evaluate(() => window.__native.find((m) => m.type === 'snapshot'));
  expect(snapshot.pals).toHaveLength(11);
  expect(snapshot.art['eugene-held']).toMatch(/^data:image\/png/);
  expect(await page.evaluate(() => window.game.scene.isActive('Title'))).toBe(false);
  await page.evaluate(() => window.moshiNative.setSettings({ difficulty: 'walkIn', sound: 'invalid', character: 'missing' }));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.settings.v1')!))).toMatchObject({ difficulty: 'walkIn', sound: true, character: 'eugene' });
  await page.waitForFunction(() => !window.game.loop.running);
  await page.evaluate(() => window.moshiNative.open('board'));
  await active(page, 'Board');
  await page.evaluate(() => window.game.scene.getScene('Board').children.list.find((c: any) => c.text === 'BACK').emit('pointerup'));
  await active(page, 'Native');
  expect(await page.evaluate(() => window.__native.some((m) => m.type === 'exit'))).toBe(true);
  await page.waitForFunction(() => !window.game.loop.running);
  await page.evaluate(() => window.moshiNative.start({ kind: 'daily' }));
  await active(page, 'Hud');
  expect(await page.evaluate(() => window.game.scene.getScene('Game').shift.difficulty)).toBe('urgent');
});

test('@smoke a shared native-query link without the app host stays playable', async ({ page }) => {
  await page.goto('./?native&god&seed=123');
  await active(page, 'Title');
  expect(await page.evaluate(() => typeof window.moshiNative)).toBe('undefined');
  await page.touchscreen.tap(426, 200);
  await active(page, 'Hud');
});

test('the same bundle runs from a root index.html URL used by the native scheme', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.goto(`${origin}/index.html?god&seed=123`);
  await active(page, 'Title');
  await page.touchscreen.tap(426, 200);
  await active(page, 'Hud');
});
