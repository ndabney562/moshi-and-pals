import Phaser from 'phaser';

/** A Sneezer's mucus glob in flight. Pooled by the game scene, which handles hits and expiry. */
export class Glob extends Phaser.Physics.Arcade.Image {
  damage = 0;
  expiresAt = 0;
  puddleMs = 0;
  puddleRadius = 0;
  puddleSlow = 1;

  fire(x: number, y: number, angle: number, speed: number, range: number, time: number): void {
    this.enableBody(true, x, y, true, true);
    this.setTexture('glob').setDepth(11).setScale(1).setAlpha(1);
    this.body!.setCircle(9, 3, 3);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.expiresAt = time + (range / speed) * 1000;
  }

  retire(): void {
    this.disableBody(true, true);
  }
}
