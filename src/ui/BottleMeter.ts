import Phaser from 'phaser';
import type { EquipmentChangedPayload } from '../core/events';
import { MENU } from './menuTheme';

/**
 * Tactile arcade weapon and ammunition gauge: an embossed medical spray
 * canister with dynamic fluid levels, meniscus glow, measurement ticks,
 * and high-contrast status readouts.
 */
export class BottleMeter extends Phaser.GameObjects.Container {
  private readonly bodyGfx: Phaser.GameObjects.Graphics;
  private readonly liquidGfx: Phaser.GameObjects.Graphics;
  private readonly glassGfx: Phaser.GameObjects.Graphics;
  public readonly text: Phaser.GameObjects.Text;

  private static readonly W = 36;
  private static readonly H = 72;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const { H } = BottleMeter;

    this.bodyGfx = scene.add.graphics();
    this.liquidGfx = scene.add.graphics();
    this.glassGfx = scene.add.graphics();

    this.drawCanisterFrame();

    // Readout badge mounted beneath the canister
    this.text = scene.add.text(0, H / 2 + 10, '', {
      fontFamily: MENU.font,
      fontSize: '13px',
      fontStyle: '900',
      color: '#e8fff9',
      align: 'center',
      backgroundColor: '#0c2528ee',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0).setShadow(0, 1, '#051314', 3);

    this.add([this.bodyGfx, this.liquidGfx, this.glassGfx, this.text]);
    scene.add.existing(this);
  }

  private drawCanisterFrame(): void {
    const { W, H } = BottleMeter;
    const g = this.bodyGfx;
    g.clear();

    // 1. Drop shadow
    g.fillStyle(0x051314, 0.6);
    g.fillRoundedRect(-W / 2 + 2, -H / 2 + 3, W, H, 10);

    // 2. Nozzle collar and trigger head
    g.fillStyle(0x164c54);
    g.fillRect(-10, -H / 2 - 16, 20, 14);
    g.fillStyle(0x80eac8);
    g.fillTriangle(8, -H / 2 - 15, 24, -H / 2 - 9, 8, -H / 2 - 4);

    // 3. Inner canister housing
    g.fillStyle(0x071b1e, 0.95);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, 10);
  }

  set(p: EquipmentChangedPayload): void {
    const { ammo, capacity, refillProgress, reserve } = p;
    const frac = refillProgress >= 0 ? refillProgress : Math.max(0, Math.min(1, ammo / capacity));
    const { W, H } = BottleMeter;

    // Draw liquid inside canister
    const g = this.liquidGfx;
    g.clear();

    const pad = 3;
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;
    const fillH = innerH * frac;

    if (fillH > 2) {
      // Color shifts: cyan -> amber -> crimson
      const fluidColor = frac > 0.3 ? 0x5dd5f5 : frac > 0.12 ? 0xffb84d : 0xff4757;
      g.fillStyle(fluidColor, 0.9);
      const topY = H / 2 - pad - fillH;
      g.fillRoundedRect(-W / 2 + pad, topY, innerW, fillH, Math.min(8, fillH / 2));

      // Specular meniscus highlight line at fluid surface
      g.lineStyle(1.5, 0xffffff, 0.85);
      g.lineBetween(-W / 2 + pad + 2, topY + 1, W / 2 - pad - 2, topY + 1);
    }

    // Draw glass bezel, measurement ticks, and vertical glass reflection
    const gl = this.glassGfx;
    gl.clear();

    gl.lineStyle(2.5, 0x1b4549, 0.9);
    gl.strokeRoundedRect(-W / 2, -H / 2, W, H, 10);

    // Measurement ticks (25%, 50%, 75%)
    gl.lineStyle(1, 0x80eac8, 0.55);
    for (let i = 1; i <= 3; i++) {
      const ty = H / 2 - pad - (innerH * (i * 0.25));
      gl.lineBetween(W / 2 - pad - 6, ty, W / 2 - pad - 1, ty);
    }

    // Vertical specular highlight along left edge
    gl.lineStyle(1.5, 0xffffff, 0.3);
    gl.lineBetween(-W / 2 + pad + 2, -H / 2 + 8, -W / 2 + pad + 2, H / 2 - 8);

    const main = refillProgress >= 0 ? 'REFILLING…' : `${Math.ceil(ammo)}${p.unit === '%' ? '%' : ` ${p.unit}`}`;
    const spare = p.selfCharging ? 'SELF-CHARGING' : `${p.spareName} ${Math.ceil(reserve)}`;
    this.text.setText(`${main}\n${spare}`).setColor(!p.selfCharging && reserve <= 0 ? '#ffb3b3' : '#e8fff9');
  }
}
