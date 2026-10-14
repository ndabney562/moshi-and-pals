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
  /** { name } a supply crate gave Eugene a new tool */
  ToolUnlocked: 'tool.unlocked',
} as const;

export interface EquipmentChangedPayload {
  ammo: number; capacity: number; refillProgress: number; reserve: number;
  name: string; unit: 'mL' | '%'; selfCharging: boolean;
  /** How many tools Eugene is carrying (SWAP shows at 2). */
  slots: number;
}
export interface StationPayload { near: boolean; label: string; affordable: boolean; }
export interface RoomPayload { id: string; name: string; cost?: number; }
export interface GermKilledPayload { germId: string; x: number; y: number; totalKills: number; }

export interface HealthPayload { hp: number; maxHp: number; }
export interface RoundPayload { round: number; title: string; }
export interface BossPayload { name: string; hp: number; maxHp: number; }
export interface RunResult { score: number; round: number; kills: number; bestScore: number; bestRound: number; newBestScore: boolean; newBestRound: boolean; }

export const events = new Phaser.Events.EventEmitter();
