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
  /** { near, cost, affordable } whether Eugene is at the supply cart */
  StationNearby: 'station.nearby',
} as const;

export interface EquipmentChangedPayload { ammo: number; capacity: number; refillProgress: number; reserve: number; }
export interface StationPayload { near: boolean; cost: number; affordable: boolean; }
export interface GermKilledPayload { germId: string; x: number; y: number; totalKills: number; }

export interface HealthPayload { hp: number; maxHp: number; }
export interface RoundPayload { round: number; title: string; }
export interface BossPayload { name: string; hp: number; maxHp: number; }
export interface RunResult { score: number; round: number; kills: number; bestScore: number; bestRound: number; newBestScore: boolean; newBestRound: boolean; }

export const events = new Phaser.Events.EventEmitter();
