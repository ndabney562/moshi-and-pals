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

  // Screen position of a HUD button, in page pixels
  const buttonAt = (name) => page.evaluate((n) => {
    const b = window.game.scene.getScene('Hud')[n];
    const canvas = window.game.canvas.getBoundingClientRect();
    const k = canvas.width / window.game.scale.width;
    return { x: canvas.left + b.x * k, y: canvas.top + b.y * k };
  }, name);

  // Drag the left stick up-right with one finger
  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const L = { x: 120, y: 300, id: 1 };
  await touch('touchStart', [L]);
  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', [{ ...L, x: L.x + i * 4, y: L.y - i * 4 }]);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'smoke-game.png' });
  const end = await pos();
  await touch('touchEnd', []);

  // Hold SPRAY for a few seconds and let auto-aim find the germs
  const game = () => page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const eugene = scene.children.list.find((c) => c.texture?.key === 'eugene');
    const germs = scene.children.list.filter((c) => c.texture?.key?.startsWith('germ-') && c.active);
    germs.sort((a, b) => Math.hypot(a.x - eugene.x, a.y - eugene.y) - Math.hypot(b.x - eugene.x, b.y - eugene.y));
    const g = germs[0];
    return {
      ammo: scene.sprayer.ammo, kills: scene.kills, germs: germs.length,
      dist: g ? Math.hypot(g.x - eugene.x, g.y - eugene.y) : Infinity,
      facing: eugene.rotation,
      aim: g ? Math.atan2(g.y - eugene.y, g.x - eugene.x) : 0,
    };
  });
  // Let the germs come to Eugene (within spray range) before spraying
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('Game');
    const e = scene.children.list.find((c) => c.texture?.key === 'eugene');
    return scene.children.list.some((c) => c.texture?.key?.startsWith('germ-') && c.active && Math.hypot(c.x - e.x, c.y - e.y) < 180);
  }, null, { timeout: 30000 });
  const before = await game();
  check(before.germs > 0, `germs spawned and approached (${before.germs} alive)`);
  const spray = await buttonAt('sprayButton');
  await touch('touchStart', [{ ...spray, id: 3 }]);
  let aimSamples = 0;
  let aimHits = 0;
  for (let i = 0; i < 70; i++) {
    await page.waitForTimeout(100);
    if (i === 8) await page.screenshot({ path: 'smoke-spray.png' });
    // Whenever a germ is clearly in range, Eugene should be facing it
    const { aim, dist, facing } = await game();
    if (dist < 180) {
      aimSamples++;
      if (Math.abs(Math.atan2(Math.sin(facing - aim), Math.cos(facing - aim))) < 0.5) aimHits++;
    }
  }
  check(aimSamples > 0 && aimHits / aimSamples >= 0.6, `auto-aim faces the nearest germ (${aimHits}/${aimSamples} samples)`);
  await touch('touchEnd', []);
  const after = await game();
  check(after.ammo < before.ammo, `spraying used alcohol (${before.ammo} -> ${after.ammo} mL)`);
  check(after.kills > 0, `germs disinfected (${after.kills})`);

  // Tap the Refill button
  const refillAt = await buttonAt('refillButton');
  await page.touchscreen.tap(refillAt.x, refillAt.y);
  await page.waitForTimeout(1400);
  const refilled = await game();
  check(refilled.ammo === 120, `Refill button refilled the bottle (${refilled.ammo} mL)`);
  await page.screenshot({ path: 'smoke-after.png' });

  check(end.x > start.x + 20 && end.y < start.y - 20, `Eugene moved up-right (${start.x | 0},${start.y | 0}) -> (${end.x | 0},${end.y | 0})`);
  check(Math.abs(end.rotation - -Math.PI / 4) < 0.3, `Eugene faces where he walks (up-right), rotation ${end.rotation.toFixed(2)}`);
  check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} catch (e) {
  check(false, String(e));
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
