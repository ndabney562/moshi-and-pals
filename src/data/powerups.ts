/**
 * Power-ups: pills that drop from RESISTANT elites (always) and now and then from any germ.
 * They blink before they vanish, so grabbing one is a choice. Effects live in systems/Powerups.ts.
 */
export type PowerupId = 'priorAuth' | 'freeRefills' | 'erWait' | 'triage' | 'statClean' | 'doubleCopay';

export interface PowerupDef {
  id: PowerupId;
  name: string;
  /** Shown when picked up. */
  blurb: string;
  color: number;
  /** How long it lasts (0 = instant). */
  ms: number;
}

export const POWERUPS: Record<PowerupId, PowerupDef> = {
  priorAuth: { id: 'priorAuth', name: 'PRIOR AUTHORIZATION', blurb: 'All germs: pending approval', color: 0x90caf9, ms: 5000 },
  freeRefills: { id: 'freeRefills', name: 'FREE REFILLS', blurb: 'Spray all you want', color: 0x7fd3ff, ms: 12000 },
  erWait: { id: 'erWait', name: 'ER WAIT TIME', blurb: 'Germs take a number', color: 0xffcc80, ms: 8000 },
  triage: { id: 'triage', name: 'TRIAGE', blurb: 'Every hit is a STAT! crit', color: 0xff8a80, ms: 10000 },
  statClean: { id: 'statClean', name: 'STAT CLEAN', blurb: 'Everything nearby: disinfected', color: 0xffffff, ms: 0 },
  doubleCopay: { id: 'doubleCopay', name: 'DOUBLE COPAY', blurb: 'Germs pay double', color: 0x7fffd4, ms: 15000 },
};

/** RESISTANT elite traits. Each changes how the germ fights; all of them always drop a power-up. */
export type EliteAffix = 'shielded' | 'hasty' | 'regenerating' | 'splitting';

export const ELITE_AFFIXES: Record<EliteAffix, { label: string; ring: number }> = {
  shielded: { label: 'SHIELDED', ring: 0x64b5f6 },
  hasty: { label: 'HASTY', ring: 0xffa726 },
  regenerating: { label: 'REGENERATING', ring: 0x66bb6a },
  splitting: { label: 'SPLITTING', ring: 0xba68c8 },
};
