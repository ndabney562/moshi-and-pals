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
    return mix;
  },
  /** Most of a germ type alive at once, so special germs stay a spice, not the meal. Others are unlimited. */
  aliveLimit: {
    sneezer: (r: number) => Math.min(2 + Math.floor((r - 4) / 3), 4),
    sporePod: (r: number) => Math.min(2 + Math.floor((r - 6) / 2), 5),
  } as Record<string, (r: number) => number>,

  /** Every Nth round is a boss round: the boss plus a lighter escort of normal germs. */
  bossEvery: 5,
  bossId: 'diamond',
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
