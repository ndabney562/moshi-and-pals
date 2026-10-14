/**
 * Player settings saved on the device. Storage can be unavailable (private
 * browsing, cleared site data), so every read and write falls back quietly
 * to the defaults.
 */
export interface Settings {
  autoAim: boolean;
  /** Sound effects on/off (pause menu). */
  sound: boolean;
  /** Start a refill automatically when you spray an empty bottle (pause menu). */
  autoRefill: boolean;
  /** No screen shake (pause menu). */
  reducedMotion: boolean;
  /** One-time gameplay hints already learned (move, spray, pour, purge, buy). */
  learned: Record<string, boolean>;
}

const KEY = 'moshi.settings.v1';
const DEFAULTS: Settings = { autoAim: true, sound: true, autoRefill: true, reducedMotion: false, learned: {} };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings: Settings = load();

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Not fatal: the setting just won't survive a reload.
  }
}
