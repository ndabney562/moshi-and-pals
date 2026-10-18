/**
 * DIFFICULTIES: picked on the title screen (saved). Urgent is the game as designed; Today's Shift is
 * always Urgent. The multipliers live in BALANCE.difficulty. Records are kept per difficulty (core/save.ts).
 */
export type DifficultyId = 'walkIn' | 'urgent' | 'trauma';

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  /** One line for the title screen. */
  blurb: string;
}

export const DIFFICULTIES: DifficultyDef[] = [
  { id: 'walkIn', name: 'Walk-In', blurb: 'Softer germs, gentler bumps, better Copays' },
  { id: 'urgent', name: 'Urgent', blurb: 'The shift as intended' },
  { id: 'trauma', name: 'Trauma Center', blurb: 'Tougher germs that hit harder and keep coming' },
];

export const DEFAULT_DIFFICULTY: DifficultyId = 'urgent';

export const difficultyById = (id: string): DifficultyDef =>
  DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES.find((d) => d.id === DEFAULT_DIFFICULTY)!;
