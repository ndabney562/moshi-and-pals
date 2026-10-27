import { test, expect, start } from '../helpers/game';

test('Omar receives a trainee with 33% stats, visual tint, and HUD banner', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=omar&trainee=omar');
  await page.waitForFunction(() => !!window.game?.scene.getScene('Hud')?.banner?.text);

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hud = window.game.scene.getScene('Hud');
    const omar = game.scribes.get('omar');
    const hasTrainee = game.scribes.hasTrainee('omar', game.time.now);
    const rem = game.scribes.traineeRemainingMs('omar', game.time.now);
    const tint = omar?.img?.tintTopLeft;
    const bannerTitle = hud.banner?.text;
    const bannerSub = hud.bannerSub?.text;
    return { hasOmar: !!omar, hasTrainee, rem, tint, bannerTitle, bannerSub };
  });

  expect(status.hasOmar).toBe(true);
  expect(status.hasTrainee).toBe(true);
  expect(status.rem).toBeGreaterThan(0);
  expect(status.tint).toBe(0xffd54f);
  expect(status.bannerTitle).toBe('OMAR HAS A TRAINEE');
  expect(status.bannerSub).toContain('33% speed & output');
});

test('Ineligible helpers (Alan and Donald) reject trainee assignments', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=alan&trainee=alan');

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hasAlan = !!game.scribes.get('alan');
    const hasTrainee = game.scribes.hasTrainee('alan', game.time.now);
    const tryAssign = game.scribes.assignTrainee('alan', game.time.now, 40000);
    return { hasAlan, hasTrainee, tryAssign };
  });

  expect(status.hasAlan).toBe(true);
  expect(status.hasTrainee).toBe(false);
  expect(status.tryAssign).toBe(false);
});

test('Selina receives a trainee at the front desk with visual tint and HUD banner', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=selina&trainee=selina');
  await page.waitForFunction(() => !!window.game?.scene.getScene('Hud')?.banner?.text);

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hud = window.game.scene.getScene('Hud');
    const selina = game.frontDesk.get('selina');
    const hasTrainee = game.frontDesk.hasTrainee('selina', game.time.now);
    const rem = game.frontDesk.traineeRemainingMs('selina', game.time.now);
    const tint = selina?.img?.tintTopLeft;
    const bannerTitle = hud.banner?.text;
    const bannerSub = hud.bannerSub?.text;
    return { hasSelina: !!selina, hasTrainee, rem, tint, bannerTitle, bannerSub };
  });

  expect(status.hasSelina).toBe(true);
  expect(status.hasTrainee).toBe(true);
  expect(status.rem).toBeGreaterThan(0);
  expect(status.tint).toBe(0xffd54f);
  expect(status.bannerTitle).toBe('SELINA HAS A TRAINEE');
  expect(status.bannerSub).toContain('33% speed & output');
});

test('Trainee completion clears tint and shows sign-off banner', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=omar&trainee=omar');

  // Fast-forward trainee timer to completion
  await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const omar = game.scribes.get('omar');
    if (omar) {
      omar.traineeUntil = game.time.now - 1;
      game.scribes.update(game.time.now, 16);
    }
  });

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hud = window.game.scene.getScene('Hud');
    const omar = game.scribes.get('omar');
    const hasTrainee = game.scribes.hasTrainee('omar', game.time.now);
    const isTinted = omar?.img?.isTinted;
    const bannerTitle = hud.banner?.text;
    const bannerSub = hud.bannerSub?.text;
    return { hasTrainee, isTinted, bannerTitle, bannerSub };
  });

  expect(status.hasTrainee).toBe(false);
  expect(status.isTinted).toBeFalsy();
  expect(status.bannerTitle).toBe("OMAR'S TRAINEE SIGNED OFF");
  expect(status.bannerSub).toContain('Back up to full speed');
});
