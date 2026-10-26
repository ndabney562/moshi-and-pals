import { expect, it, vi } from 'vitest';

it('locks reward rounding and progression calculations', async () => {
  const p = await import('../../src/core/progress');
  expect([0, 1, 2, 3, 4].map((r) => p.creditsFor(r, 0, 0))).toEqual([0, 0, 1, 1, 2]);
  expect(p.creditsFor(5, 2, 1)).toBe(10);
  expect(p.bankFor(103)).toBe(25);
  expect(p.npsFor(0, 0, 0)).toBe(0);
  const { BALANCE } = await import('../../src/config/balance');
  expect(p.npsFor(4, 3, 2)).toBe(4 * BALANCE.nps.perRound + 3 * BALANCE.nps.perPatient + 2 * BALANCE.nps.perBoss);
});
it('banks rewards cumulatively and preserves them across module reloads', async () => {
  const p = await import('../../src/core/progress');
  p.recordShift(10, { basic: 3 }, 20, 100);
  p.recordShift(2, { basic: 2, sprinter: 1 }, 5, 50);
  vi.resetModules();
  expect((await import('../../src/core/progress')).progress()).toMatchObject({ credits: 12, earned: 12, nps: 25, npsEarned: 25, bank: 150, kills: { basic: 5, sprinter: 1 } });
});
it('charges a specialty once, rejects insufficient funds, and requires ownership to equip', async () => {
  const p = await import('../../src/core/progress');
  p.chooseSpecialty('infectiousDisease');
  expect(p.activeSpecialty()).toBeUndefined();
  expect(p.buy('infectiousDisease')).toBe(false);
  p.recordShift(8, {});
  expect(p.buy('infectiousDisease')).toBe(true);
  expect(p.buy('infectiousDisease')).toBe(false);
  expect(p.buy('unknown')).toBe(false);
  expect(p.progress().credits).toBe(0);
  p.chooseSpecialty('infectiousDisease');
  expect(p.activeSpecialty()?.id).toBe('infectiousDisease');
});
it('hires a valid Pal once using NPS rather than CME credits', async () => {
  const p = await import('../../src/core/progress');
  const { CHARACTERS } = await import('../../src/data/characters');
  const kaya = CHARACTERS.find((c) => c.id === 'kaya')!;
  expect(p.doctorUnlocked('eugene')).toBe(true);
  expect(p.hireDoctor('kaya')).toBe(false);
  p.recordShift(1000, {}, kaya.price);
  expect(p.hireDoctor('kaya')).toBe(true);
  expect(p.hireDoctor('kaya')).toBe(false);
  expect(p.hireDoctor('missing')).toBe(false);
  expect(p.progress()).toMatchObject({ credits: 1000, nps: 0 });
  expect(p.doctorUnlocked('kaya')).toBe(true);
});
it('caps locker purchases and skips Overtime for all-shift helpers', async () => {
  const p = await import('../../src/core/progress');
  p.recordShift(0, {}, 0, 10000);
  expect(p.buyStaffLevel('omar')).toBe(false);
  expect(p.unlockScribe('omar')).toBe(true);
  expect(p.unlockScribe('omar')).toBe(false);
  expect(p.staffTiers('omar')).toEqual([0, 2]);
  expect(p.buyStaffLevel('omar')).toBe(true);
  expect(p.buyStaffLevel('omar')).toBe(true);
  expect(p.buyStaffLevel('omar')).toBe(false);
  expect(p.staffBoost('omar')).toEqual({ power: 1.2 * 1.15, speed: 0.8, duration: 1 });
  expect(p.buyLockerLevel('squirtBottle')).toBe(true);
  expect(p.buyLockerLevel('squirtBottle')).toBe(true);
  expect(p.buyLockerLevel('squirtBottle')).toBe(true);
  expect(p.buyLockerLevel('squirtBottle')).toBe(false);
  expect(p.progress().bank).toBe(3600);
});
it('requires the starter kit before choosing a starting tool', async () => {
  const p = await import('../../src/core/progress');
  p.chooseStartTool('uvWand');
  expect(p.progress().startTool).toBe('');
  p.recordShift(15, {});
  expect(p.buy('starterKit')).toBe(true);
  p.chooseStartTool('uvWand');
  expect(p.progress().startTool).toBe('uvWand');
});
it('recovers malformed progress and clamps saved upgrade levels', async () => {
  localStorage.setItem('moshi.progress.v1', JSON.stringify({ credits: -2, nps: 'ten', owned: [3, 'starterKit'], locker: { uv: 999 }, staff: { omar: -1 }, kills: { basic: 2.9 } }));
  const p = await import('../../src/core/progress');
  expect(p.progress()).toMatchObject({ credits: 0, nps: 0, owned: ['starterKit'], locker: { uv: 3 }, staff: { omar: 0 }, kills: { basic: 2 } });
});
it('keeps earned progress in memory when storage throws', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const p = await import('../../src/core/progress');
  p.recordShift(3, { basic: 1 });
  expect(p.progress().credits).toBe(3);
});
