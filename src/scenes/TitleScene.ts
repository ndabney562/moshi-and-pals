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

    // Noah's poster, blown up and dimmed behind, then full size on the left
    const backdrop = this.add.image(width / 2, height / 2, 'title-art');
    backdrop.setScale(Math.max(width / backdrop.width, height / backdrop.height)).setAlpha(0.14);
    const art = this.add.image(0, height / 2, 'title-art').setOrigin(0, 0.5);
    art.setScale((height * 0.96) / art.height).setX(Math.max(16, width * 0.06));
    this.tweens.add({ targets: art, scale: { from: art.scale * 0.94, to: art.scale }, duration: 500, ease: 'Back.out' });

    // Everything else sits in the space to the right of the poster
    const cx = (art.x + art.displayWidth + width) / 2;
    this.add.text(cx, height * 0.36, 'An Infection Control Emergency\nat MoshiLand Urgent Care', {
      fontFamily: font, fontSize: '28px', fontStyle: 'italic', color: COLORS.uiAccent, align: 'center',
    }).setOrigin(0.5).setShadow(0, 3, '#000', 8);

    const tap = this.add.text(cx, height * 0.6, 'TAP TO START', {
      fontFamily: font, fontSize: '44px', fontStyle: '900', color: COLORS.uiText,
    }).setOrigin(0.5).setShadow(0, 4, '#000', 10);
    this.tweens.add({ targets: tap, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    this.input.keyboard?.once('keydown', () => this.begin());
    this.input.once('pointerdown', () => this.begin());
  }

  private begin(): void {
    this.scene.start('Game');
  }
}
