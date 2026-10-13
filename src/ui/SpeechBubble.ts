import Phaser from 'phaser';

/** A comic speech bubble in the game world that follows whoever is talking. */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private target?: { x: number; y: number };
  private offsetY = 0;
  private hideAt = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#3a1030',
      align: 'center', wordWrap: { width: 240 },
    }).setOrigin(0.5, 1);
    this.add([this.bg, this.label]);
    this.setDepth(30).setVisible(false);
    scene.add.existing(this);
  }

  /** Shows `text` above `target` for `ms`, replacing whatever was said before. */
  say(text: string, target: { x: number; y: number }, offsetY: number, ms: number): void {
    this.target = target;
    this.offsetY = offsetY;
    this.hideAt = this.scene.time.now + ms;
    this.label.setText(text);
    const pad = 10;
    const w = this.label.width + pad * 2;
    const h = this.label.height + pad * 2;
    this.label.setPosition(0, -14 - pad);
    this.bg.clear()
      .fillStyle(0xfff6e8).fillRoundedRect(-w / 2, -14 - h, w, h, 12)
      .lineStyle(3, 0x3a1030).strokeRoundedRect(-w / 2, -14 - h, w, h, 12)
      .fillStyle(0xfff6e8).fillTriangle(-10, -15, 10, -15, 0, 0)
      .lineStyle(3, 0x3a1030).lineBetween(-10, -14, 0, 0).lineBetween(10, -14, 0, 0);
    this.setVisible(true).setScale(0.6);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 160, ease: 'Back.out' });
    this.follow();
  }

  get text(): string {
    return this.visible ? this.label.text : '';
  }

  /** Call every frame. */
  follow(): void {
    if (!this.visible || !this.target) return;
    if (this.scene.time.now >= this.hideAt) {
      this.setVisible(false);
      return;
    }
    this.setPosition(this.target.x, this.target.y - this.offsetY);
  }
}
