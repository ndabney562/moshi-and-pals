import { test, expect, boot, active, tapObject, start } from '../helpers/game';
import type { Route } from '@playwright/test';

test('update prompt and saved-shift action remain separate', async ({ page }) => {
  await start(page);
  await page.evaluate(() => window.game.scene.getScene('Hud').pause());
  await tapObject(page, 'Hud', 'saveQuitItem');
  await active(page, 'Title');
  const overlaps = await page.evaluate(() => {
    const s = window.game.scene.getScene('Title');
    s.updatePill.setVisible(true);
    s.layout();
    const a = s.updatePill.getBounds(), b = s.continueButton.getBounds();
    return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
  });
  expect(overlaps).toBe(false);
});

test('late leaderboard responses cannot overwrite a rebuilt table or a closed scene', async ({ page }) => {
  const requests: Route[] = [];
  await page.route('**/api/scores*', route => { requests.push(route); });
  await boot(page, '?god&seed=123&leaderboard=https://api.moshi-leaderboard.test');
  await tapObject(page, 'Title', 'leaderboardButton');
  await expect.poll(() => requests.length).toBe(1);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect.poll(() => requests.length).toBe(2);
  const result = (name: string) => ({ contentType: 'application/json', body: JSON.stringify({ ok: true, scores: [{ name, score: 100, round: 1, provider: 'eugene', mode: 'standard', difficulty: 'urgent' }] }) });
  await requests[1].fulfill(result('Fresh'));
  const labels = () => page.evaluate(() => window.game.scene.getScene('Leaderboard').rowsContainer.list.map((o: any) => o.text ?? '').join(' '));
  await expect.poll(labels).toContain('Fresh');
  const oldResponse = page.waitForResponse(r => r.url().includes('/api/scores'));
  await requests[0].fulfill(result('Stale'));
  await (await oldResponse).finished();
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await labels()).toContain('Fresh');
  expect(await labels()).not.toContain('Stale');
  await page.evaluate(() => { void window.game.scene.getScene('Leaderboard').loadScores(); });
  await expect.poll(() => requests.length).toBe(3);
  await page.keyboard.press('Escape');
  await active(page, 'Title');
  const closedResponse = page.waitForResponse(r => r.url().includes('/api/scores'));
  await requests[2].fulfill(result('Closed'));
  await (await closedResponse).finished();
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await active(page, 'Title');
});

test('an immediate Continue tap after Save & Quit restores the existing shift', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    g.score = 1234;
    window.game.scene.getScene('Hud').pause();
  });
  await page.waitForFunction(() => window.game.scene.isPaused('Game'));
  await tapObject(page, 'Hud', 'saveQuitItem');
  await active(page, 'Title');
  // Do not reload or wait for a later animation frame: cover the transition race.
  await tapObject(page, 'Title', 'continueButton');
  await active(page, 'Hud');
  expect(await page.evaluate(() => window.game.scene.getScene('Game').score)).toBe(1234);
  expect(await page.evaluate(() => localStorage.getItem('moshi.shift.v1'))).toBeNull();
});

