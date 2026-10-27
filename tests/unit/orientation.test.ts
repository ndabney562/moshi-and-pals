import { expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));
import { applyOrientation, isPortrait, rotateInsets } from '../../src/core/orientation';
import { readSafeArea } from '../../src/core/safeArea';

function screen(width: number, height: number, coarse = true) {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height);
  vi.stubGlobal('matchMedia', () => ({ matches: coarse }));
}
it('rotates a coarse-pointer portrait screen and its safe areas', () => {
  document.body.innerHTML = '<div id="game"></div>';
  screen(393, 852);
  expect(isPortrait()).toBe(true);
  applyOrientation();
  const game = document.getElementById('game')!;
  expect(game.style.width).toBe('852px');
  expect(game.style.height).toBe('393px');
  expect(document.body.classList.contains('portrait')).toBe(true);
  expect(rotateInsets({ top: 1, right: 2, bottom: 3, left: 4 })).toEqual({ left: 1, top: 2, right: 3, bottom: 4 });
  screen(852, 393);
  applyOrientation();
  expect(game.style.width).toBe('852px');
  expect(game.style.height).toBe('393px');
  expect(game.style.left).toBe('');
  expect(document.body.classList.contains('portrait')).toBe(false);
});
it('keeps a portrait desktop unrotated and handles a missing safe-area probe', () => {
  document.body.innerHTML = '';
  screen(393, 852, false);
  expect(isPortrait()).toBe(false);
  expect(readSafeArea()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  expect(applyOrientation).not.toThrow();
});

it('uses the visible viewport and actual canvas scale for safe-area conversion', () => {
  document.body.innerHTML = '<div id="safe-area-probe" style="padding:10px 20px 30px 40px"></div><canvas></canvas>';
  screen(1200, 800);
  vi.stubGlobal('visualViewport', { width: 1000, height: 600 });
  vi.spyOn(document.querySelector('canvas')!, 'getBoundingClientRect').mockReturnValue({ width: 960, height: 540 } as DOMRect);
  const insets = readSafeArea();
  expect(insets.top).toBeCloseTo(13.333333);
  expect(insets.right).toBeCloseTo(26.666667);
  expect(insets.bottom).toBe(40);
  expect(insets.left).toBeCloseTo(53.333333);
});
