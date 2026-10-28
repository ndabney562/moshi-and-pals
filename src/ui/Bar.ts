import Phaser from 'phaser';
import { MENU } from './menuTheme';

/**
 * Tactile arcade status meter with rounded pill capsule styling,
 * drop-shadow elevation, damage trail tweening, and optional avatar badge.
 */
export class Bar extends Phaser.GameObjects.Container {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private avatarBack?: Phaser.GameObjects.Arc;
  private avatarImage?: Phaser.GameObjects.Image;
  private avatarRing?: Phaser.GameObjects.Arc;

  private frac = 1;
  public trailFrac = 1;
  private currentColor: number;

  constructor(
    scene: Phaser.Scene,
    readonly barWidth: number,
    readonly barHeight: number,
    private readonly color: number,
    text: string,
    avatar?: { key: string; frame?: string },
  ) {
    super(scene, 0, 0);
    this.currentColor = color;

    this.gfx = scene.add.graphics();
    const fontH = Math.max(12, Math.round(barHeight * 0.72));
    this.label = scene.add.text(this.textOffsetX(avatar), barHeight / 2, text, {
      fontFamily: MENU.font,
      fontSize: `${fontH}px`,
      fontStyle: '900',
      color: '#ffffff',
    }).setOrigin(0, 0.5).setShadow(0, 2, '#051314', 3);

    this.add([this.gfx, this.label]);

    if (avatar) {
      this.setupAvatar(scene, avatar);
    }

    this.redraw();
    scene.add.existing(this);
  }

  private textOffsetX(avatar?: { key: string; frame?: string }): number {
    return avatar ? this.barHeight + 16 : 14;
  }

  private setupAvatar(scene: Phaser.Scene, avatar: { key: string; frame?: string }): void {
    const avatarSize = this.barHeight + 14;
    const cx = avatarSize / 2 - 4;
    const cy = this.barHeight / 2;

    // 1. Warm cream avatar background circle matching menu paper
    this.avatarBack = scene.add.circle(cx, cy, avatarSize / 2, 0xfaf5eb)
      .setStrokeStyle(2.5, 0x0c2528, 0.9);

    // 2. Avatar portrait image
    if (avatar.frame !== undefined) {
      this.avatarImage = scene.add.image(cx, cy, avatar.key, avatar.frame);
    } else {
      this.avatarImage = scene.add.image(cx, cy, avatar.key);
    }
    const maxDim = Math.max(this.avatarImage.width, this.avatarImage.height) || 1;
    this.avatarImage.setDisplaySize((avatarSize - 6) * (this.avatarImage.width / maxDim), (avatarSize - 6) * (this.avatarImage.height / maxDim));

    // 3. Tactile outer bezel ring
    this.avatarRing = scene.add.circle(cx, cy, avatarSize / 2 + 1, 0x000000, 0)
      .setStrokeStyle(3, this.color, 0.95);

    this.add([this.avatarBack, this.avatarImage, this.avatarRing]);
  }

  private redraw(): void {
    const g = this.gfx;
    g.clear();

    const w = this.barWidth;
    const h = this.barHeight;
    const radius = Math.round(h / 2);
    const x0 = this.avatarRing ? Math.round(h * 0.55) : 0;

    // 1. Bottom elevation drop-shadow
    g.fillStyle(0x051314, 0.6);
    g.fillRoundedRect(x0, 3, w, h, radius);

    // 2. Beveled outer pill casing
    g.fillStyle(0x0c2528, 0.92);
    g.fillRoundedRect(x0, 0, w, h, radius);
    g.lineStyle(2, 0x1b4549, 0.85);
    g.strokeRoundedRect(x0, 0, w, h, radius);

    // 3. Recessed inner track
    const pad = 2.5;
    const trackW = w - pad * 2;
    const trackH = h - pad * 2;
    const trackR = Math.max(2, radius - pad);
    g.fillStyle(0x06181b, 0.95);
    g.fillRoundedRect(x0 + pad, pad, trackW, trackH, trackR);

    // 4. Lagging damage trail
    const trailW = Math.max(0, trackW * this.trailFrac);
    if (trailW > 2) {
      g.fillStyle(0xffffff, 0.65);
      g.fillRoundedRect(x0 + pad, pad, trailW, trackH, trackR);
    }

    // 5. Active health / value fill
    const fillW = Math.max(0, trackW * this.frac);
    if (fillW > 2) {
      g.fillStyle(this.currentColor, 0.95);
      g.fillRoundedRect(x0 + pad, pad, fillW, trackH, trackR);
    }

    // 6. Top-edge glass gloss highlight
    g.lineStyle(1.5, 0xffffff, 0.32);
    g.beginPath();
    g.moveTo(x0 + pad + trackR * 0.5, pad + 1.5);
    g.lineTo(x0 + pad + trackW - trackR * 0.5, pad + 1.5);
    g.strokePath();
  }

  setValue(value: number, max: number, text?: string): void {
    const next = Phaser.Math.Clamp(value / max, 0, 1);
    if (text !== undefined) this.label.setText(text);

    if (next < this.frac) {
      this.frac = next;
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        trailFrac: next,
        delay: 240,
        duration: 340,
        ease: 'Quad.out',
        onUpdate: () => this.redraw(),
      });
    } else {
      this.frac = next;
      this.trailFrac = next;
    }
    this.redraw();
  }

  /** Recolor (e.g. health turning red or amber when low). */
  setColor(color: number): void {
    if (this.currentColor !== color) {
      this.currentColor = color;
      this.avatarRing?.setStrokeStyle(3, color, 0.95);
      this.redraw();
    }
  }

  /** Total height including the frame and avatar if present. */
  get outerHeight(): number {
    return this.avatarRing ? this.barHeight + 14 : this.barHeight + 6;
  }

  resetColor(): void {
    this.setColor(this.color);
  }
}
