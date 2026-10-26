import { expect, it } from 'vitest';

it('selects the same unique modifiers and seed for a daily date', async () => {
  const { dailyShift } = await import('../../src/core/shift');
  const a = dailyShift('2026-10-26');
  expect(a).toEqual(dailyShift('2026-10-26'));
  expect(a.difficulty).toBe('urgent');
  expect(a.mods).toHaveLength(2);
  expect(new Set(a.mods).size).toBe(2);
  expect(a.seed).not.toBe(dailyShift('2026-10-27').seed);
});
it('formats the local calendar date rather than a UTC timestamp', async () => {
  const { localDate } = await import('../../src/core/shift');
  expect(localDate(new Date(2026, 0, 2, 23, 59))).toBe('2026-01-02');
});
it('switches between daily and normal shifts with saved difficulty', async () => {
  localStorage.setItem('moshi.settings.v1', '{"difficulty":"walkIn"}');
  const { chooseShift, nextShift } = await import('../../src/core/shift');
  chooseShift('2026-10-26');
  expect(nextShift()).toMatchObject({ daily: '2026-10-26', difficulty: 'urgent' });
  chooseShift();
  expect(nextShift()).toMatchObject({ difficulty: 'walkIn', mods: [] });
  expect(nextShift().daily).toBeUndefined();
});
it('falls back to Urgent for unknown saved difficulty and honors test seeds', async () => {
  window.history.replaceState({}, '', '?seed=123&mods=fullMoon,unknown,fullMoon');
  localStorage.setItem('moshi.settings.v1', '{"difficulty":"unknown"}');
  const { nextShift } = await import('../../src/core/shift');
  expect(nextShift()).toEqual({ difficulty: 'urgent', mods: ['fullMoon'], seed: 123 });
});
