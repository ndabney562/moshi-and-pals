import { expect, it, vi } from 'vitest';
import { hasNativeHost, postNativeMessage } from '../../src/core/platform';
import { resetInputState, inputState } from '../../src/core/inputState';
import { joystickAmount } from '../../src/core/mechanics';

it('requires both the native query and a callable host', () => {
  expect(hasNativeHost({ location: { search: '?native', protocol: 'https:' } })).toBe(false);
  expect(hasNativeHost({ location: { search: '', protocol: 'moshi:' }, webkit: { messageHandlers: { moshi: { postMessage: vi.fn() } } } })).toBe(false);
  expect(hasNativeHost({ location: { search: '?native', protocol: 'moshi:' }, webkit: { messageHandlers: { moshi: { postMessage: vi.fn() } } } })).toBe(true);
  expect(postNativeMessage({ type: 'ready' })).toBe(false);
});
it('clears every pending control and pointer without replacing the shared input object', () => {
  const reference = inputState;
  Object.assign(inputState, { moveX: 1, moveY: 1, aimX: 0, aimY: -1, aiming: true, firing: true, refillRequested: true, purgeRequested: true, interactRequested: true, swapRequested: true, mouseActive: true });
  resetInputState();
  expect(inputState).toBe(reference);
  expect(inputState).toMatchObject({ moveX: 0, moveY: 0, aimX: 1, aimY: 0, aiming: false, firing: false, refillRequested: false, purgeRequested: false, interactRequested: false, swapRequested: false, mouseActive: false });
});
it('handles resting thumbs, dead zone boundaries and drags beyond the joystick', () => {
  expect(joystickAmount(0, 80, 0.15)).toBe(0);
  expect(joystickAmount(12, 80, 0.15)).toBe(0);
  expect(joystickAmount(46, 80, 0.15)).toBeCloseTo(0.5);
  expect(joystickAmount(800, 80, 0.15)).toBe(1);
});
