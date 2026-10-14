import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import type { EquipmentDef } from '../data/equipment';
import { events, GameEvents } from '../core/events';
import type { Droplet } from '../entities/Droplet';

/**
 * Runs a spray-type piece of equipment: supply, fire rate, spread, refills.
 * Works for anything defined in data/equipment.ts.
 */
export class Sprayer {
  ammo: number;
  /** Spare supply in the jug. */
  reserve: number;
  private nextShotAt = 0;
  private refillStartedAt = -1;
  private lastFiredAt = -Infinity;
  private lastUpdateAt = -1;
  /** Total tools carried, for the HUD's SWAP button. Set by the game scene. */
  slots = 1;
  /** FRESH BOTTLE (a Perfect Pour) boosts damage until then. */
  private freshUntil = 0;
  /** This refill already got the spill penalty. */
  private spilled = false;

  constructor(readonly def: EquipmentDef, private readonly droplets: Phaser.Physics.Arcade.Group) {
    this.ammo = def.capacity;
    this.reserve = def.reserve;
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
    this.lastFiredAt = time;
    const spread = Phaser.Math.DegToRad(d.spreadDeg);
    for (let i = 0; i < d.dropletsPerShot; i++) {
      const droplet = this.droplets.get() as Droplet | null;
      if (!droplet) break; // pool exhausted; skip rather than allocate mid-fight
      const a = angle + Phaser.Math.FloatBetween(-spread / 2, spread / 2);
      const speed = d.dropletSpeed * Phaser.Math.FloatBetween(0.85, 1.1);
      droplet.fire(x, y, a, speed, d.range * Phaser.Math.FloatBetween(0.85, 1.05), d);
      if (time < this.freshUntil) droplet.damage *= BALANCE.pour.freshMult;
    }
    this.emitChanged(time);
    return 'fired';
  }

  /** Starts pouring from the jug. Returns false if there is nothing to pour. */
  startRefill(time: number): boolean {
    if (this.def.rechargePerSecond) return true; // charges itself
    if (this.refilling || this.ammo >= this.def.capacity) return true;
    if (this.reserve <= 0) return false;
    this.refillStartedAt = time;
    this.spilled = false;
    this.emitChanged(time);
    return true;
  }

  /** 0..1 through the current refill, or -1 when not refilling. */
  refillProgress(time: number): number {
    return this.refilling ? Math.min(1, (time - this.refillStartedAt) / this.def.refillMs) : -1;
  }

  /** Whether FRESH BOTTLE is boosting damage right now. */
  fresh(time: number): boolean {
    return time < this.freshUntil;
  }

  /**
   * PERFECT POUR: REFILL pressed again mid-pour. Inside the sweet spot the bottle fills instantly and
   * FRESH BOTTLE kicks in; outside it, the pour spills and takes longer (once per refill).
   */
  pourTap(time: number): 'perfect' | 'spill' | 'none' {
    if (!this.refilling) return 'none';
    const p = this.refillProgress(time);
    const { windowStart, windowEnd, freshMs, spillMs } = BALANCE.pour;
    if (p >= windowStart && p <= windowEnd) {
      this.finishRefill();
      this.freshUntil = time + freshMs;
      this.emitChanged(time);
      return 'perfect';
    }
    if (this.spilled) return 'none';
    this.spilled = true;
    this.refillStartedAt += spillMs;
    this.emitChanged(time);
    return 'spill';
  }

  private finishRefill(): void {
    this.refillStartedAt = -1;
    const poured = Math.min(this.def.capacity - this.ammo, this.reserve);
    this.ammo += poured;
    this.reserve -= poured;
    events.emit(GameEvents.EquipmentRefilled);
  }

  get reserveFull(): boolean {
    return this.reserve >= this.def.reserve;
  }

  /** Tops the jug back up (bought at the supply cart). */
  restock(time: number): void {
    this.reserve = this.def.reserve;
    this.emitChanged(time);
  }

  update(time: number): void {
    const dt = this.lastUpdateAt < 0 ? 0 : time - this.lastUpdateAt;
    this.lastUpdateAt = time;
    const rate = this.def.rechargePerSecond;
    if (rate && this.ammo < this.def.capacity && time - this.lastFiredAt > 400) {
      this.ammo = Math.min(this.def.capacity, this.ammo + (rate * dt) / 1000);
      this.emitChanged(time);
    }
    if (!this.refilling) return;
    if (time - this.refillStartedAt >= this.def.refillMs) this.finishRefill();
    this.emitChanged(time);
  }

  emitChanged(time: number): void {
    events.emit(GameEvents.EquipmentChanged, {
      ammo: this.ammo,
      capacity: this.def.capacity,
      refillProgress: this.refillProgress(time),
      reserve: this.reserve,
      name: this.def.name,
      unit: this.def.unit,
      selfCharging: !!this.def.rechargePerSecond,
      slots: this.slots,
      pourWindow: [BALANCE.pour.windowStart, BALANCE.pour.windowEnd],
      fresh: this.fresh(time),
    });
  }
}
