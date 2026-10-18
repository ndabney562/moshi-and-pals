/**
 * THE RESIDENCY BOARD: what CME Credits (Continuing Medical Education, earned per shift) unlock between runs.
 * Unlocks are mostly new options, not raw power: a Specialty is a trade-off you choose before a shift,
 * and the Starter Kit lets you bring a crate tool from home. Pick one Specialty at a time (or none).
 * The scribes (Omar and Alan) are hired here too; their prices are in data/scribes.ts.
 */
export interface SpecialtyDef {
  id: string;
  name: string;
  /** The upside and the catch, in one line each. */
  perk: string;
  catch: string;
  cost: number;
  mods: SpecialtyMods;
}

/** Run-long multipliers and bonuses a Specialty applies (anything missing = no change). */
export interface SpecialtyMods {
  /** Damage × against germs with this tag. */
  vs?: { tag: string; mult: number };
  maxHp?: number;
  moveSpeed?: number;
  purgeRadius?: number;
  /** Damage × with every tool. */
  toolDamage?: number;
  startCopays?: number;
  germSpeed?: number;
  upgradeCost?: number;
  jugSize?: number;
}

export const SPECIALTIES: SpecialtyDef[] = [
  { id: 'infectiousDisease', name: 'Infectious Disease', perk: '+25% damage to viruses', catch: '-10 max health', cost: 8,
    mods: { vs: { tag: 'virus', mult: 1.25 }, maxHp: -10 } },
  { id: 'pulmonology', name: 'Pulmonology', perk: 'Sinus Purge reaches 30% farther', catch: '-10% damage with every tool', cost: 8,
    mods: { purgeRadius: 1.3, toolDamage: 0.9 } },
  { id: 'sportsMedicine', name: 'Sports Medicine', perk: 'Walk 10% faster', catch: '-10 max health', cost: 8,
    mods: { moveSpeed: 1.1, maxHp: -10 } },
  { id: 'emergencyMedicine', name: 'Emergency Medicine', perk: 'Start every shift with $150', catch: 'Germs are 5% faster', cost: 12,
    mods: { startCopays: 150, germSpeed: 1.05 } },
  { id: 'pharmacology', name: 'Pharmacology', perk: 'Compounding upgrades cost 20% less', catch: 'Jugs hold 20% less', cost: 12,
    mods: { upgradeCost: 0.8, jugSize: 0.8 } },
];

/** STARTER KIT: start each shift carrying one crate tool (chosen on the board). */
export const STARTER_KIT_COST = 15;

/** CME Credits for a finished shift. */
export const CME = {
  /** Per two rounds reached. */
  perTwoRounds: 1,
  /** Per achievement unlocked for the first time this shift. */
  perAchievement: 3,
  /** Per boss defeated. */
  perBoss: 2,
};
