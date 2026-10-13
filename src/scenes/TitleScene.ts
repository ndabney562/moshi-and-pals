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
    this.add.tileSprite(0, 0, width, height, 'floor').setOrigin(0).setAlpha(0.15);

    const font = 'system-ui, -apple-system, sans-serif';
    const title = this.add.text(width / 2, height * 0.24, 'MOSHI AND PALS', {
      fontFamily: font, fontSize: '84px', fontStyle: '900', color: COLORS.uiText,
    }).setOrigin(0.5).setShadow(0, 6, '#000', 10);
    this.add.text(width / 2, height * 0.24 + 66, 'An Infection Control Emergency at MoshiLand Urgent Care', {
      fontFamily: font, fontSize: '26px', fontStyle: 'italic', color: COLORS.uiAccent,
    }).setOrigin(0.5);

    const eugene = this.add.image(width / 2, height * 0.58, 'eugene').setScale(1.8).setAngle(-90);
    this.tweens.add({ targets: eugene, angle: -80, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const tap = this.add.text(width / 2, height * 0.84, 'TAP TO START', {
      fontFamily: font, fontSize: '34px', fontStyle: 'bold', color: COLORS.uiText,
    }).setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    this.input.keyboard?.once('keydown', () => this.begin());
    this.input.once('pointerdown', () => this.begin());

    // Gentle intro pulse on the title
    this.tweens.add({ targets: title, scale: { from: 0.9, to: 1 }, duration: 500, ease: 'Back.out' });
  }

  private begin(): void {
    this.scene.start('Game');
  }
}
