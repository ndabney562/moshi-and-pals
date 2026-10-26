import { describe, expect, it, vi } from 'vitest';
import { dailyBest, loadSave, recordRun } from '../../src/core/save';

describe('records and migrations', () => {
  it('starts with independent zero records for each difficulty', () => {
    const save = loadSave();
    expect(save.version).toBe(3);
    expect(save.runs).toBe(0);
    expect(save.records.urgent).toEqual({ bestScore: 0, bestRound: 0, bestStreak: 0 });
    expect(save.records.walkIn).not.toBe(save.records.urgent);
  });
  it.each(['v1', 'v2'])('migrates %s records into Urgent without affecting other difficulties', (version) => {
    localStorage.setItem(`moshi.save.${version}`, JSON.stringify({ bestScore: 123, bestRound: 6, bestStreak: 8, totalKills: 25, runs: 3 }));
    expect(loadSave()).toMatchObject({ records: { urgent: { bestScore: 123, bestRound: 6, bestStreak: 8 }, walkIn: { bestScore: 0 } }, totalKills: 25, runs: 3 });
  });
  it('prefers current records over old saves', () => {
    localStorage.setItem('moshi.save.v1', '{"bestScore":999}');
    localStorage.setItem('moshi.save.v3', '{"records":{"urgent":{"bestScore":50}}}');
    expect(loadSave().records.urgent.bestScore).toBe(50);
  });
  it.each(['{broken', 'null', '42', '"oops"'])('recovers from unreadable save %s', (raw) => {
    localStorage.setItem('moshi.save.v3', raw);
    expect(loadSave().runs).toBe(0);
  });
  it('sanitizes negative, fractional and incorrectly typed saved numbers', () => {
    localStorage.setItem('moshi.save.v3', JSON.stringify({ records: { urgent: { bestScore: -1, bestRound: 4.9, bestStreak: '9' } }, runs: -2 }));
    expect(loadSave().records.urgent).toEqual({ bestScore: 0, bestRound: 4, bestStreak: 0 });
    expect(loadSave().runs).toBe(0);
  });
  it('keeps best results, counts runs and kills, and separates difficulties', () => {
    recordRun(100, 4, 5, 10, 'walkIn');
    const second = recordRun(80, 3, 2, 7, 'walkIn');
    expect(second).toMatchObject({ newBestScore: false, newBestRound: false, newBestStreak: false });
    expect(loadSave()).toMatchObject({ runs: 2, totalKills: 17, records: { walkIn: { bestScore: 100, bestRound: 4, bestStreak: 5 }, urgent: { bestScore: 0 } } });
  });
  it('awards first daily completion once per date without overwriting normal records', () => {
    expect(recordRun(100, 4, 3, 5, 'urgent', '2026-10-26').firstDailyToday).toBe(true);
    expect(recordRun(90, 3, 2, 4, 'urgent', '2026-10-26').firstDailyToday).toBe(false);
    expect(dailyBest('2026-10-26')).toMatchObject({ bestScore: 100, bestRound: 4, finished: 2 });
    expect(dailyBest('2026-10-27')).toEqual({ bestScore: 0, bestRound: 0, finished: 0 });
    expect(loadSave().records.urgent.bestScore).toBe(0);
    expect(recordRun(20, 1, 0, 1, 'urgent', '2026-10-27').firstDailyToday).toBe(true);
  });
  it('survives storage reads and writes being denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(loadSave().runs).toBe(0);
    expect(recordRun(100, 2).save.runs).toBe(1);
  });
});
