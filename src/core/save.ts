/**
 * Saved progress on this device: personal records. Versioned, so updates never wipe progress:
 * older saves are migrated, and unreadable or damaged ones fall back to a fresh record
 * (keeping any numbers that still make sense). Storage can be unavailable (private browsing),
 * so every read and write is wrapped.
 */
export interface SaveData {
  version: 2;
  bestScore: number;
  bestRound: number;
  bestStreak: number;
  totalKills: number;
  runs: number;
}

const KEY = 'moshi.save.v2';
const OLD_KEY = 'moshi.save.v1';

const fresh = (): SaveData => ({ version: 2, bestScore: 0, bestRound: 0, bestStreak: 0, totalKills: 0, runs: 0 });

/** A non-negative whole number, or 0 for anything damaged. */
const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

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
  const v2 = read(KEY);
  // v1 had only bestScore and bestRound
  const src = v2 ?? read(OLD_KEY);
  if (!src) return fresh();
  return {
    version: 2,
    bestScore: n(src.bestScore), bestRound: n(src.bestRound),
    bestStreak: n(src.bestStreak), totalKills: n(src.totalKills), runs: n(src.runs),
  };
}

export interface RunRecord {
  previous: SaveData;
  next: SaveData;
  newBestScore: boolean;
  newBestRound: boolean;
  newBestStreak: boolean;
}

/** Records a finished run. Returns the previous and new records and which ones this run beat. */
export function recordRun(score: number, round: number, bestStreak = 0, kills = 0): RunRecord {
  const previous = loadSave();
  const next: SaveData = {
    version: 2,
    bestScore: Math.max(previous.bestScore, score),
    bestRound: Math.max(previous.bestRound, round),
    bestStreak: Math.max(previous.bestStreak, bestStreak),
    totalKills: previous.totalKills + kills,
    runs: previous.runs + 1,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not fatal: the records just won't persist.
  }
  return {
    previous, next,
    newBestScore: score > previous.bestScore,
    newBestRound: round > previous.bestRound,
    newBestStreak: bestStreak > previous.bestStreak,
  };
}
