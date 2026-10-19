/**
 * Power-ups: pills that drop from RESISTANT elites (always) and now and then from any germ.
 * They blink before they vanish, so grabbing one is a choice. Effects live in systems/Powerups.ts.
 */
import { BALANCE } from '../config/balance';

export type PowerupId = 'priorAuth' | 'freeRefills' | 'erWait' | 'triage' | 'statClean' | 'doubleCopay' | 'scribeOmar' | 'scribeAlan'
  | 'fluShot' | 'prescription';

export interface PowerupDef {
  id: PowerupId;
  name: string;
  /** Shown when picked up. */
  blurb: string;
  color: number;
  /** How long it lasts (0 = instant). */
  ms: number;
  /** A scribe pill (data/scribes.ts): only drops once that scribe is unlocked on the Residency Board. */
  scribe?: 'omar' | 'alan';
  /** How often random drops pick it, next to the others (default 1). */
  weight?: number;
  /** Never a random drop: only a boss leaves it. */
  bossOnly?: boolean;
}

export const POWERUPS: Record<PowerupId, PowerupDef> = {
  priorAuth: { id: 'priorAuth', name: 'PRIOR AUTHORIZATION', blurb: 'All germs: pending approval', color: 0x90caf9, ms: 5000 },
  freeRefills: { id: 'freeRefills', name: 'FREE REFILLS', blurb: 'Spray all you want', color: 0x7fd3ff, ms: 12000 },
  erWait: { id: 'erWait', name: 'ER WAIT TIME', blurb: 'Germs take a number', color: 0xffcc80, ms: 8000 },
  triage: { id: 'triage', name: 'TRIAGE', blurb: 'Every hit is a STAT! crit', color: 0xff8a80, ms: 10000 },
  statClean: { id: 'statClean', name: 'STAT CLEAN', blurb: 'Everything nearby: disinfected', color: 0xffffff, ms: 0 },
  doubleCopay: { id: 'doubleCopay', name: 'DOUBLE COPAY', blurb: 'Germs pay double', color: 0x7fffd4, ms: 15000 },
  // Scribes (data/scribes.ts): they stay for BALANCE.scribes.ms
  scribeOmar: { id: 'scribeOmar', name: 'SCRIBE: OMAR', blurb: 'Charting that!', color: 0xffd54f, ms: BALANCE.scribes.ms, scribe: 'omar' },
  scribeAlan: { id: 'scribeAlan', name: 'SCRIBE: ALAN', blurb: 'Documented. Next.', color: 0xb39ddb, ms: BALANCE.scribes.ms, scribe: 'alan' },
  // Rare from any germ; the Influenza Twins always leave one
  fluShot: { id: 'fluShot', name: 'FLU SHOT', blurb: `+${BALANCE.powerups.fluShotHp} max health for this shift`, color: 0x80cbc4, ms: 0, weight: BALANCE.powerups.fluShotWeight },
  // Methicillin's reward: the tool in hand compounded all the way up, on the house
  prescription: { id: 'prescription', name: 'PRESCRIPTION STRENGTH', blurb: 'Your tool, fully compounded. No copay.', color: 0xffb74d, ms: 0, bossOnly: true },
};

/** RESISTANT elite traits. Each changes how the germ fights; all of them always drop a power-up. */
export type EliteAffix = 'shielded' | 'hasty' | 'regenerating' | 'splitting';

export const ELITE_AFFIXES: Record<EliteAffix, { label: string; ring: number }> = {
  shielded: { label: 'SHIELDED', ring: 0x64b5f6 },
  hasty: { label: 'HASTY', ring: 0xffa726 },
  regenerating: { label: 'REGENERATING', ring: 0x66bb6a },
  splitting: { label: 'SPLITTING', ring: 0xba68c8 },
};
