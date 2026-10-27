import { CHARACTERS } from '../data/characters';
import { DIFFICULTIES } from '../data/difficulties';

/**
 * Player settings saved on the device. Storage can be unavailable (private
 * browsing, cleared site data), so every read and write falls back quietly
 * to the defaults.
 */
export interface Settings {
  autoAim: boolean;
  /** Sound effects on/off (pause menu). */
  sound: boolean;
  /** Music on/off (pause menu), separate from sound effects. */
  music: boolean;
  /** Start a refill automatically when you spray an empty bottle (pause menu). */
  autoRefill: boolean;
  /** No screen shake (pause menu). */
  reducedMotion: boolean;
  /** One-time gameplay hints already learned (move, spray, pour, purge, buy). */
  learned: Record<string, boolean>;
  /** Who you play (title screen): eugene, kaya or lucien. */
  character: string;
  /** Difficulty for normal shifts (title screen): walkIn, urgent or trauma. Today's Shift is always Urgent. */
  difficulty: string;
  /** Shift mode: standard or fluSeason. */
  mode?: 'standard' | 'fluSeason';
}

const KEY = 'moshi.settings.v1';
const DEFAULTS: Settings = { autoAim: true, sound: true, music: true, autoRefill: true, reducedMotion: false, learned: {}, character: 'eugene', difficulty: 'urgent', mode: 'standard' };

/** Only supported values cross the persistence boundary. Valid existing saves keep their keys. */
export function parseSettings(value: unknown): Settings {
  const fresh = { ...DEFAULTS, learned: {} };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fresh;
  const raw = value as Record<string, unknown>;
  for (const key of ['autoAim', 'sound', 'music', 'autoRefill', 'reducedMotion'] as const) {
    if (typeof raw[key] === 'boolean') fresh[key] = raw[key];
  }
  if (typeof raw.character === 'string' && CHARACTERS.some((c) => c.id === raw.character)) fresh.character = raw.character;
  if (typeof raw.difficulty === 'string' && DIFFICULTIES.some((d) => d.id === raw.difficulty)) fresh.difficulty = raw.difficulty;
  if (raw.mode === 'standard' || raw.mode === 'fluSeason') fresh.mode = raw.mode;
  if (raw.learned && typeof raw.learned === 'object' && !Array.isArray(raw.learned)) {
    fresh.learned = Object.fromEntries(Object.entries(raw.learned).filter(([key, v]) => ['move', 'spray', 'pour', 'purge', 'buy'].includes(key) && typeof v === 'boolean'));
  }
  return fresh;
}

function load(): Settings {
  try { return parseSettings(JSON.parse(localStorage.getItem(KEY) ?? 'null')); }
  catch { return parseSettings(null); }
}

export const settings: Settings = load();

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Not fatal: the setting just won't survive a reload.
  }
}
