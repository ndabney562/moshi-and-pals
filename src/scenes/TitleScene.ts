import Phaser from 'phaser';
import { COLORS } from '../config/theme';

/**
 * "Tap to start" screen. The tap also matters technically: iPhones only allow
 * game audio after the player has touched the screen once.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    const font = 'system-ui, -apple-system, sans-serif';

    // Noah's poster fills the screen. Wide phones crop it, mostly from the bottom, so the logo stays in view.
    const art = this.add.image(width / 2, 0, 'title-art').setOrigin(0.5, 0);
    const k = Math.max(width / art.width, height / art.height);
    const spare = art.height - height / k; // image rows that don't fit
    art.setScale(k).setY(-Math.min(spare, 30) * k);
    this.tweens.add({ targets: art, alpha: { from: 0, to: 1 }, duration: 400 });

    const tap = this.add.text(width / 2, height * 0.92, 'TAP TO START', {
      fontFamily: font, fontSize: '40px', fontStyle: '900', color: COLORS.uiText,
      backgroundColor: '#0d2b2ecc', padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setShadow(0, 3, '#000', 6);
    this.tweens.add({ targets: tap, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    this.input.keyboard?.once('keydown', () => this.begin());
    this.input.once('pointerdown', () => this.begin());
  }

  private begin(): void {
    this.scene.start('Game');
  }
}
