import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Events: {
      EventEmitter: class {
        private l = new Map<string, Set<Function>>();
        emit(e: string, ...args: unknown[]) { this.l.get(e)?.forEach((fn) => fn(...args)); return true; }
        on(e: string, fn: Function) { (this.l.get(e) ?? this.l.set(e, new Set()).get(e)!).add(fn); return this; }
        off(e: string, fn: Function) { this.l.get(e)?.delete(fn); return this; }
        once(e: string, fn: Function) { const wrap = (...args: unknown[]) => { this.off(e, wrap); fn(...args); }; return this.on(e, wrap); }
      },
    },
  },
}));

import { BALANCE } from '../../src/config/balance';
import { chooseShift, nextShift } from '../../src/core/shift';
import { saveShift, savedShift, clearSavedShift, type ShiftSave } from '../../src/core/shiftSave';
import { loadSave, recordRun, fluSeasonBest } from '../../src/core/save';
import { WaveDirector } from '../../src/systems/WaveDirector';
import { events, GameEvents } from '../../src/core/events';

describe('Endless Flu Season Mode', () => {
  beforeEach(() => {
    localStorage.clear();
    chooseShift();
  });

  it('keeps the fluSeason modifier distinct from fluSeasonMode configuration', () => {
    expect(BALANCE.modifiers.fluSeason).toBeDefined();
    expect(BALANCE.fluSeasonMode).toBeDefined();
    expect(BALANCE.fluSeasonMode.supplyWindowMs).toBe(2000);
    expect(BALANCE.fluSeasonMode.firstRoundDelayMs).toBe(1500);
    expect(BALANCE.fluSeasonMode.maxWaveBreatherMs).toBe(3500);
  });

  it('configures ShiftSetup mode and round-trips via ShiftSave', () => {
    chooseShift(undefined, 'fluSeason');
    const shift = nextShift();
    expect(shift.mode).toBe('fluSeason');

    const saveObj: ShiftSave = {
      version: 1,
      savedAt: 12345,
      shift,
      character: 'eugene',
      specialty: '',
      round: 3,
      score: 1500,
      kills: 25,
      copays: 300,
      bossesDefeated: 0,
      scribeCleans: 0,
      hp: 100,
      maxHp: 100,
      rooms: ['room1'],
      loadout: [{ id: 'squirtBottle', tier: 1 }],
      slot: 0,
      snacks: [],
      helpers: [],
      claimDeniedChance: 0,
      playedMs: 45000,
      stats: {
        kills: {},
        achievements: [],
        bestStreak: 5,
        copaysEarned: 300,
        crits: 2,
        perfectPours: 1,
        upgrades: 0,
        roomsOpened: 1,
        patientsCleaned: 0,
        rests: 0,
        purges: 0,
      },
      cure: {},
    };

    expect(saveShift(saveObj)).toBe(true);
    const restored = savedShift();
    expect(restored?.shift.mode).toBe('fluSeason');
    clearSavedShift();
  });

  it('separates Endless Flu Season scores from standard difficulty personal records', () => {
    recordRun(2000, 5, 10, 50, 'urgent', undefined, 'standard');
    expect(loadSave().records.urgent.bestScore).toBe(2000);
    expect(fluSeasonBest('urgent').bestScore).toBe(0);

    recordRun(4500, 8, 14, 90, 'urgent', undefined, 'fluSeason');
    expect(loadSave().records.urgent.bestScore).toBe(2000);
    expect(fluSeasonBest('urgent').bestScore).toBe(4500);
    expect(fluSeasonBest('urgent').bestRound).toBe(8);
  });

  it('WaveDirector uses outbreak pressure and short supply windows in fluSeason mode', () => {
    const director = new WaveDirector(1000, 1, 'fluSeason');
    expect(director.mode).toBe('fluSeason');

    const startedEvents: any[] = [];
    const completedEvents: any[] = [];
    events.on(GameEvents.RoundStarted, (e: any) => startedEvents.push(e));
    events.on(GameEvents.RoundCompleted, (e: any) => completedEvents.push(e));

    // Delay before wave 1 is 1500ms (1000 + 1500 = 2500)
    director.update(2400, 0, () => false);
    expect(director.roundActive).toBe(false);

    director.update(2500, 0, () => false);
    expect(director.roundActive).toBe(true);
    expect(director.round).toBe(1);
    expect(startedEvents.length).toBe(1);
    expect(startedEvents[0].mode).toBe('fluSeason');

    // Flu Season round 1 base count is 14 germs
    const spawned: string[] = [];
    let time = 2800;
    while (director.spawning && time < 20000) {
      director.update(time, 3, (germId) => {
        spawned.push(germId);
        return true;
      });
      time += 300;
    }
    expect(spawned.length).toBe(14);
    // Viral sprinters appear from round 1
    expect(spawned).toContain('sprinter');
    expect(director.roundActive).toBe(true);

    // Continuous waves: when queue is empty and only 2 germs remain, wave completes
    director.update(time, 2, () => false);
    expect(director.roundActive).toBe(false);
    expect(completedEvents.length).toBe(1);
    expect(completedEvents[0].mode).toBe('fluSeason');

    // Supply window is 2000ms
    director.update(time + 1999, 0, () => false);
    expect(director.roundActive).toBe(false);

    director.update(time + 2000, 0, () => false);
    expect(director.roundActive).toBe(true);
    expect(director.round).toBe(2);
  });
});
