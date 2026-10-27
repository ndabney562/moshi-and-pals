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
import { scribeById, scribeUnlockId } from '../../src/data/scribes';

describe('Alexandra (Milestone 4)', () => {
  it('defines the approved Alexandra configuration in SCRIBES', () => {
    const alexandra = scribeById('alexandra');
    expect(alexandra).toBeDefined();
    expect(alexandra?.name).toBe('Alexandra');
    expect(alexandra?.role).toBe('ESSENCE SCRIBE');
    expect(alexandra?.cost).toBe(50);
    expect(alexandra?.color).toBe(0x80ed99);
    expect(alexandra?.traineeEligible).toBe(false);
    expect(alexandra?.waitsIn).toBeDefined();
    expect(alexandra?.waitsIn?.length).toBeGreaterThan(0);
    expect(scribeUnlockId('alexandra')).toBe('scribe:alexandra');
  });

  it('provides approved in-character dialogue lines for Alexandra', () => {
    const alexandra = scribeById('alexandra');
    expect(alexandra?.lines.arrive.length).toBeGreaterThanOrEqual(2);
    expect(alexandra?.lines.attack.length).toBeGreaterThanOrEqual(2);
    expect(alexandra?.lines.clean.length).toBeGreaterThanOrEqual(2);
    expect(alexandra?.lines.block?.length).toBeGreaterThanOrEqual(2);
    expect(alexandra?.lines.leave.length).toBeGreaterThanOrEqual(1);
    expect(alexandra?.lines.distracted?.length).toBeGreaterThanOrEqual(2);
    expect(alexandra?.lines.reactivated?.length).toBeGreaterThanOrEqual(2);
  });

  it('defines combat stats that exceed other scribes combined combat output', () => {
    const cfg = BALANCE.scribes;
    const alex = cfg.alexandra;
    expect(alex).toBeDefined();
    expect(alex.everyMs).toBe(700);
    expect(alex.damage).toBe(45);
    expect(alex.targets).toBe(4);
    expect(alex.range).toBe(360);
    expect(alex.knockback).toBe(100);
    expect(alex.stunMs).toBe(250);

    // Baseline DPS calculation
    const omarDps = cfg.omar.damage / (cfg.omar.everyMs / 1000);
    const alanDps = (cfg.alan.damage * (cfg.alan.chain + 1)) / (cfg.alan.everyMs / 1000);
    const donaldSingleDps = cfg.donald.damage / (cfg.donald.everyMs / 1000);
    // Combined output of other scribes against multiple targets
    const otherScribesCombinedDps = omarDps + alanDps + donaldSingleDps;

    const alexandraSingleDps = alex.damage / (alex.everyMs / 1000);
    const alexandraMultiDps = (alex.damage * alex.targets) / (alex.everyMs / 1000);

    // Alexandra single target exceeds Omar single target
    expect(alexandraSingleDps).toBeGreaterThan(omarDps);
    // Alexandra multi-target output exceeds Omar, Alan, and Donald combined
    expect(alexandraMultiDps).toBeGreaterThan(otherScribesCombinedDps);
    expect(alexandraMultiDps).toBeCloseTo(257.14, 1);
  });

  it('includes Alexandra in the distraction framework but keeps her ineligible for trainees', () => {
    const alexandra = scribeById('alexandra');
    expect(alexandra?.traineeEligible).toBe(false);
    expect(BALANCE.distractions.eligible).toContain('alexandra');
    expect(BALANCE.trainees.eligible).not.toContain('alexandra');
  });
});
