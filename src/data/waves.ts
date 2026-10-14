/** A special round: same clinic, different rules. Announced with its own banner. */
export interface SpecialRound {
  id: string;
  name: string;
  blurb: string;
  /** Germs in the round ×, spawn interval ×, extra on-screen germs, germ health ×. */
  countMult?: number;
  spawnMult?: number;
  maxAliveAdd?: number;
  hpMult?: number;
  /** Replace the usual mix. */
  mix?: Record<string, number>;
  /** Germs only come in through the starting room's doors. */
  fromStart?: boolean;
  /** Elite chance ×, Copays from kills ×, Spotless bonus ×. */
  eliteBoost?: number;
  copayMult?: number;
  spotlessMult?: number;
}

export const SPECIAL_ROUNDS: Record<string, SpecialRound> = {
  rush: { id: 'rush', name: 'WAITING ROOM RUSH', blurb: 'Everyone walked in at once', countMult: 1.25, spawnMult: 0.45, maxAliveAdd: 6, fromStart: true },
  slowTuesday: { id: 'slowTuesday', name: 'SLOW TUESDAY', blurb: 'Fewer germs. Copays pay double.', countMult: 0.6, copayMult: 2 },
  outbreak: { id: 'outbreak', name: 'OUTBREAK', blurb: 'Fast, fragile, and everywhere', countMult: 1.7, hpMult: 0.6, maxAliveAdd: 10, spawnMult: 0.6, mix: { sprinter: 2, basic: 1, sneezer: 0.2 } },
  inspection: { id: 'inspection', name: 'INSPECTION DAY', blurb: "Don't get hurt: Spotless pays triple", spotlessMult: 3 },
  superbug: { id: 'superbug', name: 'SUPERBUG', blurb: 'Resistant germs everywhere', countMult: 0.6, eliteBoost: 6 },
};

/**
 * Wave (round) scaling. Every number that makes later rounds harder lives here.
 * `r` is the round number, starting at 1.
 */
export const WAVES = {
  /** Pause before round 1, and between rounds (refill time!). */
  firstRoundDelayMs: 2000,
  intermissionMs: 5000,

  /** Total germs in the round. */
  count: (r: number) => Math.round(10 + 3 * (r - 1) + 0.15 * (r - 1) ** 2),
  /** Most germs on screen at once (keeps late rounds readable and fast on iPhone). */
  maxAlive: (r: number) => Math.min(8 + r * 2, 28),
  /** Time between spawns while below maxAlive. */
  spawnIntervalMs: (r: number) => Math.max(260, 800 - r * 50),
  /** Health and speed multipliers. Kept gentle: variety should carry difficulty, not sponges. */
  hpMult: (r: number) => Math.min(1 + 0.1 * (r - 1), 2.2),
  /** Bosses barely scale: rematches should get harder through new moves, not more health. */
  bossHpMultMax: 1.5,
  /**
   * PACING: when Eugene is below `lowHp` health with at least `crowd` of the round's on-screen
   * limit around, new germs come in this much slower. A breather, never announced.
   */
  breather: { lowHp: 0.3, crowd: 0.5, spawnSlow: 1.6 },
  speedMult: (r: number) => Math.min(1 + 0.035 * (r - 1), 1.6),

  /** Relative spawn weights per germ id. Viral Sprinters join from round 3, Sneezers from 4, Spore Pods from 6. */
  composition: (r: number): Record<string, number> => {
    const mix: Record<string, number> = { basic: 1 };
    if (r >= 3) mix.sprinter = Math.min(0.15 + 0.06 * (r - 3), 0.5);
    if (r >= 4) mix.sneezer = Math.min(0.1 + 0.02 * (r - 4), 0.2);
    if (r >= 6) mix.sporePod = Math.min(0.12 + 0.02 * (r - 6), 0.25);
    if (r >= 7) mix.duo = Math.min(0.1 + 0.02 * (r - 7), 0.2);
    if (r >= 8) { mix.charger = Math.min(0.07 + 0.01 * (r - 8), 0.14); mix.chonk = 0.025; }
    if (r >= 9) mix.healer = 0.05;
    if (r >= 10) mix.colony = 0.05;
    if (r >= 11) mix.moldSpot = 0.035;
    return mix;
  },
  /** Most of a germ type alive at once, so special germs stay a spice, not the meal. Others are unlimited. */
  aliveLimit: {
    sneezer: (r: number) => Math.min(2 + Math.floor((r - 4) / 3), 4),
    sporePod: (r: number) => Math.min(2 + Math.floor((r - 6) / 2), 5),
    charger: (r: number) => Math.min(2 + Math.floor((r - 8) / 3), 4),
    healer: (r: number) => (r < 14 ? 1 : 2),
    chonk: () => 1,
    colony: () => 2,
    moldSpot: () => 2,
  } as Record<string, (r: number) => number>,

  /**
   * Special rounds: a first run through each one at fixed rounds (so everyone meets them), then they come
   * back every other odd round. Never on boss rounds.
   */
  specialFor: (r: number): string | undefined => {
    const fixed: Record<number, string> = { 7: 'rush', 9: 'slowTuesday', 12: 'outbreak', 14: 'inspection', 17: 'superbug' };
    if (fixed[r]) return fixed[r];
    if (r > 17 && r % 5 !== 0 && r % 2 === 1) return ['rush', 'outbreak', 'superbug', 'inspection'][((r - 19) / 2) % 4];
    return undefined;
  },

  /** Every Nth round is a boss round: the boss plus a lighter escort of normal germs. */
  bossEvery: 5,
  bossId: 'diamond',
  /** Bosses take turns: Diamond on rounds 5, 15, 25...; Patient Zero on 10, 20, 30... */
  bossFor: (r: number): string => (Math.round(r / 5) % 2 === 1 ? 'diamond' : 'patientZero'),
  bossEscortFraction: 0.5,

  /** Shown under the ROUND banner. Noah: add your own! Index = round - 1; the last one repeats. */
  titles: [
    'Walk-ins welcome',
    'The waiting room is getting crowded',
    'Something fast just came in',
    'Nobody washed their hands',
    'Flu season',
    'The front desk has stopped answering',
    'Code Brown',
    'Eugene has not taken lunch',
    'This is fine',
    'Absolutely not fine',
  ],
};
