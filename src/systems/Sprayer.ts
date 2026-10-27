import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { withLocker } from '../core/mechanics';
export { withLocker } from '../core/mechanics';
import type { EquipmentDef, ToolTier } from '../data/equipment';
import { events, GameEvents } from '../core/events';
import type { Droplet } from '../entities/Droplet';

/** A non-spray tool's use (see systems/Arsenal.ts): `shot` counts uses, `damageMult` carries FRESH BOTTLE. */
export type AttackHandler = (def: EquipmentDef, x: number, y: number, angle: number, time: number, shot: number, damageMult: number) => void;

/**
 * Runs a spray-type piece of equipment: supply, fire rate, spread, refills.
 * Works for anything defined in data/equipment.ts.
 */
export class Sprayer {
  ammo: number;
  /** Spare supply in the jug. */
  reserve: number;
  private nextShotAt = 0;
  /** Transient provider action-rate multiplier; 1 preserves baseline timings. */
  fireRate = 1;
  private refillStartedAt = -1;
  private lastFiredAt = -Infinity;
  private lastUpdateAt = -1;
  /** Total tools carried, for the HUD's SWAP button. Set by the game scene. */
  slots = 1;
  /** FREE REFILLS power-up: spraying costs nothing until then. */
  freeUntil = 0;
  /** FRESH BOTTLE (a Perfect Pour) boosts damage until then. */
  private freshUntil = 0;
  /** This refill already got the spill penalty. */
  private spilled = false;
  /** Uses so far (Wipes make every Nth swipe a big one). */
  private uses = 0;

  /** Pour time multiplier (Cold Brew). */
  refillScale = 1;
  /** Jug size multiplier (Pharmacology). Set it with `scaleJug`. */
  private jugScale = 1;

  /** Compounding Station upgrades bought for this tool (0 = generic). */
  tier = 0;
  /** The tool's current numbers (its base definition plus any upgrades, Locker levels included). */
  def: EquipmentDef;
  /** Base plus Compounding Station tiers, before the Locker. */
  private tiered: EquipmentDef;

  /** `locker`: Equipment Locker levels bought for this tool between shifts. */
  constructor(private readonly base: EquipmentDef, private readonly droplets: Phaser.Physics.Arcade.Group, private readonly onAttack?: AttackHandler, readonly locker = 0) {
    this.tiered = base;
    this.def = withLocker(base, locker);
    this.ammo = this.def.capacity;
    this.reserve = this.def.reserve;
  }

  get refilling(): boolean {
    return this.refillStartedAt >= 0;
  }

  /** Tries to fire from (x, y) toward `angle`. Returns 'fired', 'empty', or 'wait'. */
  tryFire(x: number, y: number, angle: number, time: number): 'fired' | 'empty' | 'wait' {
    if (this.refilling || time < this.nextShotAt) return 'wait';
    const free = time < this.freeUntil;
    if (!free && this.ammo < this.def.costPerShot) {
      this.nextShotAt = time + 250;
      events.emit(GameEvents.EquipmentEmpty);
      return 'empty';
    }
    const d = this.def;
    this.nextShotAt = time + d.fireIntervalMs / this.fireRate;
    if (!free) this.ammo -= d.costPerShot;
    this.lastFiredAt = time;
    const freshMult = time < this.freshUntil ? BALANCE.pour.freshMult : 1;
    if (d.attack) {
      // Wipes, Gel Launcher, Defib Paddles: no droplets, the arsenal does the rest
      this.uses++;
      this.onAttack?.(d, x, y, angle, time, this.uses, freshMult);
      this.emitChanged(time);
      return 'fired';
    }
    const spread = Phaser.Math.DegToRad(d.spreadDeg);
    for (let i = 0; i < d.dropletsPerShot; i++) {
      const droplet = this.droplets.get() as Droplet | null;
      if (!droplet) break; // pool exhausted; skip rather than allocate mid-fight
      const a = angle + Phaser.Math.FloatBetween(-spread / 2, spread / 2);
      const speed = d.dropletSpeed * Phaser.Math.FloatBetween(0.85, 1.1);
      droplet.fire(x, y, a, speed, d.range * Phaser.Math.FloatBetween(0.85, 1.05), d);
      droplet.damage *= freshMult;
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

  /** The next upgrade for this tool, if there is one. */
  get nextTier(): ToolTier | undefined {
    return this.base.tiers?.[this.tier];
  }

  /** Applies the next Compounding Station upgrade. Supply keeps the same fraction of the (maybe bigger) tank. */
  upgrade(time: number): ToolTier | undefined {
    const next = this.nextTier;
    if (!next) return undefined;
    const old = this.def;
    this.tier++;
    this.tiered = { ...this.tiered, ...next.mods };
    this.def = withLocker(this.tiered, this.locker);
    this.ammo = Math.min(this.def.capacity, (this.ammo / old.capacity) * this.def.capacity);
    if (old.reserve > 0) this.reserve = Math.min(this.maxReserve, (this.reserve / (old.reserve * this.jugScale)) * this.maxReserve);
    this.emitChanged(time);
    return next;
  }

  /** 0..1 through the current refill, or -1 when not refilling. */
  refillProgress(time: number): number {
    return this.refilling ? Math.min(1, (time - this.refillStartedAt) / (this.def.refillMs * this.refillScale)) : -1;
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

  /** How much the jug holds. */
  get maxReserve(): number {
    return Math.round(this.def.reserve * this.jugScale);
  }

  /** Makes the jug bigger or smaller (and fills it to match). */
  scaleJug(k: number): void {
    this.jugScale = k;
    this.reserve = this.maxReserve;
  }

  get reserveFull(): boolean {
    return this.reserve >= this.maxReserve;
  }

  /** Tops the jug back up (bought at the supply cart). */
  restock(time: number): void {
    this.reserve = this.maxReserve;
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
    if (time - this.refillStartedAt >= this.def.refillMs * this.refillScale) this.finishRefill();
    this.emitChanged(time);
  }

  emitChanged(time: number): void {
    events.emit(GameEvents.EquipmentChanged, {
      ammo: this.ammo,
      capacity: this.def.capacity,
      refillProgress: this.refillProgress(time),
      reserve: this.reserve,
      name: this.tier > 0 ? `${this.def.name} ${'I'.repeat(this.tier + 1)}` : this.def.name,
      unit: this.def.unit,
      spareName: this.def.spareName ?? 'JUG',
      selfCharging: !!this.def.rechargePerSecond,
      slots: this.slots,
      pourWindow: [BALANCE.pour.windowStart, BALANCE.pour.windowEnd],
      fresh: this.fresh(time),
    });
  }
}
