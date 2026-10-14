import Phaser from 'phaser';
import type { EquipmentDef } from '../data/equipment';

/**
 * One droplet of disinfectant in flight: the hitbox that does the damage.
 * It is drawn as a faint puff; the mist particles (Fx.nozzleMist) are what
 * the player actually sees. Pooled by the game scene.
 */
export class Droplet extends Phaser.Physics.Arcade.Image {
  damage = 0;
  knockback = 0;
  /** The tool that fired it (effectiveness, slow, pierce). */
  def!: EquipmentDef;
  /** Germs it can still pass through. */
  pierceLeft = 0;
  /** Germs already hit, so a piercing droplet doesn't hit the same one every frame. */
  readonly hit = new Set<object>();
  private expiresAt = 0;
  private launchedAt = 0;

  fire(x: number, y: number, angle: number, speed: number, range: number, def: EquipmentDef): void {
    const { damage, knockback, color: tint } = def;
    this.def = def;
    this.pierceLeft = def.pierce ?? 0;
    this.hit.clear();
    this.enableBody(true, x, y, true, true);
    this.setTexture('puff').setTint(tint).setAlpha(0.25).setScale(0.4).setDepth(11);
    this.body!.setSize(16, 16).setOffset(16, 16);
    this.launchedAt = this.scene.time.now;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setRotation(angle);
    this.damage = damage;
    this.knockback = knockback;
    this.expiresAt = this.scene.time.now + (range / speed) * 1000;
  }

  /** Called by the pooled group each frame (runChildUpdate). */
  update(): void {
    if (!this.active) return;
    const time = this.scene.time.now; // game time, which pauses with the game
    const left = this.expiresAt - time;
    if (left <= 0) {
      this.retire();
      return;
    }
    // Spread out and fade like an aerosol
    const t = (time - this.launchedAt) / (this.expiresAt - this.launchedAt);
    this.setScale(0.4 + t * 1.2).setAlpha(0.25 * (1 - t));
  }

  retire(): void {
    this.disableBody(true, true);
  }
}
