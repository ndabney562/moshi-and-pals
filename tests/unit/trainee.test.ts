import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { scribeById } from '../../src/data/scribes';
import { savedShift, saveShift, clearSavedShift, type ShiftSave } from '../../src/core/shiftSave';

describe('trainees (Milestone 2)', () => {
  it('defines the approved trainee configuration in BALANCE', () => {
    expect(BALANCE.trainees.statMult).toBe(0.33);
    expect(BALANCE.trainees.durationMs).toBe(40000);
    expect(BALANCE.trainees.eligible).toEqual(['omar', 'selina', 'elaine']);
  });

  it('marks Omar, Selina, and Elaine as trainee-eligible, and Alan and Donald as ineligible', () => {
    const omar = scribeById('omar');
    const selina = scribeById('selina');
    const elaine = scribeById('elaine');
    const alan = scribeById('alan');
    const donald = scribeById('donald');

    expect(omar?.traineeEligible).toBe(true);
    expect(selina?.traineeEligible).toBe(true);
    expect(elaine?.traineeEligible).toBe(true);
    expect(alan?.traineeEligible).toBeFalsy();
    expect(donald?.traineeEligible).toBeFalsy();
  });

  it('provides approved in-character trainee arrival and sign-off dialogue lines', () => {
    for (const id of ['omar', 'selina', 'elaine'] as const) {
      const def = scribeById(id);
      expect(def?.lines.traineeStart).toBeDefined();
      expect(def?.lines.traineeEnd).toBeDefined();
      expect(def!.lines.traineeStart!.length).toBeGreaterThanOrEqual(2);
      expect(def!.lines.traineeEnd!.length).toBeGreaterThanOrEqual(2);
      for (const line of def!.lines.traineeStart!) expect(line.length).toBeGreaterThan(5);
      for (const line of def!.lines.traineeEnd!) expect(line.length).toBeGreaterThan(5);
    }
  });

  it('calculates the exact 67% slowdown and ~3.03x interval expansion for combat helpers (Omar)', () => {
    const statMult = BALANCE.trainees.statMult;
    const baseSpeed = BALANCE.scribes.speed;
    const traineeSpeed = baseSpeed * statMult;
    expect(traineeSpeed).toBeCloseTo(baseSpeed * 0.33, 4);

    const baseEveryMs = BALANCE.scribes.omar.everyMs;
    // Rate is reduced to 33%, changing the interval by division: interval / 0.33
    const traineeEveryMs = baseEveryMs / statMult;
    expect(traineeEveryMs).toBeCloseTo(baseEveryMs * 3.0303, 1);

    const baseDmg = BALANCE.scribes.omar.damage;
    const traineeDmg = baseDmg * statMult;
    expect(traineeDmg).toBeCloseTo(baseDmg * 0.33, 4);

    // Compounding DPS = (damage * 0.33) / (everyMs / 0.33) = (damage / everyMs) * (0.33^2) ~ 10.89%
    const baseDps = baseDmg / baseEveryMs;
    const traineeDps = traineeDmg / traineeEveryMs;
    expect(traineeDps / baseDps).toBeCloseTo(0.1089, 4);
  });

  it('calculates the exact 67% slowdown and ~3.03x interval expansion for front desk PSRs (Selina and Elaine)', () => {
    const statMult = BALANCE.trainees.statMult;

    // Selina
    const selinaBaseCheckIn = BALANCE.frontDesk.selina.checkInMs;
    const selinaTraineeCheckIn = selinaBaseCheckIn / statMult;
    expect(selinaTraineeCheckIn).toBeCloseTo(selinaBaseCheckIn * 3.0303, 1);

    const selinaBaseCopays = BALANCE.frontDesk.selina.copays;
    const selinaTraineeCopays = Math.round(selinaBaseCopays * statMult);
    expect(selinaTraineeCopays).toBe(Math.round(5 * 0.33)); // 2 copays

    // Elaine
    const elaineBaseCheckIn = BALANCE.frontDesk.elaine.checkInMs;
    const elaineTraineeCheckIn = elaineBaseCheckIn / statMult;
    expect(elaineTraineeCheckIn).toBeCloseTo(elaineBaseCheckIn * 3.0303, 1);

    const elaineBaseCopays = BALANCE.frontDesk.elaine.copays;
    const elaineTraineeCopays = Math.round(elaineBaseCopays * statMult);
    expect(elaineTraineeCopays).toBe(Math.round(25 * 0.33)); // 8 copays
  });

  it('persists remaining trainee game-time duration across ShiftSave cycles', () => {
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
      helpers: ['omar'],
      trainees: { omar: 25400 },
      claimDeniedChance: 0.1,
      playedMs: 65000,
      stats: {
        kills: {},
        bestStreak: 12,
        copaysEarned: 150,
        crits: 5,
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
    expect(loaded?.trainees).toEqual({ omar: 25400 });

    clearSavedShift();
  });
});
