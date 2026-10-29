import { test, expect, active, start, tapObject } from '../helpers/game';

test('portrait rotates the canvas and a touch starts the game', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('./?god&seed=123');
  await active(page, 'Title');
  await expect(page.locator('body')).toHaveClass(/portrait/);
  await tapObject(page, 'Title', 'tap');
  await active(page, 'Hud');
  const bounds = await page.locator('canvas').boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(394);
  expect(bounds!.height).toBeLessThanOrEqual(853);
});
test('resizing preserves the run and control bounds', async ({ page }) => {
  await start(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect.poll(() => page.evaluate(() => window.game.canvas.getBoundingClientRect().width)).toBeLessThanOrEqual(1025);
  expect(await page.evaluate(() => window.game.scene.isActive('Game'))).toBe(true);
  const pause = await page.evaluate(() => { const hud = window.game.scene.getScene('Hud'); return { x: hud.pauseButton.x, y: hud.pauseButton.y, width: window.game.scale.width, height: window.game.scale.height }; });
  expect(pause.x).toBeGreaterThan(0);
  expect(pause.x).toBeLessThan(pause.width);
  expect(pause.y).toBeLessThan(pause.height);
});

test('30 FPS mode limits scene updates rather than browser animation callbacks', async ({ page }) => {
  await start(page, '?god&seed=123&fps=30');
  const result = await page.evaluate(() => new Promise<{ fps: number; limit: number }>((resolve) => {
    const scene = window.game.scene.getScene('Game');
    let frames = 0;
    const started = performance.now();
    const count = () => frames++;
    scene.events.on('update', count);
    setTimeout(() => {
      scene.events.off('update', count);
      resolve({ fps: frames * 1000 / (performance.now() - started), limit: window.game.loop.fpsLimit });
    }, 1500);
  }));
  expect(result.limit).toBe(30);
  expect(result.fps).toBeGreaterThan(0);
  expect(result.fps).toBeLessThanOrEqual(34);
});

test('cancelling a touch releases the joystick and pauses safely', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const hud = window.game.scene.getScene('Hud');
    hud.moveStick.start({ id: 1, x: 100, y: 300 });
    hud.moveStick.move({ id: 1, x: 160, y: 300 });
    document.dispatchEvent(new Event('touchcancel'));
  });
  await page.waitForFunction(() => window.game.scene.isPaused('Game'));
  expect(await page.evaluate(() => {
    const stick = window.game.scene.getScene('Hud').moveStick;
    return { active: stick.active, x: stick.value.x, y: stick.value.y };
  })).toEqual({ active: false, x: 0, y: 0 });
});

test('reduced motion prevents title pulsing and speech-bubble bounce', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('moshi.settings.v1', '{"reducedMotion":true}'));
  await start(page);
  expect(await page.evaluate(() => {
    const scene = window.game.scene.getScene('Game');
    const bubble = scene.patients.eugeneBubble;
    bubble.say('Steady dialogue', { x: 100, y: 200 }, 52, 2000);
    return { scale: bubble.scaleX, tweens: scene.tweens.getTweensOf(bubble).length };
  })).toEqual({ scale: 1, tweens: 0 });
});

test('waking the native game reconciles orientation even when resize events are missed', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.addInitScript(() => {
    const listen = window.addEventListener.bind(window);
    (window as any).addEventListener = (event: string, ...args: any[]) => {
      if (!['resize', 'orientationchange'].includes(event)) (listen as any)(event, ...args);
    };
    if (window.visualViewport) {
      const visualListen = window.visualViewport.addEventListener.bind(window.visualViewport);
      (window.visualViewport as any).addEventListener = (event: string, ...args: any[]) => {
        if (event !== 'resize') (visualListen as any)(event, ...args);
      };
    }
    window.__native = [];
    (window as any).webkit = { messageHandlers: { moshi: { postMessage: (message: unknown) => window.__native.push(message) } } };
  });
  await page.goto('./?native&god&seed=123');
  await page.waitForFunction(() => window.__native.some((message) => message.type === 'ready'));
  await page.evaluate(() => window.game.loop.sleep());
  await page.setViewportSize({ width: 852, height: 393 });
  await page.evaluate(() => window.moshiNative.start());
  await active(page, 'Hud');
  await expect(page.locator('body')).not.toHaveClass(/portrait/);
  await expect.poll(() => page.locator('#game').evaluate((parent) => parent.getBoundingClientRect().height)).toBe(393);
  await expect.poll(() => page.locator('canvas').evaluate((canvas) => canvas.getBoundingClientRect().bottom)).toBeLessThanOrEqual(394);
});
