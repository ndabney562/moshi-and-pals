import { test, expect, start } from '../helpers/game';

test('real speech bubble replaces its text, follows a speaker and expires', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const bubble = scene.patients.eugeneBubble;
    const speaker = { x: 150, y: 200 };
    bubble.say('First response', speaker, 52, 2000);
    bubble.say('Replacement response', speaker, 52, 50);
    speaker.x = 180;
    bubble.follow();
    return { text: bubble.text, x: bubble.x, y: bubble.y };
  });
  expect(result).toEqual({ text: 'Replacement response', x: 180, y: 148 });
  await expect.poll(() => page.evaluate(() => window.game.scene.getScene('Game').patients.eugeneBubble.text)).toBe('');
});
