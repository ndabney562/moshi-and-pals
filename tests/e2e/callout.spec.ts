import { test, expect, start } from '../helpers/game';

test('waiting helper renders silhouette and reveals callout banner upon opening room when called out', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&callout=donald');

  const before = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const roomId = 'xray';
    const hasShadow = game.scribeShadows.has(roomId);
    const waitingId = game.scribeRooms.get(roomId);
    const attendance = game.attendance.get('donald');
    return { hasShadow, waitingId, attendance };
  });

  expect(before.hasShadow).toBe(true);
  expect(before.waitingId).toBe('donald');
  expect(before.attendance).toEqual({ out: true, reason: expect.any(String) });

  // Now unlock X-ray room
  await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    game.unlockRoom('xray');
  });

  const after = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    const hud = window.game.scene.getScene('Hud');
    const hasShadow = game.scribeShadows.has('xray');
    const isAbsent = game.absent.has('donald');
    const isReleased = game.released.has('donald');
    const bannerTitle = hud.banner?.text;
    const bannerSub = hud.bannerSub?.text;
    return { hasShadow, isAbsent, isReleased, bannerTitle, bannerSub };
  });

  expect(after.hasShadow).toBe(false);
  expect(after.isAbsent).toBe(true);
  expect(after.isReleased).toBe(false);
  expect(after.bannerTitle).toBe('DONALD CALLED OUT');
  expect(after.bannerSub).toContain('Called out');
});

test('forced attendance none releases helper normally when room is unlocked', async ({ page }) => {
  await start(page, '?god&seed=123&doctor=eugene&callout=none');

  const before = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    return { attendance: game.attendance.get('donald') };
  });
  expect(before.attendance).toEqual({ out: false });

  await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    game.unlockRoom('xray');
  });

  const after = await page.evaluate(() => {
    const game = window.game.scene.getScene('Game');
    return {
      isAbsent: game.absent.has('donald'),
      isReleased: game.released.has('donald'),
      hasHelper: !!game.scribes.get('donald'),
    };
  });

  expect(after.isAbsent).toBe(false);
  expect(after.isReleased).toBe(true);
  expect(after.hasHelper).toBe(true);
});
