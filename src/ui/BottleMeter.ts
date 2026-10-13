import Phaser from 'phaser';

/** HUD squirt bottle that visibly drains as Eugene sprays. */
export class BottleMeter extends Phaser.GameObjects.Container {
  private readonly liquid: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private static readonly W = 34;
  private static readonly H = 70;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const { W, H } = BottleMeter;
    const g = scene.add.graphics();
    // Cap and trigger nozzle
    g.fillStyle(0x1565c0).fillRect(-8, -H / 2 - 16, 16, 14).fillTriangle(8, -H / 2 - 14, 22, -H / 2 - 10, 8, -H / 2 - 6);
    // Bottle body (back)
    g.fillStyle(0x0d2b2e, 0.75).fillRoundedRect(-W / 2, -H / 2, W, H, 8);
    this.liquid = scene.add.rectangle(-W / 2 + 4, H / 2 - 4, W - 8, H - 8, 0x7fd3ff).setOrigin(0, 1);
    const glass = scene.add.graphics();
    glass.lineStyle(3, 0xe8fff9, 0.9).strokeRoundedRect(-W / 2, -H / 2, W, H, 8);
    this.text = scene.add.text(0, H / 2 + 8, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#e8fff9',
      backgroundColor: '#0d2b2ecc', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 0);
    this.add([g, this.liquid, glass, this.text]);
    scene.add.existing(this);
  }

  set(ammo: number, capacity: number, refillProgress: number): void {
    const frac = refillProgress >= 0 ? refillProgress : ammo / capacity;
    this.liquid.height = (BottleMeter.H - 8) * frac;
    // Shift toward orange then red as it runs low
    this.liquid.fillColor = frac > 0.3 ? 0x7fd3ff : frac > 0.12 ? 0xffb347 : 0xff5a5a;
    this.text.setText(refillProgress >= 0 ? 'REFILLING…' : `${Math.ceil(ammo)} mL`);
  }
}
