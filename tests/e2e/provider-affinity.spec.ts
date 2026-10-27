import { test, expect, start } from '../helpers/game';

for (const [provider, baseDamage, upgradedDamage] of [
  ['eugene', 15, 18],
  ['kaya', 20, 24],
  ['lucien', 30, 36],
  ['ken', 25, 30],
] as const) {
  test(`${provider} applies combat-helper affinity through the real damage path`, async ({ page }) => {
    await start(page, `?god&seed=123&doctor=${provider}&scribe=omar`);
    const result = await page.evaluate(() => {
      const game = window.game.scene.getScene('Game');
      const helper = game.scribes.get('omar');
      if (!helper) throw new Error('Debug helper did not enter the shift');
      game.spawnGermAt('basic', game.player.x + 180, game.player.y, true);
      const germ = game.germs.getChildren().find((entry: any) => entry.active && entry.def.id === 'basic');
      germ.hp = 1000;
      germ.shield = 0;
      const initialPower = helper.boost.power;
      game.scribes.strike(helper, germ, 20, 0, 0);
      const base = 1000 - germ.hp;
      helper.boost.power = 1.2;
      const before = germ.hp;
      game.scribes.strike(helper, germ, 20, 0, 0);
      return { provider: game.character.id, initialPower, base, upgraded: before - germ.hp, afterPower: helper.boost.power };
    });
    expect(result).toEqual({ provider, initialPower: 1, base: baseDamage, upgraded: upgradedDamage, afterPower: 1.2 });
  });
}
