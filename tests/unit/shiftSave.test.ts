import { expect, it, vi } from 'vitest';
import { clearSavedShift, savedShift, saveShift, type ShiftSave } from '../../src/core/shiftSave';

const fixture = () => ({
  version: 1, savedAt: 1000, shift: { difficulty: 'urgent', seed: 123, mods: [] },
  character: 'kaya', specialty: '', round: 4, score: 1234, kills: 15, copays: 250,
  bossesDefeated: 1, scribeCleans: 2, hp: 70, maxHp: 100, rooms: ['lab'],
  loadout: [{ id: 'squirtBottle', tier: 1 }], slot: 0, snacks: [], helpers: ['omar'],
  claimDeniedChance: 0, playedMs: 10000, stats: { kills: { basic: 15 }, achievements: [] }, cure: { phone: true },
} as unknown as ShiftSave);

it('round-trips a saved shift and removes it when consumed', () => {
  expect(savedShift()).toBeUndefined();
  expect(saveShift(fixture())).toBe(true);
  expect(savedShift()).toEqual(fixture());
  clearSavedShift();
  expect(savedShift()).toBeUndefined();
});
it.each(['{bad', 'null', '{"version":2}', '{"version":1,"shift":{"difficulty":"missing","seed":1}}'])('rejects unusable saved shifts: %s', (raw) => {
  localStorage.setItem('moshi.shift.v1', raw);
  expect(savedShift()).toBeUndefined();
});
it('rejects a shift without tools', () => {
  localStorage.setItem('moshi.shift.v1', JSON.stringify({ ...fixture(), loadout: [] }));
  expect(savedShift()).toBeUndefined();
});
it('sanitizes saved values and discards unsupported modifiers', () => {
  localStorage.setItem('moshi.shift.v1', JSON.stringify({ ...fixture(), round: -1, score: -1, slot: 99, rooms: ['lab', 4], shift: { difficulty: 'urgent', seed: 123, mods: ['fullMoon', 'unknown'] }, cure: { phone: true, invalid: 'yes' } }));
  expect(savedShift()).toMatchObject({ round: 1, score: 0, slot: 0, rooms: ['lab'], shift: { mods: ['fullMoon'] }, cure: { phone: true } });
});
it('reports a failed write and safely handles inaccessible storage', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
  expect(saveShift(fixture())).toBe(false);
  expect(savedShift()).toBeUndefined();
  expect(clearSavedShift).not.toThrow();
});
