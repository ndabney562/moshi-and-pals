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
  // Tap AUTO-AIM to turn it off; it should be saved for next time
  const toggle = await buttonAt('autoAimToggle');
  const t = await page.evaluate(() => {
    const b = window.game.scene.getScene('Hud').autoAimToggle;
    return { w: b.width, h: b.height };
  });
  const k = await page.evaluate(() => window.game.canvas.getBoundingClientRect().width / window.game.scale.width);
  await page.touchscreen.tap(toggle.x + (t.w / 2) * k, toggle.y + (t.h / 2) * k);
  await page.waitForTimeout(200);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.settings.v1') ?? '{}'));
  check(saved.autoAim === false, `AUTO-AIM toggle turns it off and saves it (${JSON.stringify(saved)})`);
  await page.screenshot({ path: 'smoke-after.png' });

  // Waves and score
  const run = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { round: scene.waves.round, score: scene.score, hud: window.game.scene.getScene('Hud').roundText.text };
  });
  check(run.round >= 1 && run.hud === `ROUND ${run.round}`, `wave system running (${run.hud})`);
  check(run.score > 0, `score counts kills (${run.score})`);

  // Diamond the Practice Manager: spawn her near Eugene and walk her through every move
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active) g.kill();
    scene.player.hp = 100;
    scene.player.setPosition(640, 460);
    scene.spawnGerm('diamond', { hpMult: 1, speedMult: 1 });
    scene.boss.germ.setPosition(860, 460);
    scene.boss.nextMeetingAt = 0;
  });
  await page.waitForTimeout(1000);
  const intro = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { said: scene.boss.bubble.text, bar: window.game.scene.getScene('Hud').bossBar?.visible };
  });
  check(intro.said.length > 0, `Diamond talks ("${intro.said}")`);
  await page.waitForFunction(() => window.game.scene.getScene('Game').boss.mode === 'meeting', null, { timeout: 4000 });
  const meetingStart = await page.evaluate(() => window.game.scene.getScene('Game').player.y);
  // Headless frame rates are low, so wait for progress instead of a fixed time
  await page.waitForFunction((y0) => window.game.scene.getScene('Game').player.y > y0 + 30, meetingStart, { timeout: 6000 }).catch(() => {});
  await page.screenshot({ path: 'smoke-boss.png' });
  const meeting = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { y: scene.player.y, pull: scene.player.pull.length(), aim: scene.nearestGerm(240) === scene.boss.germ };
  });
  check(meeting.pull > 0 && meeting.y > meetingStart + 30, `Mandatory Meeting drags Eugene toward the exit (y ${meetingStart | 0} -> ${meeting.y | 0})`);
  check(meeting.aim, 'auto-aim locks onto Diamond during the meeting');

  // Spray her hard enough to rip the red tape (also costs her enough health to fling write-ups)
  const hitBoss = (amount) => page.evaluate((n) => {
    const scene = window.game.scene.getScene('Game');
    const d = scene.droplets.get();
    d.fire(scene.boss.germ.x, scene.boss.germ.y, 0, 1, 100, n, 0, 0xffffff);
    scene.onDropletHit(d, scene.boss.germ);
  }, amount);
  await hitBoss(200);
  const freed = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { mode: scene.boss.mode, pull: scene.player.pull.length(), writeUps: scene.germs.getChildren().filter((g) => g.active && g.def.id === 'writeUp').length };
  });
  check(freed.mode === 'chase' && freed.pull === 0, `spraying her breaks Eugene free (${JSON.stringify(freed)})`);
  check(freed.writeUps >= 1, `Write-Ups fly when she is hurt (${freed.writeUps})`);

  // Policy Tantrum at low health
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    for (const g of scene.germs.getChildren()) if (g.active && g.def.id === 'writeUp') g.kill();
    scene.player.hp = 100;
  });
  await hitBoss(260);
  await page.waitForFunction(() => window.game.scene.getScene('Game').boss.mode === 'tantrumWindup', null, { timeout: 3000 });
  await page.waitForFunction(() => window.game.scene.getScene('Game').boss.nextTantrumAt > 0, null, { timeout: 3000 });
  check(true, 'Policy Tantrum winds up and stomps at low health');

  // Finish her off
  await page.evaluate(() => { window.game.scene.getScene('Game').player.hp = 100; });
  await hitBoss(5000);
  const beaten = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { active: scene.boss.active, said: scene.boss.bubble.text };
  });
  check(!beaten.active && beaten.said.length > 0, `Diamond can be defeated ("${beaten.said}")`);

  // Death: drop Eugene to 1 HP and put a germ on top of him
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    scene.player.hp = 1;
    const g = scene.germs.getChildren().find((c) => c.active) ?? (scene.spawnGerm('basic', { hpMult: 1, speedMult: 1 }), scene.germs.getChildren().find((c) => c.active));
    g.setPosition(scene.player.x + 5, scene.player.y);
  });
  await page.waitForFunction(() => window.game.scene.isActive('GameOver'), null, { timeout: 8000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'smoke-gameover.png' });
  const saved2 = await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.save.v1') ?? '{}'));
  check(saved2.bestScore > 0, `high score saved (${JSON.stringify(saved2)})`);

  // Restart from the game over screen
  const again = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameOver');
    const label = scene.children.list.find((c) => c.text === 'SCRUB IN AGAIN');
    const canvas = window.game.canvas.getBoundingClientRect();
    const k = canvas.width / window.game.scale.width;
    return { x: canvas.left + label.x * k, y: canvas.top + label.y * k };
  });
  await page.touchscreen.tap(again.x, again.y);
  await page.waitForFunction(() => window.game.scene.isActive('Hud') && !window.game.scene.isActive('GameOver'), null, { timeout: 5000 });
  const fresh = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    return { hp: scene.player.hp, score: scene.score, round: scene.waves.round };
  });
  check(fresh.hp === 100 && fresh.score === 0 && fresh.round === 0, `restart gives a fresh run (${JSON.stringify(fresh)})`);

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
