/** What happened in one run, for the Discharge Summary and personal records. */
export interface RunStats {
  /** Kills by germ id. */
  kills: Record<string, number>;
  bestStreak: number;
  copaysEarned: number;
  crits: number;
  roomsOpened: number;
  upgrades: number;
  rests: number;
  perfectPours: number;
  purges: number;
  /** Germ id (or 'diamond') that landed the last hit. */
  killer?: string;
  /** Game time when the run started, to work out time survived. */
  startedAt: number;
}

export const newRunStats = (now: number): RunStats => ({
  kills: {}, bestStreak: 0, copaysEarned: 0, crits: 0, roomsOpened: 0, upgrades: 0, rests: 0, perfectPours: 0, purges: 0, startedAt: now,
});
