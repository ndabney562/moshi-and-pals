import { test, expect, boot, start, tapObject } from '../helpers/game';

test('Title scene has mode toggle for Endless Flu Season', async ({ page }) => {
  await boot(page, '?god&seed=123');

  const initialMode = await page.evaluate(() => {
    const title = window.game.scene.getScene('Title');
    return title.modeButton?.text;
  });
  expect(initialMode).toContain('STANDARD');

  // Tap mode button to switch to Flu Season
  await tapObject(page, 'Title', 'modeButton');

  const toggledMode = await page.evaluate(() => {
    const title = window.game.scene.getScene('Title');
    return title.modeButton?.text;
  });
  expect(toggledMode).toContain('FLU SEASON');
});

test('Launches shift in Endless Flu Season mode via query param', async ({ page }) => {
  await start(page, '?god&seed=123&mode=fluSeason');

  const shiftInfo = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    return {
      mode: game.shift?.mode,
      wavesMode: game.waves?.mode,
      round: game.waves?.round,
    };
  });

  expect(shiftInfo.mode).toBe('fluSeason');
  expect(shiftInfo.wavesMode).toBe('fluSeason');
});

test('Displays Flu Season wave HUD indicator', async ({ page }) => {
  await start(page, '?god&seed=123&mode=fluSeason');

  // Advance time to start round 1
  await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    game.waves.update(game.time.now + 3000, 0, () => true);
  });

  const hudText = await page.evaluate(() => {
    const hud = window.game.scene.getScene('Hud');
    return hud.roundText?.text;
  });

  expect(hudText).toContain('FLU');
});
