import Phaser from 'phaser';

/** Horizontal meter with a label, used for Eugene's health and boss health. */
export class Bar extends Phaser.GameObjects.Container {
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly trail: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private frac = 1;

  constructor(scene: Phaser.Scene, readonly barWidth: number, private readonly barHeight: number, private readonly color: number, text: string) {
    super(scene, 0, 0);
    const bg = scene.add.rectangle(0, 0, barWidth + 6, barHeight + 6, 0x0d2b2e, 0.85).setOrigin(0).setStrokeStyle(2, 0xe8fff9, 0.8);
    // A pale "trail" lags behind the fill so big hits read clearly
    this.trail = scene.add.rectangle(3, 3, barWidth, barHeight, 0xffffff, 0.6).setOrigin(0);
    this.fill = scene.add.rectangle(3, 3, barWidth, barHeight, color).setOrigin(0);
    this.label = scene.add.text(10, 3 + barHeight / 2, text, {
      fontFamily: 'system-ui, sans-serif', fontSize: `${Math.round(barHeight * 0.7)}px`, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0, 0.5).setShadow(0, 1, '#000', 3);
    this.add([bg, this.trail, this.fill, this.label]);
    scene.add.existing(this);
  }

  setValue(value: number, max: number, text?: string): void {
    const next = Phaser.Math.Clamp(value / max, 0, 1);
    if (text !== undefined) this.label.setText(text);
    this.fill.width = this.barWidth * next;
    if (next < this.frac) {
      this.scene.tweens.killTweensOf(this.trail);
      this.scene.tweens.add({ targets: this.trail, width: this.barWidth * next, delay: 250, duration: 350 });
    } else {
      this.trail.width = this.barWidth * next;
    }
    this.frac = next;
  }

  /** Recolor (e.g. health turning red when low). */
  setColor(color: number): void {
    this.fill.fillColor = color;
  }

  /** Total height including the frame. */
  get outerHeight(): number {
    return this.barHeight + 6;
  }

  resetColor(): void {
    this.fill.fillColor = this.color;
  }
}
