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

  private art!: Phaser.GameObjects.Image;
  private tap!: Phaser.GameObjects.Text;

  create(): void {
    const font = 'system-ui, -apple-system, sans-serif';
    this.art = this.add.image(0, 0, 'title-art').setOrigin(0.5, 0);
    this.tweens.add({ targets: this.art, alpha: { from: 0, to: 1 }, duration: 400 });

    this.tap = this.add.text(0, 0, 'TAP TO START', {
      fontFamily: font, fontSize: '40px', fontStyle: '900', color: COLORS.uiText,
      backgroundColor: '#0d2b2ecc', padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setShadow(0, 3, '#000', 6);
    this.tweens.add({ targets: this.tap, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    // The screen's shape can change after load (rotating, Safari's toolbars), so re-fit whenever it does
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    this.input.keyboard?.once('keydown', () => this.begin());
    this.input.once('pointerdown', () => this.begin());
  }

  /** Noah's poster covers the screen. Wide phones crop it, mostly from the bottom, so the logo stays in view. */
  private layout(): void {
    const { width, height } = this.scale;
    const art = this.art;
    const k = Math.max(width / art.width, height / art.height);
    const spare = art.height - height / k; // image rows that don't fit
    art.setScale(k).setPosition(width / 2, -Math.min(spare, 30) * k);
    this.tap.setPosition(width / 2, height * 0.92);
  }

  private begin(): void {
    this.scene.start('Game');
  }
}
