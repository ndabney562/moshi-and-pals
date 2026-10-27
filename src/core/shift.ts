import { BALANCE } from '../config/balance';
import { DEFAULT_DIFFICULTY, difficultyById, type DifficultyId } from '../data/difficulties';
import { MODIFIERS, type ModifierId } from '../data/modifiers';
import { DEBUG } from './debug';
import { hashSeed, randomSeed, Rng } from './rng';
import { settings } from './settings';

export type ShiftMode = 'standard' | 'fluSeason';

/**
 * What kind of shift comes next: a normal one (the saved difficulty, any ?mods) or TODAY'S SHIFT
 * (the date picks the seed and two modifiers; always Urgent). The title screen chooses; GameScene
 * asks `nextShift()` at the start of every run, so PLAY AGAIN repeats the same kind (and the same day).
 */
export interface ShiftSetup {
  /** Today's Shift date (YYYY-MM-DD), or undefined for a normal shift. */
  daily?: string;
  difficulty: DifficultyId;
  mods: ModifierId[];
  seed: number;
  mode?: ShiftMode;
}

let kind: { daily?: string; mode?: ShiftMode } = {};

/** The device's local date, YYYY-MM-DD. */
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today's Shift for a date: its seed and two modifiers, the same on every device. */
export function dailyShift(date: string): ShiftSetup {
  const seed = hashSeed(`todays-shift:${date}`);
  const mods = new Rng(seed).sample(MODIFIERS.map((m) => m.id), BALANCE.daily.modifiers);
  return { daily: date, difficulty: 'urgent', mods, seed };
}

/** The difficulty saved in settings (Urgent if it's unknown). */
export const savedDifficulty = (): DifficultyId => difficultyById(settings.difficulty ?? DEFAULT_DIFFICULTY).id;

/** The mode saved in settings (standard if unknown). */
export const savedMode = (): ShiftMode => (settings.mode === 'fluSeason' ? 'fluSeason' : 'standard');

/** Chooses the kind of shift the next START begins. */
export function chooseShift(daily?: string, mode?: ShiftMode): void {
  kind = { daily, mode };
}

/** The setup for a shift starting now. Normal shifts get a fresh seed each time (unless ?seed). */
export function nextShift(): ShiftSetup {
  if (kind.daily) return dailyShift(kind.daily);
  const mode = DEBUG.mode ?? kind.mode ?? (savedMode() === 'fluSeason' ? 'fluSeason' : undefined);
  return {
    difficulty: savedDifficulty(),
    mods: [...DEBUG.mods],
    seed: DEBUG.seed ?? randomSeed(),
    ...(mode ? { mode } : {}),
  };
}
