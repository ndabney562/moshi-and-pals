import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';
import { events, GameEvents } from './events';

/**
 * Which achievements this device has unlocked. Kept apart from the records save (its own key), read once,
 * and written on every unlock. Storage can be unavailable (private browsing): then they last the session.
 */
const KEY = 'moshi.achievements.v1';

function load(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    const known = new Set(ACHIEVEMENTS.map((a) => a.id));
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && known.has(id)) : []);
  } catch {
    return new Set();
  }
}

const unlocked = load();

export function hasAchievement(id: string): boolean {
  return unlocked.has(id);
}

/** Unlocks `id` (once). Returns its definition the first time, so the caller can celebrate; otherwise undefined. */
export function unlockAchievement(id: string): AchievementDef | undefined {
  if (unlocked.has(id)) return undefined;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return undefined;
  unlocked.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...unlocked]));
  } catch {
    // Not fatal: it lasts until the page is closed.
  }
  events.emit(GameEvents.AchievementUnlocked, def);
  return def;
}

/** Every achievement, in list order, with whether it's unlocked. */
export function achievementList(): { def: AchievementDef; unlocked: boolean }[] {
  return ACHIEVEMENTS.map((def) => ({ def, unlocked: unlocked.has(def.id) }));
}
