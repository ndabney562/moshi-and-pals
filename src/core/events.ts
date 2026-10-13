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
} as const;

export interface EquipmentChangedPayload { ammo: number; capacity: number; refillProgress: number; }
export interface GermKilledPayload { germId: string; x: number; y: number; totalKills: number; }

export const events = new Phaser.Events.EventEmitter();
