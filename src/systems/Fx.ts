import Phaser from 'phaser';
import { BALANCE } from '../config/balance';

const MAX_STAINS = 24;
const MAX_NUMBERS = 16;
const MAX_POPS = 16;
const MAX_HALOS = 12;

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
  private readonly pops: Phaser.GameObjects.Image[] = [];
  private nextPop = 0;
  private readonly halos: Phaser.GameObjects.Image[] = [];
  private nextHalo = 0;

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
    for (let i = 0; i < MAX_POPS; i++) this.pops.push(scene.add.image(0, 0, 'blob').setDepth(12).setVisible(false));
    for (let i = 0; i < MAX_HALOS; i++) this.halos.push(scene.add.image(0, 0, 'halo').setDepth(21).setVisible(false));
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

  /** Particles currently on screen (debug overlay). */
  aliveParticles(): number {
    return this.mist.getAliveParticleCount() + this.splash.getAliveParticleCount() + this.splat.getAliveParticleCount();
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

  /** A disinfected germ swells and bursts (a ghost of its sprite), and its little halo floats away. */
  germPop(texture: string, x: number, y: number, rotation: number, scale: number, haloY: number, big = false): void {
    const pop = this.pops[this.nextPop];
    this.nextPop = (this.nextPop + 1) % MAX_POPS;
    this.scene.tweens.killTweensOf(pop);
    pop.setTexture(texture).setPosition(x, y).setRotation(rotation).setScale(scale).setAlpha(0.9).setVisible(true).setTintFill(0xffffff);
    this.scene.tweens.add({
      targets: pop, scale: scale * (big ? 1.8 : 1.45), alpha: 0, duration: big ? 320 : 140, ease: 'Quad.out',
      onComplete: () => pop.setVisible(false),
    });
    const halo = this.halos[this.nextHalo];
    this.nextHalo = (this.nextHalo + 1) % MAX_HALOS;
    this.scene.tweens.killTweensOf(halo);
    halo.setPosition(x, haloY).setAlpha(1).setScale(big ? 2.2 : 1).setVisible(true);
    this.scene.tweens.add({
      targets: halo, y: haloY - (big ? 110 : 55), alpha: 0, duration: big ? 1400 : 700, ease: 'Sine.out',
      onComplete: () => halo.setVisible(false),
    });
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
