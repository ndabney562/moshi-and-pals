import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import type { RequisitionPayload } from '../core/events';

const W = 300;
const H = 250;
const font = 'system-ui, -apple-system, sans-serif';

/**
 * SUPPLY REQUISITION: the form you fill in at a supply crate. Two tools to choose from, or appeal the
 * decision for a fresh pair (at a price). The game waits while it's open.
 */
export class RequisitionPanel extends Phaser.GameObjects.Container {
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly note: Phaser.GameObjects.Text;
  private readonly cards: { bg: Phaser.GameObjects.Rectangle; swatch: Phaser.GameObjects.Arc; name: Phaser.GameObjects.Text; blurb: Phaser.GameObjects.Text; id: string }[] = [];
  private readonly appeal: Phaser.GameObjects.Text;
  private canAppeal = false;

  constructor(scene: Phaser.Scene, onPick: (id: string) => void, onAppeal: () => void) {
    super(scene, 0, 0);
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x0d2b2e, 0.86).setOrigin(0).setInteractive();
    this.title = scene.add.text(0, 0, 'SUPPLY REQUISITION', { fontFamily: font, fontSize: '40px', fontStyle: '900', color: COLORS.uiText })
      .setOrigin(0.5).setShadow(0, 4, '#000', 8);
    this.note = scene.add.text(0, 0, '', { fontFamily: font, fontSize: '18px', fontStyle: 'italic', color: COLORS.uiAccent, align: 'center' }).setOrigin(0.5);
    this.add([this.dim, this.title, this.note]);
    for (let i = 0; i < 2; i++) {
      const bg = scene.add.rectangle(0, 0, W, H, 0xfff6e8).setStrokeStyle(4, 0xe8fff9, 0.9).setInteractive({ useHandCursor: true });
      const swatch = scene.add.circle(0, 0, 26, 0xffffff).setStrokeStyle(3, 0x2b1d24);
      const name = scene.add.text(0, 0, '', { fontFamily: font, fontSize: '24px', fontStyle: '900', color: '#2b1d24', align: 'center', wordWrap: { width: W - 30 } }).setOrigin(0.5, 0);
      const blurb = scene.add.text(0, 0, '', { fontFamily: font, fontSize: '17px', fontStyle: 'bold', color: '#6d5a63', align: 'center', wordWrap: { width: W - 34 } }).setOrigin(0.5, 0);
      const card = { bg, swatch, name, blurb, id: '' };
      bg.on('pointerdown', () => bg.setScale(0.96));
      bg.on('pointerout', () => bg.setScale(1));
      bg.on('pointerup', () => {
        bg.setScale(1);
        if (this.visible && card.id) onPick(card.id);
      });
      this.cards.push(card);
      this.add([bg, swatch, name, blurb]);
    }
    this.appeal = scene.add.text(0, 0, '', {
      fontFamily: font, fontSize: '22px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#7a3b3b', padding: { x: 20, y: 12 }, align: 'center',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      if (this.visible && this.canAppeal) onAppeal();
    });
    this.add(this.appeal);
    this.setDepth(80).setVisible(false);
    scene.add.existing(this);
  }

  show(p: RequisitionPayload): void {
    p.options.forEach((o, i) => {
      const c = this.cards[i];
      c.id = o.id;
      c.swatch.setFillStyle(o.color);
      c.name.setText(o.name.toUpperCase());
      c.blurb.setText(o.blurb);
    });
    this.cards.forEach((c, i) => [c.bg, c.swatch, c.name, c.blurb].forEach((g) => g.setVisible(i < p.options.length)));
    this.note.setText(p.note || 'Pick one. Your plan covers exactly one (1) tool.');
    this.canAppeal = p.canAffordAppeal;
    this.appeal.setText(`APPEAL THE DECISION  $${p.appealCost}`).setAlpha(p.canAffordAppeal ? 1 : 0.45);
    this.setVisible(true);
    this.layout(this.scene.scale.width, this.scene.scale.height);
  }

  hide(): void {
    this.setVisible(false);
  }

  /** The option ids on the cards (tests). */
  get offered(): string[] {
    return this.cards.filter((c) => c.bg.visible).map((c) => c.id);
  }

  layout(width: number, height: number): void {
    this.dim.setSize(width, height);
    this.dim.input?.hitArea.setSize(width, height);
    this.title.setPosition(width / 2, height * 0.11);
    this.note.setPosition(width / 2, height * 0.11 + 44);
    const gap = Math.min(60, width * 0.05);
    const cy = height * 0.5;
    this.cards.forEach((c, i) => {
      const cx = width / 2 + (i === 0 ? -1 : 1) * (W / 2 + gap / 2);
      c.bg.setPosition(cx, cy);
      c.swatch.setPosition(cx, cy - H / 2 + 44);
      c.name.setPosition(cx, cy - H / 2 + 82);
      c.blurb.setPosition(cx, cy - H / 2 + 82 + c.name.height + 10);
    });
    this.appeal.setPosition(width / 2, Math.min(height - 50, cy + H / 2 + 56));
  }
}
