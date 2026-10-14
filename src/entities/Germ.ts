import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { damp } from '../core/math';
import type { GermDef } from '../data/germs';

/** Per-round multipliers applied when a germ spawns. */
export interface GermScaling { hpMult: number; speedMult: number; }

/**
 * One germ. Pooled: the game reuses dead germs instead of creating new ones,
 * so call `spawn` to bring one to life and `kill` to return it to the pool.
 */
export class Germ extends Phaser.Physics.Arcade.Sprite {
  def!: GermDef;
  hp = 0;
  maxHp = 0;
  private speed = 0;
  /** While stunned (knocked back), the germ stops steering toward Eugene. */
  private stunnedUntil = 0;
  /** Foam slow: speed multiplier until `slowUntil`. */
  private slowUntil = 0;
  private slowFactor = 1;
  private flashUntil = 0;
  private wobble = Math.random() * 10;
  /** Damage gathered since the last floating number was shown. */
  pendingDamage = 0;
  lastNumberAt = 0;
  /** A STAT! crit landed since the last floating number (shows it in yellow). */
  pendingCrit = false;
  /** 1 right after a hit, easing to 0: the jelly squash. */
  private squash = 0;

  spawn(def: GermDef, x: number, y: number, scaling: GermScaling = { hpMult: 1, speedMult: 1 }): void {
    this.def = def;
    this.maxHp = this.hp = def.hp * scaling.hpMult;
    this.speed = def.speed * scaling.speedMult;
    this.pendingDamage = 0;
    this.pendingCrit = false;
    this.squash = 0;
    this.slowUntil = 0;
    this.setTexture(`germ-${def.id}`);
    this.enableBody(true, x, y, true, true);
    const r = def.radius;
    this.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.setDepth(def.boss ? 9 : 8).clearTint().setAlpha(1);
    this.setBounce(0.2);
    this.setPushable(!def.boss);
    // Squeeze out of the doorway
    this.setScale(0.1);
    this.scene.tweens.add({ targets: this, scale: 1, duration: def.boss ? 900 : 350, ease: 'Back.out' });
    this.stunnedUntil = this.scene.time.now + 350;
  }

  /** Stops moving (used when the run ends). */
  freeze(): void {
    this.setVelocity(0, 0);
    this.stunnedUntil = Number.MAX_SAFE_INTEGER;
  }

  /** Steers toward `target` at its normal speed, or at `speed` when a boss brain says so. */
  chase(target: { x: number; y: number }, time: number, dtMs: number, speed = this.speed): void {
    if (!this.active) return;
    if (time < this.slowUntil) speed *= this.slowFactor;
    if (time >= this.stunnedUntil) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      const body = this.body as Phaser.Physics.Arcade.Body;
      // Ease toward full chase speed so knockback recovers smoothly
      const steer = damp(0.1, dtMs);
      body.velocity.x = Phaser.Math.Linear(body.velocity.x, Math.cos(angle) * speed, steer);
      body.velocity.y = Phaser.Math.Linear(body.velocity.y, Math.sin(angle) * speed, steer);
      // RotateTo's step is radians per call: scale it by frame time
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle, 0.08 * (dtMs / (1000 / 60)));
    }
    // Jelly wobble, plus a squash right after each hit (no tweens: cheap with many germs)
    this.wobble += dtMs / 140;
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dtMs / BALANCE.feedback.squashMs);
    if (!this.scene.tweens.isTweening(this)) {
      const s = Math.sin(this.wobble) * 0.07;
      const q = this.squash;
      this.setScale(1 + s + 0.22 * q, 1 - s - 0.18 * q);
    }
    if (this.flashUntil && time >= this.flashUntil) {
      this.flashUntil = 0;
      this.clearTint();
    }
  }

  /** Applies damage and a push away from `fromAngle`. Returns true if this killed it. */
  hurt(amount: number, fromAngle: number, knockback: number, time: number): boolean {
    this.hp -= amount;
    this.pendingDamage += amount;
    this.squash = 1;
    this.setTintFill(0xffffff);
    this.flashUntil = time + BALANCE.feedback.hitFlashMs;
    const push = knockback * (1 - this.def.knockbackResist);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x += Math.cos(fromAngle) * push;
    body.velocity.y += Math.sin(fromAngle) * push;
    return this.hp <= 0;
  }

  /** Slows the germ (peroxide foam). */
  slow(time: number, factor: number, ms: number): void {
    this.slowFactor = Math.min(time < this.slowUntil ? this.slowFactor : 1, factor);
    this.slowUntil = Math.max(this.slowUntil, time + ms);
  }

  /** Stops steering for `ms` (it keeps sliding from whatever hit it). */
  stun(time: number, ms: number): void {
    this.stunnedUntil = Math.max(this.stunnedUntil, time + ms);
  }

  /** Shoves the germ away from a point and stuns it briefly (used when it bumps Eugene). */
  bounceFrom(x: number, y: number, time: number): void {
    const angle = Phaser.Math.Angle.Between(x, y, this.x, this.y);
    this.setVelocity(Math.cos(angle) * this.def.contactBounce, Math.sin(angle) * this.def.contactBounce);
    this.stunnedUntil = time + 450;
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
