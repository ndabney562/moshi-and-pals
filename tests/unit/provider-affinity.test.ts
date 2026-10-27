import { expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));
vi.mock('../../src/ui/SpeechBubble', () => ({ SpeechBubble: class {} }));
vi.mock('../../src/core/sfx', () => ({ sfx: {} }));
import { characterById } from '../../src/data/characters';
import { Scribes } from '../../src/systems/Scribes';

it.each([
  ['eugene', 0.75, 15],
  ['kaya', 1, 20],
  ['lucien', 1.5, 30],
  ['ken', 1.25, 25],
] as const)('%s applies the requested combat-helper multiplier exactly once', (provider, multiplier, expected) => {
  expect(characterById(provider).helperDamage).toBe(multiplier);
  const hit = vi.fn();
  const controller = Object.create(Scribes.prototype);
  controller.host = { helperDamage: multiplier, hit };
  const helper = { boost: { power: 1 }, kills: 0 };
  const germ = { active: true };
  controller.strike(helper, germ, 20, 0, 50);
  expect(hit).toHaveBeenCalledWith(germ, expected, 0, 50);
});
it('stacks permanent upgrades without mutating them or compounding the provider bonus per target', () => {
  const hit = vi.fn();
  const controller = Object.create(Scribes.prototype);
  controller.host = { helperDamage: 1.5, hit };
  const helper = { boost: { power: 1.2 }, kills: 0 };
  const germs = [{ active: true }, { active: true }, { active: true }];
  for (const germ of germs) controller.strike(helper, germ, 20, 0, 50);
  expect(hit.mock.calls.map((call) => call[1])).toEqual([36, 36, 36]);
  expect(helper.boost.power).toBe(1.2);
});
it('does not damage an inactive germ or count a kill twice', () => {
  const hit = vi.fn((germ) => { germ.active = false; });
  const controller = Object.create(Scribes.prototype);
  controller.host = { helperDamage: 0.75, hit };
  const helper = { boost: { power: 1 }, kills: 0 };
  const germ = { active: true };
  controller.strike(helper, germ, 20, 0, 0);
  controller.strike(helper, germ, 20, 0, 0);
  expect(hit).toHaveBeenCalledTimes(1);
  expect(helper.kills).toBe(1);
});
