import type { ShiftSetup } from './shift';
import type { RunStats } from './runStats';
import { DIFFICULTIES } from '../data/difficulties';
import { MODIFIERS, type ModifierId } from '../data/modifiers';

/**
 * SAVE & QUIT (Noah, Oct 2026): one saved shift on this device. Quitting from the pause menu can save the shift,
 * and CONTINUE SHIFT on the title screen picks it up again at the start of the round it was saved in (germs on the
 * floor, pills and timers start fresh). Saved mid-round, it's the shift as it stood when that round began; saved in
 * a break, it's the shift as it is now, starting the next round. Continuing uses the save up; saving again replaces it.
 */
export interface ShiftSave {
  version: 1;
  /** When it was saved (ms since 1970), for the title screen. */
  savedAt: number;
  shift: ShiftSetup;
  /** Who was on shift, and their Specialty (id, or '' for none), kept even if the title or board change them. */
  character: string;
  specialty: string;
  /** The round it starts at. */
  round: number;
  score: number;
  kills: number;
  copays: number;
  bossesDefeated: number;
  scribeCleans: number;
  hp: number;
  maxHp: number;
  /** Rooms open (besides the starting ones). */
  rooms: string[];
  /** Tools carried, with their Compounding Station tier, and which one is in hand. */
  loadout: { id: string; tier: number }[];
  slot: number;
  /** Snacks bought, in order (they're replayed to rebuild the perks). */
  snacks: string[];
  /** Helpers let out of their rooms this shift (they stay all shift). */
  helpers: string[];
  /** Helpers whose call-out was already revealed this shift (their silhouette doesn't come back). */
  absent?: string[];
  provider?: { pantry: number[]; ingredient: number };
  claimDeniedChance: number;
  /** Game time played so far (the Discharge Summary's time survived). */
  playedMs: number;
  stats: Omit<RunStats, 'startedAt'>;
  /** The Miracle Cure's progress. */
  cure: Record<string, boolean>;
}

const KEY = 'moshi.shift.v1';

const num = (v: unknown, min = 0): number => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : min);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** The saved shift, or undefined if there isn't one (or it's damaged). */
export function savedShift(): ShiftSave | undefined {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return undefined;
    const r = raw as Record<string, unknown>;
    const sh = (r.shift ?? {}) as Record<string, unknown>;
    if (r.version !== 1 || !DIFFICULTIES.some((d) => d.id === sh.difficulty) || typeof sh.seed !== 'number') return undefined;
    const loadout = Array.isArray(r.loadout)
      ? r.loadout.filter((t): t is { id: string; tier: number } => !!t && typeof t.id === 'string').map((t) => ({ id: t.id, tier: Math.floor(num(t.tier)) }))
      : [];
    if (loadout.length === 0) return undefined;
    const stats = (r.stats ?? {}) as Omit<RunStats, 'startedAt'>;
    return {
      provider: r.provider && typeof r.provider === 'object' && Array.isArray((r.provider as {pantry?:unknown}).pantry) ? { pantry: ((r.provider as {pantry:unknown[]}).pantry).slice(0,4).map(x=>Math.min(1000,Math.floor(num(x)))), ingredient: Math.min(3,Math.floor(num((r.provider as {ingredient?:unknown}).ingredient))) } : undefined,
      version: 1,
      savedAt: num(r.savedAt),
      shift: {
        daily: typeof sh.daily === 'string' ? sh.daily : undefined,
        difficulty: sh.difficulty as ShiftSetup['difficulty'],
        mods: strings(sh.mods).filter((m): m is ModifierId => MODIFIERS.some((x) => x.id === m)),
        seed: sh.seed,
      },
      character: typeof r.character === 'string' ? r.character : 'eugene',
      specialty: typeof r.specialty === 'string' ? r.specialty : '',
      round: Math.max(1, Math.floor(num(r.round, 1))),
      score: Math.floor(num(r.score)),
      kills: Math.floor(num(r.kills)),
      copays: Math.floor(num(r.copays)),
      bossesDefeated: Math.floor(num(r.bossesDefeated)),
      scribeCleans: Math.floor(num(r.scribeCleans)),
      hp: num(r.hp, 1),
      maxHp: num(r.maxHp, 1),
      rooms: strings(r.rooms),
      loadout,
      slot: Math.min(loadout.length - 1, Math.floor(num(r.slot))),
      snacks: strings(r.snacks),
      helpers: strings(r.helpers),
      absent: strings(r.absent),
      claimDeniedChance: num(r.claimDeniedChance),
      playedMs: num(r.playedMs),
      stats: { ...stats, kills: { ...(stats.kills ?? {}) }, achievements: strings(stats.achievements) },
      cure: Object.fromEntries(Object.entries((r.cure ?? {}) as Record<string, unknown>).filter(([, v]) => typeof v === 'boolean')) as Record<string, boolean>,
    };
  } catch {
    return undefined;
  }
}

/** Saves the shift (replacing any saved one). Returns false if storage isn't available. */
export function saveShift(save: ShiftSave): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/** Throws the saved shift away (it's been continued, or that shift ended). */
export function clearSavedShift(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
