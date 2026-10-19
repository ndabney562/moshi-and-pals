import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import { LOCKER } from '../config/locker';
import { sfx } from '../core/sfx';
import { buyLockerLevel, lockerLevel, progress } from '../core/progress';
import { EQUIPMENT } from '../data/equipment';
import { LOCKER_LEVEL_TEXT, LOCKER_TOOLS } from '../data/locker';

const font = 'system-ui, -apple-system, sans-serif';

/**
 * THE EQUIPMENT LOCKER (from the title screen): every tool gets three upgrades that stay between shifts,
 * bought with the Copays each shift sends home. One tap buys the next level.
 */
export class LockerScene extends Phaser.Scene {
  private body!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;

  constructor() {
    super('Locker');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0d2b2e).setOrigin(0);
    this.header = this.add.text(width / 2, 40, '', { fontFamily: font, fontSize: '38px', fontStyle: '900', color: COLORS.uiText }).setOrigin(0.5).setShadow(0, 4, '#000', 8);
    this.add.text(width / 2, 88, `${Math.round(LOCKER.bankShare * 100)}% of the Copays you earn on every shift come home here. Upgrades work on every shift after.`, {
      fontFamily: font, fontSize: '17px', fontStyle: 'italic', color: COLORS.uiAccent,
    }).setOrigin(0.5).setWordWrapWidth(width - 60);
    this.body = this.add.container(0, 0);
    this.add.text(width / 2, height - 40, 'BACK', {
      fontFamily: font, fontSize: '26px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#3f5f66', padding: { x: 44, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('Title'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
    this.draw();
  }

  private txt(x: number, y: number, s: string, size: number, color: string = COLORS.uiText, style = 'bold'): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, { fontFamily: font, fontSize: `${size}px`, fontStyle: style, color });
    this.body.add(t);
    return t;
  }

  private draw(): void {
    const { width, height } = this.scale;
    const bank = progress().bank;
    this.header.setText(`EQUIPMENT LOCKER  ·  $${bank.toLocaleString()} BANKED`);
    this.body.removeAll(true);
    const half = Math.min(520, width / 2 - 30);
    const left = width / 2 - half;
    const right = width / 2 + half;
    const top = 124;
    const rowH = Math.min(62, (height - top - 90) / LOCKER_TOOLS.length);
    const max = LOCKER.levels.length;
    LOCKER_TOOLS.forEach((id, i) => {
      const def = EQUIPMENT[id];
      if (!def) return;
      const y = top + i * rowH;
      const level = lockerLevel(id);
      const next = LOCKER.levels[level];
      this.txt(left, y, def.name, 20, COLORS.uiText, '900');
      for (let k = 0; k < max; k++) this.txt(left + k * 22, y + 27, '★', 18, k < level ? '#ffe66d' : '#3f5f66', '900');
      const nextText = LOCKER_LEVEL_TEXT[level];
      const line = next && nextText ? `Next: ${nextText.name} (${nextText.blurb})` : 'Fully upgraded. It even has your name on it.';
      this.txt(left + 76, y + 29, line, 15, next ? '#cfe9e4' : '#9fb8b3');
      const mid = y + rowH / 2 - 4;
      const label = next ? `UPGRADE  $${next.cost.toLocaleString()}` : 'MAXED';
      const can = !!next && bank >= next.cost;
      const b = this.add.text(right, mid, label, {
        fontFamily: font, fontSize: '18px', fontStyle: '900', color: next ? COLORS.uiText : '#0d2b2e',
        backgroundColor: !next ? '#ffe66d' : can ? '#2a9d8f' : '#3f5f66', padding: { x: 14, y: 8 },
      }).setOrigin(1, 0.5).setAlpha(next && !can ? 0.5 : 1);
      if (can) b.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (buyLockerLevel(id)) sfx.cash();
        this.draw();
      });
      this.body.add(b);
    });
  }
}
