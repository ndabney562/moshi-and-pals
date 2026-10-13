/**
 * Smoke test: builds must already exist (npm run build). Serves dist/, opens
 * the game in a phone-sized landscape browser with touch, taps to start,
 * drags the move stick, and checks Eugene actually moved with no errors.
 * Screenshots land in the repo root as smoke-*.png (git-ignored).
 *
 *   npm run build && npm run smoke
 */
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4173, strictPort: true } });
const url = 'http://localhost:4173/moshi-and-pals/';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
// iPhone 15-ish, landscape
const context = await browser.newContext({
  viewport: { width: 852, height: 393 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

let failed = false;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failed = true; };

try {
  await page.goto(url);
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await page.screenshot({ path: 'smoke-title.png' });

  await page.touchscreen.tap(426, 200);
  await page.waitForFunction(() => window.game.scene.isActive('Hud'));
  await page.waitForTimeout(300);

  const pos = () => page.evaluate(() => {
    const p = window.game.scene.getScene('Game').children.list.find((c) => c.texture?.key === 'eugene');
    return { x: p.x, y: p.y, rotation: p.rotation };
  });
  const start = await pos();

  // Drag the left stick up-right with one finger, and hold the aim stick left with a second
  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const L = { x: 120, y: 300, id: 1 };
  const R = { x: 730, y: 300, id: 2 };
  await touch('touchStart', [L]);
  await touch('touchStart', [L, R]);
  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', [{ ...L, x: L.x + i * 4, y: L.y - i * 4 }, { ...R, x: R.x - i * 5 }]);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'smoke-game.png' });
  const end = await pos();
  await touch('touchEnd', []);

  check(end.x > start.x + 20 && end.y < start.y - 20, `Eugene moved up-right (${start.x | 0},${start.y | 0}) -> (${end.x | 0},${end.y | 0})`);
  check(Math.abs(Math.abs(end.rotation) - Math.PI) < 0.3, `Eugene faces the aim stick (left), rotation ${end.rotation.toFixed(2)}`);
  check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} catch (e) {
  check(false, String(e));
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
