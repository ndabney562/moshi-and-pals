import Phaser from 'phaser';

/** One droplet of disinfectant in flight. Pooled by the game scene. */
export class Droplet extends Phaser.Physics.Arcade.Image {
  damage = 0;
  knockback = 0;
  private expiresAt = 0;

  fire(x: number, y: number, angle: number, speed: number, range: number, damage: number, knockback: number, tint: number): void {
    this.enableBody(true, x, y, true, true);
    this.setTint(tint).setAlpha(0.95).setScale(Phaser.Math.FloatBetween(0.55, 0.85)).setDepth(11);
    this.setBlendMode(Phaser.BlendModes.ADD);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setRotation(angle);
    this.damage = damage;
    this.knockback = knockback;
    this.expiresAt = this.scene.time.now + (range / speed) * 1000;
  }

  /** Called by the pooled group each frame (runChildUpdate). */
  update(time: number): void {
    if (!this.active) return;
    const left = this.expiresAt - time;
    if (left <= 0) this.retire();
    else if (left < 120) this.setAlpha(left / 120); // evaporate at the end of its range
  }

  retire(): void {
    this.disableBody(true, true);
  }
}
