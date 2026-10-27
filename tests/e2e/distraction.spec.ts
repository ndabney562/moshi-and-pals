import { test, expect, start } from '../helpers/game';

test('Omar is drawn to an in-world distraction with marker, state, and HUD banner', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=omar&distract=omar');
  await page.waitForFunction(() => !!window.game?.scene.getScene('Hud')?.banner?.text);

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hud = window.game.scene.getScene('Hud');
    const omar = game.scribes.get('omar');
    const hasDistraction = game.scribes.hasDistraction('omar', game.time.now);
    const d = game.scribes.getDistraction('omar');
    const bannerTitle = hud.banner?.text;
    const bannerSub = hud.bannerSub?.text;
    return { hasOmar: !!omar, hasDistraction, d, bannerTitle, bannerSub };
  });

  expect(status.hasOmar).toBe(true);
  expect(status.hasDistraction).toBe(true);
  expect(status.d?.kind).toBe('distraction');
  expect(status.d?.remainingMs).toBeGreaterThan(0);
  expect(status.bannerTitle).toBe('OMAR DISTRACTED');
  expect(status.bannerSub).toContain('Cross near them to get them back');
});

test('Walking close to a distracted helper reactivates them and shows reactivation banner', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=omar&distract=omar');

  // Trigger player intervention by placing player right on top of Omar
  await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const omar = game.scribes.get('omar');
    if (omar && omar.distraction) {
      omar.distraction.assignedAt = game.time.now - 2000;
      game.player.x = omar.img.x;
      game.player.y = omar.img.y;
      game.scribes.update(game.time.now, 16);
    }
  });

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hud = window.game.scene.getScene('Hud');
    const hasDistraction = game.scribes.hasDistraction('omar', game.time.now);
    const bannerTitle = hud.banner?.text;
    const bannerSub = hud.bannerSub?.text;
    return { hasDistraction, bannerTitle, bannerSub };
  });

  expect(status.hasDistraction).toBe(false);
  expect(status.bannerTitle).toBe('OMAR BACK ON TASK');
  expect(status.bannerSub).toContain('Reactivated');
});

test('Donald is called to X-ray for patient imaging with HUD banner', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=donald&imaging=donald');
  await page.waitForFunction(() => !!window.game?.scene.getScene('Hud')?.banner?.text);

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hud = window.game.scene.getScene('Hud');
    const donald = game.scribes.get('donald');
    const hasDistraction = game.scribes.hasDistraction('donald', game.time.now);
    const d = game.scribes.getDistraction('donald');
    const bannerTitle = hud.banner?.text;
    const bannerSub = hud.bannerSub?.text;
    return { hasDonald: !!donald, hasDistraction, d, bannerTitle, bannerSub };
  });

  expect(status.hasDonald).toBe(true);
  expect(status.hasDistraction).toBe(true);
  expect(status.d?.kind).toBe('imaging');
  expect(status.bannerTitle).toBe('DONALD TO X-RAY');
  expect(status.bannerSub).toContain('Called to image a patient');
});

test('Donald patient imaging completion restores Donald and shows completion banner', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=donald&imaging=donald');

  // Fast-forward imaging timer to completion
  await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const donald = game.scribes.get('donald');
    if (donald && donald.distraction) {
      donald.distraction.until = game.time.now - 1;
      game.scribes.update(game.time.now, 16);
    }
  });

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hud = window.game.scene.getScene('Hud');
    const hasDistraction = game.scribes.hasDistraction('donald', game.time.now);
    const bannerTitle = hud.banner?.text;
    const bannerSub = hud.bannerSub?.text;
    return { hasDistraction, bannerTitle, bannerSub };
  });

  expect(status.hasDistraction).toBe(false);
  expect(status.bannerTitle).toBe('DONALD FILMS FILED');
  expect(status.bannerSub).toContain('Patient imaging complete');
});
