import Phaser from 'phaser';

/**
 * One droplet of disinfectant in flight: the hitbox that does the damage.
 * It is drawn as a faint puff; the mist particles (Fx.nozzleMist) are what
 * the player actually sees. Pooled by the game scene.
 */
export class Droplet extends Phaser.Physics.Arcade.Image {
  damage = 0;
  knockback = 0;
  private expiresAt = 0;
  private launchedAt = 0;

  fire(x: number, y: number, angle: number, speed: number, range: number, damage: number, knockback: number, tint: number): void {
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
  update(time: number): void {
    if (!this.active) return;
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
