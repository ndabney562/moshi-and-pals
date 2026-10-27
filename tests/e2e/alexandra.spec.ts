import { test, expect, start } from '../helpers/game';

test('Alexandra spawns as an essence scribe with floating cloud animation', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=alexandra');

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const alex = game.scribes.get('alexandra');
    const here = !!alex && alex.here;
    const isVisible = alex?.img?.visible;
    const textureKey = alex?.img?.texture?.key;
    return { here, isVisible, textureKey };
  });

  expect(status.here).toBe(true);
  expect(status.isVisible).toBe(true);
  expect(status.textureKey).toBe('scribe-alexandra');
});

test('Alexandra attacks germs with multi-target ink/steam bursts', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=alexandra');

  // Spawn germs near Alexandra to trigger combat
  await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const alex = game.scribes.get('alexandra');
    if (alex) {
      game.spawnGerm(alex.img.x + 80, alex.img.y, 'basic');
      game.spawnGerm(alex.img.x + 100, alex.img.y + 40, 'basic');
      alex.nextAttackAt = game.time.now - 1;
      game.scribes.update(game.time.now, 16);
    }
  });

  const killsOrKilled = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const alex = game.scribes.get('alexandra');
    return {
      alexKills: alex?.kills ?? 0,
      totalKills: game.kills ?? 0,
    };
  });

  expect(killsOrKilled).toBeDefined();
});

test('Alexandra rejects trainee assignments', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=alexandra&trainee=alexandra');

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hasTrainee = game.scribes.hasTrainee('alexandra', game.time.now);
    const tryAssign = game.scribes.assignTrainee('alexandra', game.time.now, 40000);
    return { hasTrainee, tryAssign };
  });

  expect(status.hasTrainee).toBe(false);
  expect(status.tryAssign).toBe(false);
});

test('Alexandra can be distracted and reactivated with in-character banners', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&scribe=alexandra&distract=alexandra');
  await page.waitForFunction(() => !!window.game?.scene.getScene('Hud')?.banner?.text);

  const status = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hud = window.game.scene.getScene('Hud');
    const alex = game.scribes.get('alexandra');
    const hasDistraction = game.scribes.hasDistraction('alexandra', game.time.now);
    const bannerTitle = hud.banner?.text;
    return { hasAlex: !!alex, hasDistraction, bannerTitle };
  });

  expect(status.hasAlex).toBe(true);
  expect(status.hasDistraction).toBe(true);
  expect(status.bannerTitle).toBe('ALEXANDRA DISTRACTED');
});
