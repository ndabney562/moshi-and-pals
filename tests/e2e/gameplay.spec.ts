import { test, expect, boot, start, active, tapObject } from '../helpers/game';

test('@smoke boots from the Pages subpath, starts via touch and moves via keyboard', async ({ page }) => {
  await start(page);
  expect(await page.evaluate(() => window.game.scene.isActive('Title'))).toBe(false);
  const x = await page.evaluate(() => window.game.scene.getScene('Game').player.x);
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.game.scene.getScene('Game').player.x)).toBeGreaterThan(x + 10);
  await page.keyboard.up('ArrowRight');
});
test('@smoke touch pause freezes game time and resume wakes the game', async ({ page }) => {
  await start(page);
  await tapObject(page, 'Hud', 'pauseButton');
  await page.waitForFunction(() => window.game.scene.isPaused('Game'));
  const before = await page.evaluate(() => window.game.scene.getScene('Game').time.now);
  // Wait on the independently running HUD clock rather than a fixed wall-clock sleep.
  await page.evaluate(() => new Promise<void>((resolve) => window.game.scene.getScene('Hud').time.delayedCall(250, resolve)));
  expect(await page.evaluate(() => window.game.scene.getScene('Game').time.now)).toBe(before);
  await tapObject(page, 'Hud', 'resumeItem');
  await expect.poll(() => page.evaluate(() => window.game.scene.getScene('Game').time.now)).toBeGreaterThan(before);
});
test('save and quit returns to Title; continue consumes the saved shift', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { window.game.scene.getScene('Game').score = 1234; });
  await tapObject(page, 'Hud', 'pauseButton');
  await page.waitForFunction(() => window.game.scene.isPaused('Game'));
  await tapObject(page, 'Hud', 'saveQuitItem');
  await active(page, 'Title');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.shift.v1')!).score)).toBe(1234);
  await page.reload();
  await active(page, 'Title');
  await tapObject(page, 'Title', 'continueButton');
  await active(page, 'Hud');
  expect(await page.evaluate(() => window.game.scene.getScene('Game').score)).toBe(1234);
  expect(await page.evaluate(() => localStorage.getItem('moshi.shift.v1'))).toBeNull();
});
test('game-over records the run and Play Again restarts gameplay', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { const scene = window.game.scene.getScene('Game'); scene.score = 4321; scene.endRun(); });
  await active(page, 'GameOver');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.save.v3')!).records.urgent.bestScore)).toBe(4321);
  await page.keyboard.press('Enter');
  await active(page, 'Hud');
  expect(await page.evaluate(() => window.game.scene.getScene('Game').score)).toBe(0);
});
test('board and locker return to the title without starting a run', async ({ page }) => {
  await boot(page);
  for (const [field, scene] of [['boardButton', 'Board'], ['lockerButton', 'Locker']]) {
    await tapObject(page, 'Title', field);
    await active(page, scene);
    await page.evaluate((key) => window.game.scene.getScene(key).children.list.find((c: any) => c.text === 'BACK').emit('pointerup'), scene);
    await active(page, 'Title');
  }
  expect(await page.evaluate(() => localStorage.getItem('moshi.save.v3'))).toBeNull();
});