test('title actions stay within the canvas and do not overlap at phone and tablet widths', async ({ page }) => {
  await boot(page);
  for (const viewport of [{ width: 852, height: 393 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    const geometry = await page.evaluate(() => {
      const s = window.game.scene.getScene('Title');
      const names = ['tap', 'providersButton', 'lockerButton', 'boardButton', 'leaderboardButton', 'modeButton', 'difficultyButton', 'dailyButton'];
      const bounds = names.map(name => { const b = s[name].getBounds(); return { name, x: b.x, y: b.y, width: b.width, height: b.height }; });
      return { bounds, w: s.scale.width, h: s.scale.height };
    });
    for (const b of geometry.bounds) {
      expect(b.x, b.name).toBeGreaterThanOrEqual(0);
      expect(b.y, b.name).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, b.name).toBeLessThanOrEqual(geometry.w);
      expect(b.y + b.height, b.name).toBeLessThanOrEqual(geometry.h);
      for (const other of geometry.bounds.filter(x => x.name !== b.name)) {
        const overlap = b.x < other.x + other.width && b.x + b.width > other.x && b.y < other.y + other.height && b.y + b.height > other.y;
        expect(overlap, `${b.name} overlaps ${other.name}`).toBe(false);
      }
    }
  }
});

test('all eleven providers have distinct portrait frames and the roster selects by touch', async ({ page }) => {
  await boot(page);
  await tapObject(page, 'Title', 'providersButton');
  await active(page, 'Providers');
  const portraits = await page.evaluate(() => {
    const t = window.game.textures.get('provider-portraits');
    return Object.values(t.frames).filter((f: any) => f.name !== '__BASE').map((f: any) => ({ name: f.name, x: f.cutX, y: f.cutY, w: f.cutWidth, h: f.cutHeight }));
  });
  expect(portraits).toHaveLength(11);
  expect(new Set(portraits.map(f => `${f.x}:${f.y}`)).size).toBe(11);
  expect(portraits.every(f => f.w > 0 && f.h > 0)).toBe(true);
  const point = await page.evaluate(() => {
    const s = window.game.scene.getScene('Providers');
    const tile = s.content.list.filter((o: any) => o.type === 'Rectangle' && o.input)[4];
    const b = tile.getBounds(), canvas = window.game.canvas.getBoundingClientRect();
    return { x: canvas.left + b.centerX * canvas.width / s.scale.width, y: canvas.top + b.centerY * canvas.height / s.scale.height };
  });
  await page.touchscreen.tap(point.x, point.y);
  await expect.poll(() => page.evaluate(() => window.game.scene.getScene('Providers').index)).toBe(4);
});

for (const provider of [
  { id: 'ken', name: 'Ken', column: 1, index: 3, signature: 'grievance' },
  { id: 'kaya', name: 'Dr. Kaya', column: 3, index: 1, signature: 'codeBlue' },
]) {
  test(`${provider.name} keeps the correct portrait and identity from roster to shift @smoke`, async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('moshi.progress.v1')) {
        localStorage.setItem('moshi.progress.v1', JSON.stringify({ owned: ['doctor:ken', 'doctor:kaya'] }));
      }
    });
    await boot(page);
    await tapObject(page, 'Title', 'providersButton');
    await active(page, 'Providers');
    await page.evaluate(index => {
      const s = window.game.scene.getScene('Providers');
      s.index = index; s.draw();
    }, provider.index);
    const card = await page.evaluate(id => {
      const s = window.game.scene.getScene('Providers');
      const portrait = s.content.list.find((o: any) => o.type === 'Image');
      const frame = s.textures.get('provider-portraits').get(id);
      return {
        name: s.content.list.find((o: any) => o.type === 'Text' && o.style.fontSize === '38px').text,
        frame: portrait.frame.name, x: frame.cutX, y: frame.cutY,
        atlasWidth: s.textures.get('provider-portraits').getSourceImage().width,
      };
    }, provider.id);
    expect(card.name).toBe(provider.name);
    expect(card.frame).toBe(provider.id);
    // Art identity anchors: row 1 has Ken's fleece in column 2 and Kaya's cap/sunglasses in column 4.
    expect(card.x).toBe(Math.round(provider.column * card.atlasWidth / 4));
    expect(card.y).toBe(0);
    await page.evaluate(() => window.game.scene.getScene('Providers').select());
    await page.keyboard.press('Escape');
    await active(page, 'Title');
    await page.reload();
    await active(page, 'Title');
    expect(await page.evaluate(() => {
      const s = window.game.scene.getScene('Title');
      return { name: s.pickInfo.text, frame: s.portrait.frame.name, x: s.portrait.frame.cutX };
    })).toEqual({ name: provider.name, frame: provider.id, x: card.x });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('moshi.settings.v1')!).character)).toBe(provider.id);
    await tapObject(page, 'Title', 'tap');
    await active(page, 'Hud');
    expect(await page.evaluate(() => {
      const s = window.game.scene.getScene('Game');
      return { id: s.character.id, name: s.character.name, signature: s.character.signature, texture: s.player.texture.key };
    })).toEqual({ id: provider.id, name: provider.name, signature: provider.signature, texture: provider.id });
  });
}

test('secondary menu navigation survives resizing without starting a shift', async ({ page }) => {
  await boot(page);
  for (const [field, key] of [['boardButton', 'Board'], ['lockerButton', 'Locker'], ['leaderboardButton', 'Leaderboard']]) {
    await tapObject(page, 'Title', field);
    await active(page, key);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(150);
    await active(page, key);
    expect(await page.evaluate(() => window.game.scene.isActive('Game'))).toBe(false);
    await page.keyboard.press('Escape');
    await active(page, 'Title');
    await page.setViewportSize({ width: 852, height: 393 });
    await page.waitForTimeout(150);
  }
});
