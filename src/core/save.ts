import { DIFFICULTIES, type DifficultyId } from '../data/difficulties';
import type { ShiftMode } from './shift';

/**
 * Saved progress on this device: personal records. Versioned, so updates never wipe progress:
 * older saves are migrated, and unreadable or damaged ones fall back to a fresh record
 * (keeping any numbers that still make sense). Storage can be unavailable (private browsing),
 * so every read and write is wrapped.
 *
 * v3 (M17): records are kept per difficulty, so an easy Walk-In shift never overwrites an Urgent
 * record (v1/v2 records become the Urgent ones). Today's Shift has its own best for the day and
 * doesn't touch the difficulty records (its modifiers make scores incomparable).
 */
export interface Records {
  bestScore: number;
  bestRound: number;
  bestStreak: number;
}

export interface DailyRecord {
  /** Local date of the last Today's Shift played (YYYY-MM-DD). */
  date: string;
  bestScore: number;
  bestRound: number;
  /** Shifts finished that day (the first one earns the CME bonus). */
  finished: number;
}

export interface SaveData {
  version: 3;
  records: Record<DifficultyId, Records>;
  daily: DailyRecord;
  totalKills: number;
  runs: number;
  fluSeason?: Record<DifficultyId, Records>;
}

const KEY = 'moshi.save.v3';
const OLD_KEYS = ['moshi.save.v2', 'moshi.save.v1'];

const noRecords = (): Records => ({ bestScore: 0, bestRound: 0, bestStreak: 0 });
const allRecords = (): Record<DifficultyId, Records> =>
  Object.fromEntries(DIFFICULTIES.map((d) => [d.id, noRecords()])) as Record<DifficultyId, Records>;
const noDaily = (): DailyRecord => ({ date: '', bestScore: 0, bestRound: 0, finished: 0 });

/** A non-negative whole number, or 0 for anything damaged. */
const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const recordsFrom = (v: unknown): Records => {
  const r = obj(v);
  return { bestScore: n(r.bestScore), bestRound: n(r.bestRound), bestStreak: n(r.bestStreak) };
};

function read(key: string): Record<string, unknown> | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export function loadSave(): SaveData {
  const save: SaveData = { version: 3, records: allRecords(), daily: noDaily(), totalKills: 0, runs: 0, fluSeason: allRecords() };
  const v3 = read(KEY);
  if (v3) {
    const recs = obj(v3.records);
    for (const d of DIFFICULTIES) save.records[d.id] = recordsFrom(recs[d.id]);
    const daily = obj(v3.daily);
    save.daily = { date: typeof daily.date === 'string' ? daily.date : '', bestScore: n(daily.bestScore), bestRound: n(daily.bestRound), finished: n(daily.finished) };
    save.totalKills = n(v3.totalKills);
    save.runs = n(v3.runs);
    const flu = obj(v3.fluSeason);
    save.fluSeason = allRecords();
    for (const d of DIFFICULTIES) save.fluSeason[d.id] = recordsFrom(flu[d.id]);
    return save;
  }
  // v2 had one set of records (all Urgent: there were no difficulties yet); v1 only bestScore and bestRound
  const old = OLD_KEYS.map(read).find(Boolean);
  if (!old) return save;
  save.records.urgent = recordsFrom(old);
  save.totalKills = n(old.totalKills);
  save.runs = n(old.runs);
  return save;
}

function write(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Not fatal: the records just won't persist.
  }
}

/** Today's Shift best for `date` (0 if it hasn't been played that day). */
export function dailyBest(date: string): { bestScore: number; bestRound: number; finished: number } {
  const d = loadSave().daily;
  return d.date === date ? d : { bestScore: 0, bestRound: 0, finished: 0 };
}

/** Endless Flu Season best for a difficulty. */
export function fluSeasonBest(difficulty: DifficultyId = 'urgent'): Records {
  const save = loadSave();
  return save.fluSeason?.[difficulty] ?? noRecords();
}

export interface RunRecord {
  /** The records this run counted toward (its difficulty's, or the day's for Today's Shift), before and after. */
  previous: Records;
  next: Records;
  save: SaveData;
  newBestScore: boolean;
  newBestRound: boolean;
  newBestStreak: boolean;
  /** Today's Shift: this was the first one finished on its date. */
  firstDailyToday: boolean;
}

/**
 * Records a finished run. Returns the previous and new records and which ones this run beat.
 * `daily` = the Today's Shift date (records go to the day, not the difficulty).
 */
export function recordRun(score: number, round: number, bestStreak = 0, kills = 0, difficulty: DifficultyId = 'urgent', daily?: string, mode?: ShiftMode): RunRecord {
  const save = loadSave();
  save.totalKills += kills;
  save.runs += 1;
  let previous: Records;
  let next: Records;
  let firstDailyToday = false;
  if (daily) {
    const d = save.daily.date === daily ? save.daily : { ...noDaily(), date: daily };
    // The day's streak record isn't tracked; the difficulty record's streak is shown instead
    previous = { bestScore: d.bestScore, bestRound: d.bestRound, bestStreak: save.records.urgent.bestStreak };
    firstDailyToday = d.finished === 0;
    save.daily = { date: daily, bestScore: Math.max(d.bestScore, score), bestRound: Math.max(d.bestRound, round), finished: d.finished + 1 };
    next = { bestScore: save.daily.bestScore, bestRound: save.daily.bestRound, bestStreak: previous.bestStreak };
  } else if (mode === 'fluSeason') {
    if (!save.fluSeason) save.fluSeason = allRecords();
    previous = save.fluSeason[difficulty] ?? noRecords();
    next = {
      bestScore: Math.max(previous.bestScore, score),
      bestRound: Math.max(previous.bestRound, round),
      bestStreak: Math.max(previous.bestStreak, bestStreak),
    };
    save.fluSeason[difficulty] = next;
  } else {
    previous = save.records[difficulty];
    next = {
      bestScore: Math.max(previous.bestScore, score),
      bestRound: Math.max(previous.bestRound, round),
      bestStreak: Math.max(previous.bestStreak, bestStreak),
    };
    save.records[difficulty] = next;
  }
  write(save);
  return {
    previous, next, save, firstDailyToday,
    newBestScore: score > previous.bestScore,
    newBestRound: round > previous.bestRound,
    newBestStreak: !daily && bestStreak > previous.bestStreak,
  };
}
