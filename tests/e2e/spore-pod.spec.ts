import { test, expect, start } from '../helpers/game';

test('Spore Pod swaps to cracked-shell texture when flipped and reverts when recovered', async ({ page }) => {
  await start(page, '?god&seed=123');
  await page.waitForFunction(() => !window.game.scene.getScene('Game').cameras.main.fadeEffect.isRunning);

  // Spawn a Spore Pod and verify its initial upright texture
  const initial = await page.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    for (const c of g.germs.getChildren()) {
      if (c.active) c.kill();
    }
    g.spawnGerm('sporePod', { hpMult: 1, speedMult: 1 });
    const germ = g.germs.getChildren().find((c: any) => c.active && c.def.id === 'sporePod');
    germ.setPosition(g.player.x + 80, g.player.y);
    return {
      texture: germ.texture.key,
      isFlipped: germ.isFlipped(g.time.now),
      armorFront: g.armorMult(germ, Math.PI, false, g.time.now),
      armorBack: g.armorMult(germ, 0, false, g.time.now),
    };
  });

  expect(initial.texture).toBe('germ-sporePod');
  expect(initial.isFlipped).toBe(false);
  expect(initial.armorFront).toBe(0.25);
  expect(initial.armorBack).toBe(1.5);

  // Trigger Sinus Purge to flip the Spore Pod
  const flipped = await page.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    const germ = g.livingGerms().find((x: any) => x.def.id === 'sporePod');
    g.purgeReadyAt = 0;
    g.sinusPurge(g.time.now);
    return {
      texture: germ.texture.key,
      isFlipped: germ.isFlipped(g.time.now + 1),
      armorFlippedFace: g.armorMult(germ, Math.PI, false, g.time.now + 1),
    };
  });

  expect(flipped.texture).toBe('germ-sporePod-flipped');
  expect(flipped.isFlipped).toBe(true);
  expect(flipped.armorFlippedFace).toBe(1.5);

  // Advance time past flip duration (2000ms) and update germ
  const recovered = await page.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    const germ = g.livingGerms().find((x: any) => x.def.id === 'sporePod');
    const futureTime = g.time.now + 2500;
    germ.chase(g.player, futureTime, 16);
    germ.rotation = 0;
    return {
      texture: germ.texture.key,
      isFlipped: germ.isFlipped(futureTime),
      armorFrontRecovered: g.armorMult(germ, Math.PI, false, futureTime),
    };
  });

  expect(recovered.texture).toBe('germ-sporePod');
  expect(recovered.isFlipped).toBe(false);
  expect(recovered.armorFrontRecovered).toBe(0.25);
});
