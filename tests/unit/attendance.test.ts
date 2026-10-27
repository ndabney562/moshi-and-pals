import { describe, expect, it } from 'vitest';
import { callOutChance, rollAttendance } from '../../src/core/attendance';
import { CALL_OUT_FALLBACK, CALL_OUT_REASONS } from '../../src/data/callOuts';
import { BALANCE } from '../../src/config/balance';

describe('attendance / call-outs', () => {
  it('defines the approved call-out odds for every provider', () => {
    expect(callOutChance('janeen')).toBe(0.03);
    expect(callOutChance('dhiwya')).toBe(0.03);
    expect(callOutChance('lucien')).toBe(0.06);
    expect(callOutChance('jason')).toBe(0.06);
    expect(callOutChance('ken')).toBe(0.1);
    expect(callOutChance('kaya')).toBe(0.15);
    expect(callOutChance('raj')).toBe(0.15);
    expect(callOutChance('lidiya')).toBe(0.15);
    expect(callOutChance('eugene')).toBe(0.22);
    expect(callOutChance('dharma')).toBe(0.22);
    expect(callOutChance('amanda')).toBe(0.4);
    expect(callOutChance('unknown_doctor')).toBe(BALANCE.attendance.fallback);
  });

  it('provides 4 distinct humor reasons per provider and non-empty fallbacks', () => {
    const doctors = ['eugene', 'kaya', 'lucien', 'ken', 'jason', 'dhiwya', 'raj', 'lidiya', 'dharma', 'amanda', 'janeen'];
    for (const doc of doctors) {
      const reasons = CALL_OUT_REASONS[doc];
      expect(reasons).toBeDefined();
      expect(reasons.length).toBe(4);
      const unique = new Set(reasons);
      expect(unique.size).toBe(4);
      for (const line of reasons) {
        expect(line.length).toBeGreaterThan(5);
      }
    }
    expect(CALL_OUT_FALLBACK.length).toBeGreaterThan(0);
  });

  it('rolls attendance deterministically from seed, doctor and helper ID', () => {
    const helpers = ['omar', 'alan', 'donald'];
    const res1 = rollAttendance(424242, 'eugene', helpers);
    const res2 = rollAttendance(424242, 'eugene', helpers);

    expect([...res1.entries()]).toEqual([...res2.entries()]);
  });

  it('isolates helper rolls so helper order or presence does not perturb other helpers', () => {
    const omarAlone = rollAttendance(98765, 'amanda', ['omar']).get('omar');
    const omarWithOthers = rollAttendance(98765, 'amanda', ['alan', 'omar', 'donald']).get('omar');

    expect(omarAlone).toEqual(omarWithOthers);
  });

  it('assigns reason if and only if out is true, drawing from the doctor pool', () => {
    const helpers = ['omar', 'alan', 'donald'];
    // Roll across multiple seeds to ensure we see both out and present states
    let seenOut = false;
    let seenPresent = false;
    for (let s = 1; s <= 50; s++) {
      const attendance = rollAttendance(s, 'amanda', helpers);
      for (const att of attendance.values()) {
        if (att.out) {
          seenOut = true;
          expect(typeof att.reason).toBe('string');
          expect(CALL_OUT_REASONS.amanda).toContain(att.reason);
        } else {
          seenPresent = true;
          expect(att.reason).toBeUndefined();
        }
      }
    }
    expect(seenOut).toBe(true);
    expect(seenPresent).toBe(true);
  });

  it('exhibits higher call-out frequency on high call-out chance doctors (Amanda vs Janeen)', () => {
    let amandaOuts = 0;
    let janeenOuts = 0;
    const n = 500;
    for (let s = 1; s <= n; s++) {
      if (rollAttendance(s, 'amanda', ['omar']).get('omar')?.out) amandaOuts++;
      if (rollAttendance(s, 'janeen', ['omar']).get('omar')?.out) janeenOuts++;
    }
    // Amanda (40%) should have significantly more call-outs than Janeen (3%)
    expect(amandaOuts).toBeGreaterThan(120);
    expect(janeenOuts).toBeLessThan(50);
  });
});
