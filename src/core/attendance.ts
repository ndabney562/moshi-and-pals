import { BALANCE } from '../config/balance';
import { CALL_OUT_FALLBACK, CALL_OUT_REASONS } from '../data/callOuts';
import { Rng, hashSeed } from './rng';

/** One helper's attendance for a shift. */
export interface Attendance {
  out: boolean;
  /** Why they're out (only when `out`). */
  reason?: string;
}

/** The chance a helper calls out on this doctor's shift (BALANCE.attendance). */
export function callOutChance(doctor: string): number {
  const cfg = BALANCE.attendance;
  return cfg.callOutChance[doctor] ?? cfg.fallback;
}

/**
 * CALL-OUTS: each helper rolls on their own generator, derived from the shift seed, the doctor and their id. So the
 * result doesn't depend on who else is eligible or what other systems rolled, and a continued shift (same seed)
 * gets exactly the same call-outs and reasons back: saving and reloading never rerolls.
 */
export function rollAttendance(seed: number, doctor: string, helpers: readonly string[]): Map<string, Attendance> {
  const p = callOutChance(doctor);
  const pool = CALL_OUT_REASONS[doctor] ?? CALL_OUT_FALLBACK;
  const out = new Map<string, Attendance>();
  for (const id of helpers) {
    const rng = new Rng(hashSeed(`${seed >>> 0}:attendance:${doctor}:${id}`));
    out.set(id, rng.chance(p) ? { out: true, reason: rng.pick(pool) } : { out: false });
  }
  return out;
}
