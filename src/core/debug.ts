/**
 * Testing switches read from the page address, so a build can be stress-tested
 * on a real iPhone without code changes. Nothing here is active in normal play.
 *
 *   ?debug            perf overlay (frame time, entity counts)
 *   ?round=12         start at round 12
 *   ?copays=2000      start with Copays
 *   ?god              Eugene can't be hurt
 *   ?fps=30           cap the frame rate (simulates iPhone Low Power Mode)
 *   ?mods=powerOutage,fullMoon   play a normal shift with these modifiers (ids in data/modifiers.ts)
 *   ?seed=123         seed the run's random rolls (same seed, same rolls)
 *   ?doctor=ken       play this shift as eugene, kaya, lucien or ken (not saved, hired or not)
 *   ?scribe=omar      a scribe (omar or alan) works the whole shift, and their pill drops even if locked
 *   ?secret=records   the Miracle Cure, every clue found and Stall 3's panel open (`clockout`: ready to clock out)
 *
 * Combine them: .../moshi-and-pals/?round=15&god&debug
 */
import { MODIFIERS, type ModifierId } from '../data/modifiers';

const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);

const num = (key: string): number | undefined => {
  const raw = params.get(key);
  if (raw === null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

const startRound = num('round');
const copays = num('copays');
const fpsLimit = num('fps');
const god = params.has('god');
const seed = num('seed');
const known = new Set<string>(MODIFIERS.map((m) => m.id));
const mods = (params.get('mods') ?? '').split(',').map((m) => m.trim()).filter((m): m is ModifierId => known.has(m));
const doctor = params.get('doctor') ?? undefined;
const scribe = params.get('scribe') ?? undefined;
const secret = params.get('secret') ?? undefined;

export const DEBUG = {
  /** Show the perf overlay. On whenever any debug switch is used, so testers always see they're in a test build. */
  overlay: params.has('debug') || startRound !== undefined || copays !== undefined || fpsLimit !== undefined || god
    || mods.length > 0 || seed !== undefined || doctor !== undefined || scribe !== undefined || secret !== undefined,
  /** First round to play (1 = normal). */
  startRound: startRound !== undefined ? Math.max(1, Math.floor(startRound)) : 1,
  copays: copays !== undefined ? Math.max(0, Math.floor(copays)) : 0,
  god,
  fpsLimit: fpsLimit !== undefined && fpsLimit >= 10 ? Math.floor(fpsLimit) : undefined,
  /** Modifiers forced onto normal shifts (unknown ids are ignored). */
  mods: [...new Set(mods)],
  /** Fixed run seed, if given. */
  seed: seed !== undefined ? Math.floor(Math.abs(seed)) >>> 0 : undefined,
  /** Character id for this shift, overriding the title screen's pick. */
  doctor,
  /** Scribe id to bring for the whole shift. */
  scribe,
  /** Miracle Cure step to start at ('records' or 'clockout'). */
  secret,
};
