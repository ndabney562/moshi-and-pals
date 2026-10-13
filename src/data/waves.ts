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
  hpMult: (r: number) => 1 + 0.1 * (r - 1),
  speedMult: (r: number) => Math.min(1 + 0.035 * (r - 1), 1.6),

  /** Relative spawn weights per germ id. Viral Sprinters join from round 3. */
  composition: (r: number): Record<string, number> =>
    r < 3 ? { basic: 1 } : { basic: 1, sprinter: Math.min(0.15 + 0.06 * (r - 3), 0.5) },

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
