import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import { applyUpdate, offerFilesToCache, onUpdateReady } from '../core/updates';
import { progress } from '../core/progress';

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
  private updatePill!: Phaser.GameObjects.Text;
  private boardButton!: Phaser.GameObjects.Text;

  private started = false;

  create(): void {
    this.started = false;
    const font = 'system-ui, -apple-system, sans-serif';
    this.art = this.add.image(0, 0, 'title-art').setOrigin(0.5, 0);
    this.tweens.add({ targets: this.art, alpha: { from: 0, to: 1 }, duration: 400 });

    this.tap = this.add.text(0, 0, 'TAP TO START', {
      fontFamily: font, fontSize: '40px', fontStyle: '900', color: COLORS.uiText,
      backgroundColor: '#0d2b2ecc', padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setShadow(0, 3, '#000', 6);
    this.tweens.add({ targets: this.tap, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    // A newer build is live: offer it (tapping here reloads instead of starting)
    this.updatePill = this.add.text(0, 0, '✨ UPDATE READY · TAP HERE TO GET IT', {
      fontFamily: font, fontSize: '22px', fontStyle: '900', color: '#0d2b2e', backgroundColor: '#ffe66d', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
    this.updatePill.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      applyUpdate();
    });
    const off = onUpdateReady(() => this.updatePill.setVisible(true));
    // Everything's loaded by now: let the offline cache have it
    offerFilesToCache();
    navigator.serviceWorker?.ready.then(() => offerFilesToCache()).catch(() => undefined);
    this.events.once('shutdown', off);

    // The Residency Board: spend CME Credits between shifts
    this.boardButton = this.add.text(0, 0, `🎓 RESIDENCY BOARD · ${progress().credits} CME`, {
      fontFamily: font, fontSize: '20px', fontStyle: '900', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 14, y: 9 },
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    this.boardButton.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.started = true;
      this.scene.start('Board');
    });

    // The screen's shape can change after load (rotating, Safari's toolbars), so re-fit whenever it does
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    this.input.keyboard?.once('keydown', () => this.begin());
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.includes(this.updatePill) && !over.includes(this.boardButton)) this.begin();
    });
  }

  /** Noah's poster covers the screen. Wide phones crop it, mostly from the bottom, so the logo stays in view. */
  private layout(): void {
    const { width, height } = this.scale;
    const art = this.art;
    const k = Math.max(width / art.width, height / art.height);
    const spare = art.height - height / k; // image rows that don't fit
    art.setScale(k).setPosition(width / 2, -Math.min(spare, 30) * k);
    this.tap.setPosition(width / 2, height * 0.92);
    this.updatePill.setPosition(width / 2, height * 0.8);
    this.boardButton.setPosition(24, height - 20);
  }

  private begin(): void {
    if (this.started) return;
    this.started = true;
    this.scene.start('Game');
  }
}
