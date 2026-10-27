import { test, expect, boot, active, tapObject } from '../helpers/game';

test.describe('Online Leaderboard', () => {
  test('Title scene has leaderboard button and navigates to LeaderboardScene', async ({ page }) => {
    // Intercept leaderboard API requests to respond with mock data
    await page.route('**/api/scores*', (route) => {
      const url = new URL(route.request().url());
      const mode = url.searchParams.get('mode') ?? 'standard';
      const difficulty = url.searchParams.get('difficulty') ?? 'urgent';

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          scores: [
            { id: 1, name: 'Dr. Mosh', score: 18450, round: 12, mode, difficulty, provider: 'eugene', created_at: Date.now() },
            { id: 2, name: 'NurseKaya', score: 15200, round: 10, mode, difficulty, provider: 'kaya', created_at: Date.now() },
          ],
        }),
      });
    });

    await boot(page, '?god&seed=123&leaderboard=https://api.moshi-leaderboard.test');

    const buttonText = await page.evaluate(() => {
      const title = window.game.scene.getScene('Title');
      return title.leaderboardButton?.text;
    });
    expect(buttonText).toContain('LEADERBOARD');

    // Tap leaderboard button
    await tapObject(page, 'Title', 'leaderboardButton');
    await active(page, 'Leaderboard');

    // Verify scene is active and loaded mock scores
    await page.waitForFunction(() => {
      const lb = window.game.scene.getScene('Leaderboard');
      return lb.rowsContainer?.length > 0;
    });

    const rowsCount = await page.evaluate(() => {
      const lb = window.game.scene.getScene('Leaderboard');
      return lb.rowsContainer.length;
    });
    expect(rowsCount).toBeGreaterThan(0);
  });

  test('Toggles mode and difficulty filters in LeaderboardScene', async ({ page }) => {
    const requestedFilters: { mode?: string; difficulty?: string }[] = [];

    await page.route('**/api/scores*', (route) => {
      const url = new URL(route.request().url());
      requestedFilters.push({
        mode: url.searchParams.get('mode') ?? undefined,
        difficulty: url.searchParams.get('difficulty') ?? undefined,
      });

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          scores: [
            { id: 1, name: 'TopDoc', score: 9999, round: 5, mode: 'fluSeason', difficulty: 'trauma', provider: 'eugene' },
          ],
        }),
      });
    });

    await boot(page, '?god&seed=123&leaderboard=https://api.moshi-leaderboard.test');
    await tapObject(page, 'Title', 'leaderboardButton');
    await active(page, 'Leaderboard');

    // Switch mode to Flu Season (modePills[1])
    await page.evaluate(() => {
      const lb = window.game.scene.getScene('Leaderboard');
      lb.modePills[1].emit('pointerup');
    });

    // Switch difficulty to Trauma (diffPills[2])
    await page.evaluate(() => {
      const lb = window.game.scene.getScene('Leaderboard');
      lb.diffPills[2].emit('pointerup');
    });

    await page.waitForFunction(() => {
      const lb = window.game.scene.getScene('Leaderboard');
      return lb.mode === 'fluSeason' && lb.difficulty === 'trauma';
    });

    const state = await page.evaluate(() => {
      const lb = window.game.scene.getScene('Leaderboard');
      return { mode: lb.mode, difficulty: lb.difficulty };
    });
    expect(state).toEqual({ mode: 'fluSeason', difficulty: 'trauma' });

    // Tap BACK and return to Title
    await page.evaluate(() => {
      const lb = window.game.scene.getScene('Leaderboard');
      lb.close();
    });
    await active(page, 'Title');
  });
});
