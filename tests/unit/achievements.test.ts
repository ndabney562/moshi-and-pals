import { expect, it, vi } from 'vitest';
vi.mock('../../src/core/events', () => ({ events: { emit: vi.fn() }, GameEvents: { AchievementUnlocked: 'unlocked' } }));

it('unlocks a known achievement only once and emits one announcement', async () => {
  const { ACHIEVEMENTS } = await import('../../src/data/achievements');
  const { events } = await import('../../src/core/events');
  const a = await import('../../src/core/achievements');
  const id = ACHIEVEMENTS[0].id;
  expect(a.unlockAchievement(id)?.id).toBe(id);
  expect(a.unlockAchievement(id)).toBeUndefined();
  expect(a.unlockAchievement('unknown')).toBeUndefined();
  expect(events.emit).toHaveBeenCalledTimes(1);
  vi.resetModules();
  expect((await import('../../src/core/achievements')).hasAchievement(id)).toBe(true);
});
it('filters unrecognized and invalid saved achievement IDs', async () => {
  const { ACHIEVEMENTS } = await import('../../src/data/achievements');
  localStorage.setItem('moshi.achievements.v1', JSON.stringify([ACHIEVEMENTS[0].id, 'missing', 4]));
  const a = await import('../../src/core/achievements');
  expect(a.achievementList().filter((entry) => entry.unlocked).map((entry) => entry.def.id)).toEqual([ACHIEVEMENTS[0].id]);
});
it('keeps achievement unlocks in memory when persistence fails', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const { ACHIEVEMENTS } = await import('../../src/data/achievements');
  const a = await import('../../src/core/achievements');
  expect(a.unlockAchievement(ACHIEVEMENTS[0].id)).toBeDefined();
  expect(a.hasAchievement(ACHIEVEMENTS[0].id)).toBe(true);
});
