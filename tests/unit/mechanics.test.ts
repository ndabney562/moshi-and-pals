import { beforeEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';

// Rendering and physics pools are external dependencies; these tests run the real Sprayer logic.
vi.mock('phaser', () => ({ default: { Math: { DegToRad: (n: number) => n * Math.PI / 180, FloatBetween: (a: number, b: number) => (a + b) / 2 } } }));
vi.mock('../../src/core/events', () => ({ events: { emit: vi.fn() }, GameEvents: { EquipmentChanged: 'changed', EquipmentEmpty: 'empty', EquipmentRefilled: 'refilled' } }));
import { Sprayer, withLocker } from '../../src/systems/Sprayer';
import { EQUIPMENT } from '../../src/data/equipment';
import { BALANCE } from '../../src/config/balance';

let tool: Sprayer;
beforeEach(() => { tool = new Sprayer(EQUIPMENT.squirtBottle, { get: () => null } as unknown as Phaser.Physics.Arcade.Group); });
it('consumes supply once and respects the firing cooldown boundary', () => {
  const initial = tool.ammo;
  expect(tool.tryFire(0, 0, 0, 0)).toBe('fired');
  expect(tool.ammo).toBe(initial - tool.def.costPerShot);
  expect(tool.tryFire(0, 0, 0, tool.def.fireIntervalMs - 1)).toBe('wait');
  expect(tool.tryFire(0, 0, 0, tool.def.fireIntervalMs)).toBe('fired');
});
it('cannot fire empty or while refilling', () => {
  tool.ammo = 0;
  expect(tool.tryFire(0, 0, 0, 0)).toBe('empty');
  expect(tool.startRefill(0)).toBe(true);
  expect(tool.tryFire(0, 0, 0, 1000)).toBe('wait');
});
it('refills at the deadline and conserves remaining jug supply', () => {
  tool.ammo = 0;
  tool.reserve = 7;
  tool.startRefill(100);
  tool.update(100 + tool.def.refillMs - 1);
  expect(tool.ammo).toBe(0);
  tool.update(100 + tool.def.refillMs);
  expect(tool.ammo).toBe(7);
  expect(tool.reserve).toBe(0);
  expect(tool.refilling).toBe(false);
  expect(tool.startRefill(10000)).toBe(false);
});
it.each([BALANCE.pour.windowStart, BALANCE.pour.windowEnd])('accepts perfect pour at the inclusive window boundary %s', (fraction) => {
  tool.ammo = 0;
  tool.startRefill(100);
  const now = 100 + tool.def.refillMs * fraction;
  expect(tool.pourTap(now)).toBe('perfect');
  expect(tool.ammo).toBe(tool.def.capacity);
  expect(tool.fresh(now)).toBe(true);
  expect(tool.fresh(now + BALANCE.pour.freshMs)).toBe(false);
});
it('applies at most one spill penalty per refill', () => {
  tool.ammo = 0;
  tool.startRefill(100);
  expect(tool.pourTap(101)).toBe('spill');
  expect(tool.pourTap(102)).toBe('none');
  tool.update(100 + tool.def.refillMs);
  expect(tool.refilling).toBe(true);
  tool.update(100 + tool.def.refillMs + BALANCE.pour.spillMs);
  expect(tool.refilling).toBe(false);
});
it('retains supply proportions when upgrading and stops at the final tier', () => {
  tool.ammo /= 2;
  tool.reserve /= 2;
  expect(tool.upgrade(0)).toBeDefined();
  expect(tool.ammo).toBe(tool.def.capacity / 2);
  expect(tool.reserve).toBe(tool.maxReserve / 2);
  expect(tool.def.range).toBe(280);
  expect(tool.upgrade(1)).toBeDefined();
  expect(tool.upgrade(2)).toBeUndefined();
});
it('stacks permanent locker damage, supply and interval upgrades', () => {
  const base = EQUIPMENT.squirtBottle;
  expect(withLocker(base, 0)).toBe(base);
  expect(withLocker(base, 3)).toMatchObject({ damage: base.damage * 1.1 * 1.1, capacity: Math.round(base.capacity * 1.25), fireIntervalMs: Math.round(base.fireIntervalMs * 0.9) });
});
it('fires for free only before the power-up expiration', () => {
  tool.ammo = 0;
  tool.freeUntil = 1000;
  expect(tool.tryFire(0, 0, 0, 0)).toBe('fired');
  expect(tool.ammo).toBe(0);
  expect(tool.tryFire(0, 0, 0, 1000)).toBe('empty');
});
