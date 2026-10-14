import Phaser from 'phaser';
import { BALANCE } from '../config/balance';

const MAX_STAINS = 24;
const MAX_NUMBERS = 16;

/**
 * Visual feedback: mist at the nozzle, splashes, germ splats, floor stains,
 * and floating damage numbers. Everything is pooled or capped so busy
 * rounds don't hurt iPhone performance.
 */
export class Fx {
  private readonly mist: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly splash: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly splat: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly stains: Phaser.GameObjects.Image[] = [];
  private nextStain = 0;
  private readonly numbers: Phaser.GameObjects.Text[] = [];
  private nextNumber = 0;

  constructor(private readonly scene: Phaser.Scene) {
    // The visible spray: a cone of soft puffs that drift out and spread like an aerosol
    this.mist = scene.add.particles(0, 0, 'puff', {
      emitting: false, lifespan: { min: 300, max: 400 }, speed: { min: 300, max: 560 }, scale: { start: 0.4, end: 2.3 },
      alpha: { start: 0.8, end: 0.05 }, tint: [0xe6f7ff, 0xa8dcff, 0x7cc4f2], rotate: { min: 0, max: 360 }, maxParticles: 220,
    }).setDepth(12);
    this.splash = scene.add.particles(0, 0, 'puff', {
      emitting: false, lifespan: 260, speed: { min: 30, max: 90 }, scale: { start: 0.5, end: 1.2 },
      alpha: { start: 0.45, end: 0 }, tint: 0xd8f3ff, maxParticles: 60,
    }).setDepth(12);
    this.splat = scene.add.particles(0, 0, 'blob', {
      emitting: false, lifespan: 450, speed: { min: 120, max: 320 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0.2 }, maxParticles: 120,
    }).setDepth(12);

    for (let i = 0; i < MAX_STAINS; i++) {
      this.stains.push(scene.add.image(0, 0, 'blob').setDepth(1).setVisible(false));
    }
    for (let i = 0; i < MAX_NUMBERS; i++) {
      this.numbers.push(scene.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
        stroke: '#1b2b30', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(20).setVisible(false));
    }
  }

  /** One burst of mist from the nozzle, fanned across the spray cone. */
  nozzleMist(x: number, y: number, angle: number, spreadDeg: number, tint = 0xbfe9ff, puffs = 5): void {
    const deg = Phaser.Math.RadToDeg(angle);
    const half = spreadDeg / 2 + 4;
    this.mist.setEmitterAngle({ min: deg - half, max: deg + half });
    this.mist.particleTint = tint;
    this.mist.explode(puffs, x, y);
  }

  dropletSplash(x: number, y: number): void {
    this.splash.explode(1, x, y);
  }

  germSplat(x: number, y: number, color: number): void {
    this.splat.particleTint = color;
    this.splat.explode(14, x, y);
    // Leave a fading stain on the floor
    const stain = this.stains[this.nextStain];
    this.nextStain = (this.nextStain + 1) % MAX_STAINS;
    this.scene.tweens.killTweensOf(stain);
    stain.setPosition(x, y).setTint(color).setAlpha(0.45).setVisible(true)
      .setScale(Phaser.Math.FloatBetween(2.6, 3.4), Phaser.Math.FloatBetween(2.0, 2.8)).setRotation(Math.random() * Math.PI);
    this.scene.tweens.add({ targets: stain, alpha: 0, delay: 2500, duration: 2000, onComplete: () => stain.setVisible(false) });
    this.scene.cameras.main.shake(BALANCE.feedback.killShakeMs, BALANCE.feedback.killShakeIntensity);
  }

  number(x: number, y: number, text: string, color = '#ffffff', size = 20): void {
    const t = this.numbers[this.nextNumber];
    this.nextNumber = (this.nextNumber + 1) % MAX_NUMBERS;
    this.scene.tweens.killTweensOf(t);
    t.setText(text).setColor(color).setFontSize(size).setPosition(x + Phaser.Math.Between(-8, 8), y).setAlpha(1).setScale(1).setVisible(true);
    this.scene.tweens.add({
      targets: t, y: y - 46, alpha: 0, scale: 1.15, duration: 600, ease: 'Cubic.out',
      onComplete: () => t.setVisible(false),
    });
  }
}
