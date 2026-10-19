/**
 * THE EQUIPMENT LOCKER: tool upgrades that stay between shifts, bought with banked Copays.
 * Each level stacks on the ones before it and on top of the in-shift Compounding Station tiers.
 * Names and blurbs live in data/locker.ts.
 */
export interface LockerLevel {
  /** Banked Copays this level costs. */
  cost: number;
  /** Damage × for every use of the tool. */
  damage?: number;
  /** Tank, jug and self-charge rate ×. */
  supply?: number;
  /** Time between uses × (less = faster). */
  interval?: number;
}

export const LOCKER = {
  /** Share of the Copays earned in a shift that goes home to the locker fund. */
  bankShare: 0.25,
  levels: [
    { cost: 400, damage: 1.1 },
    { cost: 1000, supply: 1.25 },
    { cost: 2000, damage: 1.1, interval: 0.9 },
  ] as LockerLevel[],
};
