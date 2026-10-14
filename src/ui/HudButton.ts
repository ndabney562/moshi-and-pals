import Phaser from 'phaser';

/** Round on-screen button with a label and optional progress ring (cooldowns, refills). */
export class HudButton extends Phaser.GameObjects.Container {
  private readonly disc: Phaser.GameObjects.Arc;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private pulse?: Phaser.Tweens.Tween;
  /** Pointer currently holding this button down, if any. */
  private holdPointerId: number | null = null;

  constructor(scene: Phaser.Scene, readonly radius: number, text: string, private readonly color: number, onPress: () => void) {
    super(scene, 0, 0);
    this.disc = scene.add.circle(0, 0, radius, color, 0.35).setStrokeStyle(4, color, 0.9);
    this.ring = scene.add.graphics();
    this.label = scene.add.text(0, 0, text, {
      fontFamily: 'system-ui, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setShadow(0, 2, '#000', 3);
    this.add([this.disc, this.ring, this.label]);
    scene.add.existing(this);

    this.setSize(radius * 2, radius * 2);
    this.setInteractive(new Phaser.Geom.Circle(radius, radius, radius * 1.15), Phaser.Geom.Circle.Contains);
    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.holdPointerId = pointer.id;
      this.disc.setFillStyle(this.color, 0.7);
      this.setScale(0.92);
      onPress();
    });
    // Release when that finger lifts anywhere, so a thumb that slides off still lets go
    const release = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.holdPointerId) return;
      this.holdPointerId = null;
      this.disc.setFillStyle(this.color, 0.35);
      this.setScale(1);
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    this.once('destroy', () => {
      scene.input.off('pointerup', release);
      scene.input.off('pointerupoutside', release);
    });
  }

  /** Lets go as if the finger lifted (used when the game pauses mid-hold). */
  release(): void {
    this.holdPointerId = null;
    this.disc.setFillStyle(this.color, 0.35);
    this.setScale(1);
  }

  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }

  /** True while a finger (or mouse) is holding the button down. */
  get held(): boolean {
    return this.holdPointerId !== null;
  }

  /** Draws a ring showing 0..1 progress; pass a negative number to hide it. */
  setProgress(p: number): this {
    this.ring.clear();
    if (p < 0) return this;
    this.ring.lineStyle(6, 0xffffff, 0.9).beginPath()
      .arc(0, 0, this.radius - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p).strokePath();
    return this;
  }

  /** Throbs to get attention (e.g. "your bottle is empty"). */
  setUrgent(urgent: boolean): void {
    if (urgent && !this.pulse) {
      this.pulse = this.scene.tweens.add({ targets: this.disc, scale: 1.18, duration: 260, yoyo: true, repeat: -1 });
    } else if (!urgent && this.pulse) {
      this.pulse.stop();
      this.pulse = undefined;
      this.disc.setScale(1);
    }
  }
}
