import Phaser from 'phaser';

/** Round on-screen button with a label and optional progress ring (cooldowns, refills). */
export class HudButton extends Phaser.GameObjects.Container {
  private readonly disc: Phaser.GameObjects.Arc;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private pulse?: Phaser.Tweens.Tween;

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
    this.on('pointerdown', () => {
      this.disc.setFillStyle(this.color, 0.7);
      this.setScale(0.92);
      onPress();
    });
    const release = () => { this.disc.setFillStyle(this.color, 0.35); this.setScale(1); };
    this.on('pointerup', release);
    this.on('pointerout', release);
  }

  /** Draws a ring showing 0..1 progress; pass a negative number to hide it. */
  setProgress(p: number): void {
    this.ring.clear();
    if (p < 0) return;
    this.ring.lineStyle(6, 0xffffff, 0.9).beginPath()
      .arc(0, 0, this.radius - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p).strokePath();
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
