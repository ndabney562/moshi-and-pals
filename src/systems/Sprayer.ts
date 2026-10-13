import Phaser from 'phaser';
import type { EquipmentDef } from '../data/equipment';
import { events, GameEvents } from '../core/events';
import type { Droplet } from '../entities/Droplet';

/**
 * Runs a spray-type piece of equipment: supply, fire rate, spread, refills.
 * Works for anything defined in data/equipment.ts.
 */
export class Sprayer {
  ammo: number;
  private nextShotAt = 0;
  private refillStartedAt = -1;

  constructor(readonly def: EquipmentDef, private readonly droplets: Phaser.Physics.Arcade.Group) {
    this.ammo = def.capacity;
  }

  get refilling(): boolean {
    return this.refillStartedAt >= 0;
  }

  /** Tries to fire from (x, y) toward `angle`. Returns 'fired', 'empty', or 'wait'. */
  tryFire(x: number, y: number, angle: number, time: number): 'fired' | 'empty' | 'wait' {
    if (this.refilling || time < this.nextShotAt) return 'wait';
    if (this.ammo < this.def.costPerShot) {
      this.nextShotAt = time + 250;
      events.emit(GameEvents.EquipmentEmpty);
      return 'empty';
    }
    const d = this.def;
    this.nextShotAt = time + d.fireIntervalMs;
    this.ammo -= d.costPerShot;
    const spread = Phaser.Math.DegToRad(d.spreadDeg);
    for (let i = 0; i < d.dropletsPerShot; i++) {
      const droplet = this.droplets.get() as Droplet | null;
      if (!droplet) break; // pool exhausted; skip rather than allocate mid-fight
      const a = angle + Phaser.Math.FloatBetween(-spread / 2, spread / 2);
      const speed = d.dropletSpeed * Phaser.Math.FloatBetween(0.85, 1.1);
      droplet.fire(x, y, a, speed, d.range * Phaser.Math.FloatBetween(0.85, 1.05), d.damage, d.knockback, d.color);
    }
    this.emitChanged(time);
    return 'fired';
  }

  startRefill(time: number): void {
    if (this.refilling || this.ammo >= this.def.capacity) return;
    this.refillStartedAt = time;
    this.emitChanged(time);
  }

  update(time: number): void {
    if (!this.refilling) return;
    if (time - this.refillStartedAt >= this.def.refillMs) {
      this.refillStartedAt = -1;
      this.ammo = this.def.capacity;
      events.emit(GameEvents.EquipmentRefilled);
    }
    this.emitChanged(time);
  }

  emitChanged(time: number): void {
    events.emit(GameEvents.EquipmentChanged, {
      ammo: this.ammo,
      capacity: this.def.capacity,
      refillProgress: this.refilling ? Math.min(1, (time - this.refillStartedAt) / this.def.refillMs) : -1,
    });
  }
}
