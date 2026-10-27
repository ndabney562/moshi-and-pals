import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Events: {
      EventEmitter: class {
        emit() {}
        on() {}
        off() {}
        once() {}
      },
    },
  },
}));

import { BALANCE } from '../../src/config/balance';
import { scribeById } from '../../src/data/scribes';
import { savedShift, saveShift, clearSavedShift, type ShiftSave } from '../../src/core/shiftSave';
import { GameEvents } from '../../src/core/events';

describe('distractions and patient imaging (Milestone 3)', () => {
  it('defines the approved distraction and imaging configuration in BALANCE', () => {
    expect(BALANCE.distractions.chancePerRound).toBe(0.18);
    expect(BALANCE.distractions.durationMs).toBe(30000);
    expect(BALANCE.distractions.xrayChancePerRound).toBe(0.20);
    expect(BALANCE.distractions.xrayImagingMs).toBe(20000);
    expect(BALANCE.distractions.interventionRange).toBe(75);
    expect(BALANCE.distractions.eligible).toEqual(['omar', 'alan', 'donald', 'alexandra']);
  });

  it('provides approved in-character distraction and reactivation dialogue for Omar, Alan, and Donald', () => {
    for (const id of ['omar', 'alan', 'donald'] as const) {
      const def = scribeById(id);
      expect(def?.lines.distracted).toBeDefined();
      expect(def?.lines.reactivated).toBeDefined();
      expect(def!.lines.distracted!.length).toBeGreaterThanOrEqual(2);
      expect(def!.lines.reactivated!.length).toBeGreaterThanOrEqual(2);
      for (const line of def!.lines.distracted!) expect(line.length).toBeGreaterThan(5);
      for (const line of def!.lines.reactivated!) expect(line.length).toBeGreaterThan(5);
    }
  });

  it('provides approved in-character patient imaging start and completion dialogue for Donald', () => {
    const donald = scribeById('donald');
    expect(donald?.lines.imaging).toBeDefined();
    expect(donald?.lines.imagingDone).toBeDefined();
    expect(donald!.lines.imaging!.length).toBeGreaterThanOrEqual(2);
    expect(donald!.lines.imagingDone!.length).toBeGreaterThanOrEqual(2);
    for (const line of donald!.lines.imaging!) expect(line.length).toBeGreaterThan(5);
    for (const line of donald!.lines.imagingDone!) expect(line.length).toBeGreaterThan(5);
  });

  it('defines the expected game events for distractions and imaging', () => {
    expect(GameEvents.HelperDistracted).toBe('helper.distracted');
    expect(GameEvents.HelperReactivated).toBe('helper.reactivated');
    expect(GameEvents.ImagingAssigned).toBe('imaging.assigned');
    expect(GameEvents.ImagingCompleted).toBe('imaging.completed');
  });

  it('persists remaining distraction and imaging durations and targets across ShiftSave cycles', () => {
    clearSavedShift();

    const mockSave: ShiftSave = {
      version: 1,
      savedAt: 1000000,
      shift: { difficulty: 'urgent', mods: [], seed: 4242 },
      character: 'eugene',
      specialty: '',
      round: 3,
      score: 1200,
      kills: 45,
      copays: 150,
      bossesDefeated: 0,
      scribeCleans: 2,
      hp: 80,
      maxHp: 100,
      rooms: ['exam1'],
      loadout: [{ id: 'sprayBottle', tier: 1 }],
      slot: 0,
      snacks: [],
      helpers: ['omar', 'donald'],
      distractions: {
        omar: {
          kind: 'distraction',
          label: 'FRESH COFFEE',
          x: 1200,
          y: 700,
          remainingMs: 18500,
        },
        donald: {
          kind: 'imaging',
          label: 'PATIENT IMAGING',
          x: 940,
          y: 1400,
          remainingMs: 12000,
        },
      },
      claimDeniedChance: 0,
      playedMs: 45000,
      stats: {
        kills: {},
        bestStreak: 0,
        copaysEarned: 150,
        crits: 0,
        roomsOpened: 1,
        upgrades: 0,
        rests: 0,
        perfectPours: 0,
        purges: 0,
        patientsCleaned: 2,
        achievements: [],
      },
      cure: {},
    };

    expect(saveShift(mockSave)).toBe(true);
    const loaded = savedShift();
    expect(loaded).toBeDefined();
    expect(loaded?.distractions).toBeDefined();
    expect(loaded?.distractions?.omar).toEqual({
      kind: 'distraction',
      label: 'FRESH COFFEE',
      x: 1200,
      y: 700,
      remainingMs: 18500,
    });
    expect(loaded?.distractions?.donald).toEqual({
      kind: 'imaging',
      label: 'PATIENT IMAGING',
      x: 940,
      y: 1400,
      remainingMs: 12000,
    });

    clearSavedShift();
  });
});
