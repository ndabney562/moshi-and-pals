/**
 * Saved progress (high scores) on this device. Like settings, storage can be
 * unavailable, so failures fall back to an empty record.
 */
export interface SaveData {
  bestScore: number;
  bestRound: number;
}

const KEY = 'moshi.save.v1';

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    return { bestScore: 0, bestRound: 0, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { bestScore: 0, bestRound: 0 };
  }
}

/** Records a finished run. Returns the previous bests and whether this run beat them. */
export function recordRun(score: number, round: number): { previous: SaveData; newBestScore: boolean; newBestRound: boolean } {
  const previous = loadSave();
  const next: SaveData = { bestScore: Math.max(previous.bestScore, score), bestRound: Math.max(previous.bestRound, round) };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not fatal: the high score just won't persist.
  }
  return { previous, newBestScore: score > previous.bestScore, newBestRound: round > previous.bestRound };
}
