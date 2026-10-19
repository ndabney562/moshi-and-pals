import Phaser from 'phaser';

/**
 * Game-wide event bus. Systems announce what happened here; other systems
 * (dialogue, audio, score, Easter eggs) listen without being wired directly.
 * Add new event names to GameEvents so they stay discoverable.
 */
export const GameEvents = {
  RunStarted: 'run.started',
  /** { ammo, capacity, refillProgress } refillProgress is 0..1 while refilling, else -1 */
  EquipmentChanged: 'equipment.changed',
  EquipmentEmpty: 'equipment.empty',
  EquipmentRefilled: 'equipment.refilled',
  /** { germId, x, y, totalKills } */
  GermKilled: 'germ.killed',
  /** { germId } */
  PlayerBumped: 'player.bumped',
  /** { hp, maxHp } sent whenever Eugene's health changes */
  PlayerHealthChanged: 'player.health',
  PlayerDied: 'player.died',
  /** { round, title } */
  RoundStarted: 'round.started',
  /** { round } */
  RoundCompleted: 'round.completed',
  /** { score } */
  ScoreChanged: 'score.changed',
  /** { name, hp, maxHp } for BossSpawned and BossHealth */
  BossSpawned: 'boss.spawned',
  BossHealth: 'boss.health',
  BossDefeated: 'boss.defeated',
  /** { name } the boss got away (Patient Zero leaving against medical advice) */
  BossEscaped: 'boss.escaped',
  /** { copays } */
  CopaysChanged: 'copays.changed',
  /** { progress } 0..1 while recharging, 1 when ready */
  PurgeChanged: 'purge.changed',
  PurgeUsed: 'purge.used',
  /** { near, label, affordable } whether Eugene is at something he can use (supply cart, locked door) */
  StationNearby: 'station.nearby',
  /** { id, name } Eugene walked into a different room */
  RoomEntered: 'room.entered',
  /** { id, name, cost } a door was bought open */
  RoomUnlocked: 'room.unlocked',
  /** { count, mult, left } Sanitation Streak: kills in a row, Copay multiplier, 0..1 time left (count 0 = ended) */
  StreakChanged: 'streak.changed',
  /** { round, copays } finished a round without getting hurt */
  SpotlessRound: 'round.spotless',
  /** { active: [{ id, name, color, left }] } power-ups running now (left 0..1) */
  PowerupsChanged: 'powerups.changed',
  /** { name, blurb, color } a power-up was picked up */
  PowerupPicked: 'powerup.picked',
  /** { name } a supply crate gave Eugene a new tool */
  ToolUnlocked: 'tool.unlocked',
  /** RequisitionPayload: the Supply Requisition form is up (or updated after an appeal) */
  RequisitionOpened: 'requisition.opened',
  /** { id } the player picked a tool on the form */
  RequisitionPicked: 'requisition.picked',
  /** the player appealed for a new pair */
  RequisitionAppealed: 'requisition.appealed',
  /** { title, line } the claim was denied (no form; part refund) */
  ClaimDenied: 'requisition.denied',
  /** VendingPayload: the vending machine's choices are up (or updated after a failed purchase) */
  VendingOpened: 'vending.opened',
  /** { id } the player picked a snack */
  VendingPicked: 'vending.picked',
  /** the purchase went through (the HUD closes the form) */
  VendingDone: 'vending.done',
  /** the player walked away */
  VendingCancelled: 'vending.cancelled',
  /** AchievementDef: unlocked for the first time on this device */
  AchievementUnlocked: 'achievement.unlocked',
} as const;

export interface RequisitionOption { id: string; name: string; blurb: string; color: number; }

/** The Supply Requisition form: two tools, and what appealing for another pair costs. */
export interface RequisitionPayload {
  options: RequisitionOption[];
  appealCost: number;
  canAffordAppeal: boolean;
  /** A line under the title ("APPEAL DENIED..."), or '' for the default. */
  note: string;
}

/** The vending machine: up to three snacks with prices in their names. */
export interface VendingPayload {
  options: RequisitionOption[];
  note: string;
}

export interface EquipmentChangedPayload {
  ammo: number; capacity: number; refillProgress: number; reserve: number;
  name: string; unit: string; spareName: string; selfCharging: boolean;
  /** How many tools Eugene is carrying (SWAP shows at 2). */
  slots: number;
  /** Perfect Pour sweet spot (fractions of the refill), shown on the REFILL ring. */
  pourWindow: [number, number];
  /** FRESH BOTTLE damage boost is active. */
  fresh: boolean;
}
export interface StationPayload {
  near: boolean; label: string; affordable: boolean;
  /** Purchase needs a press-and-hold (pricey, or replaces a tool). */
  hold: boolean;
  /** Small warning shown above USE, e.g. which tool a crate would replace. */
  note: string;
}
export interface RoomPayload { id: string; name: string; cost?: number; }
export interface GermKilledPayload { germId: string; x: number; y: number; totalKills: number; }

export interface StreakPayload { count: number; mult: number; left: number; }
export interface HealthPayload { hp: number; maxHp: number; }
export interface RoundPayload { round: number; title: string; /** Special round name, if it is one. */ special?: string; }
export interface BossPayload { name: string; hp: number; maxHp: number; }
export interface RunResult {
  score: number; round: number; kills: number;
  bestScore: number; bestRound: number; newBestScore: boolean; newBestRound: boolean;
  /** Discharge Summary (M9) */
  causeOfDeath: string;
  secondsSurvived: number;
  bestStreak: number; newBestStreak: boolean; recordStreak: number;
  copaysEarned: number; roomsOpened: number; roomsTotal: number; upgrades: number; crits: number; perfectPours: number;
  /** The germ this run disinfected most, and how many. */
  favoriteVictim?: { name: string; count: number };
  totalKills: number; runs: number;
  /** Achievements unlocked for the first time this run (names). */
  newAchievements: string[];
  /** CME Credits this shift earned for the Residency Board, and the Specialty worked under ('' = none). */
  cme: number;
  /** NPS Scores this shift earned (they hire the Pals). */
  nps: number;
  specialty: string;
  /** Who was on shift, as the chart names them. */
  chart: string;
  /** M17: the difficulty's name, the modifiers in play (names), and Today's Shift's date if it was one. */
  difficulty: string;
  modifiers: string[];
  daily?: string;
  /** CME Credits (included in `cme`) for the day's first finished Today's Shift. */
  dailyBonus?: number;
}

export const events = new Phaser.Events.EventEmitter();
