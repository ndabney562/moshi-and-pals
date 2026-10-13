import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import type { GermDef } from '../data/germs';

/**
 * One germ. Pooled: the game reuses dead germs instead of creating new ones,
 * so call `spawn` to bring one to life and `kill` to return it to the pool.
 */
export class Germ extends Phaser.Physics.Arcade.Sprite {
  def!: GermDef;
  hp = 0;
  /** While stunned (knocked back), the germ stops steering toward Eugene. */
  private stunnedUntil = 0;
  private flashUntil = 0;
  private wobble = Math.random() * 10;
  /** Damage gathered since the last floating number was shown. */
  pendingDamage = 0;
  lastNumberAt = 0;

  spawn(def: GermDef, x: number, y: number): void {
    this.def = def;
    this.hp = def.hp;
    this.pendingDamage = 0;
    this.setTexture(`germ-${def.id}`);
    this.enableBody(true, x, y, true, true);
    const r = def.radius;
    this.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.setDepth(8).clearTint().setAlpha(1);
    this.setBounce(0.2);
    // Squeeze out of the doorway
    this.setScale(0.1);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 350, ease: 'Back.out' });
    this.stunnedUntil = this.scene.time.now + 350;
  }

  chase(target: { x: number; y: number }, time: number, dtMs: number): void {
    if (!this.active) return;
    if (time >= this.stunnedUntil) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      const body = this.body as Phaser.Physics.Arcade.Body;
      // Ease toward full chase speed so knockback recovers smoothly
      body.velocity.x = Phaser.Math.Linear(body.velocity.x, Math.cos(angle) * this.def.speed, 0.1);
      body.velocity.y = Phaser.Math.Linear(body.velocity.y, Math.sin(angle) * this.def.speed, 0.1);
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle, 0.08);
    }
    // Jelly wobble
    this.wobble += dtMs / 140;
    if (!this.scene.tweens.isTweening(this)) {
      const s = Math.sin(this.wobble) * 0.07;
      this.setScale(1 + s, 1 - s);
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
    this.setTintFill(0xffffff);
    this.flashUntil = time + BALANCE.feedback.hitFlashMs;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x += Math.cos(fromAngle) * knockback;
    body.velocity.y += Math.sin(fromAngle) * knockback;
    return this.hp <= 0;
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
