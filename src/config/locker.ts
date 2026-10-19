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

/**
 * STAFF UPGRADES (the locker's STAFF shelf): the helpers (scribes, Donald, the PSRs) level up the same way, once
 * they're unlocked. `power` × their damage (a PSR: the Copays a check-in brings), `speed` × the time between their
 * attacks or check-ins (less = faster), `duration` × how long they stay.
 */
export interface StaffLevel {
  cost: number;
  power?: number;
  speed?: number;
  duration?: number;
}

export const STAFF = {
  levels: [
    { cost: 500, power: 1.2 },
    { cost: 1200, duration: 1.5 },
    { cost: 2500, power: 1.15, speed: 0.8 },
  ] as StaffLevel[],
};
