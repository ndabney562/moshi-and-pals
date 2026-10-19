import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import { LOCKER, STAFF } from '../config/locker';
import { sfx } from '../core/sfx';
import { buyLockerLevel, buyStaffLevel, lockerLevel, progress, scribeUnlocked, staffLevel, staffTiers } from '../core/progress';
import { EQUIPMENT } from '../data/equipment';
import { LOCKER_LEVEL_TEXT, LOCKER_TOOLS, STAFF_LEVEL_TEXT } from '../data/locker';
import { SCRIBES } from '../data/scribes';

const font = 'system-ui, -apple-system, sans-serif';

/**
 * THE EQUIPMENT LOCKER (from the title screen): every tool gets three upgrades that stay between shifts,
 * bought with the Copays each shift sends home. One tap buys the next level. The STAFF shelf does the same for the
 * helpers (Omar, Alan, Donald, Selina, Elaine) once they're unlocked.
 */
export class LockerScene extends Phaser.Scene {
  private body!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;
  private shelf: 'tools' | 'staff' = 'tools';
  private tabs: { id: 'tools' | 'staff'; text: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super('Locker');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0d2b2e).setOrigin(0);
    this.header = this.add.text(width / 2, 40, '', { fontFamily: font, fontSize: '38px', fontStyle: '900', color: COLORS.uiText }).setOrigin(0.5).setShadow(0, 4, '#000', 8);
    this.add.text(width / 2, 80, `${Math.round(LOCKER.bankShare * 100)}% of the Copays you earn on every shift come home here. Upgrades work on every shift after.`, {
      fontFamily: font, fontSize: '17px', fontStyle: 'italic', color: COLORS.uiAccent,
    }).setOrigin(0.5).setWordWrapWidth(width - 60);
    this.tabs = (['tools', 'staff'] as const).map((id, i) => ({
      id,
      text: this.add.text(width / 2 + (i - 0.5) * 200, 116, id === 'tools' ? 'TOOLS' : 'STAFF', {
        fontFamily: font, fontSize: '18px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#1f4f55', padding: { x: 18, y: 7 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.shelf = id; this.draw(); }),
    }));
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
    for (const t of this.tabs) t.text.setBackgroundColor(t.id === this.shelf ? '#2a9d8f' : '#1f4f55');
    if (this.shelf === 'staff') {
      this.drawStaff(bank);
      return;
    }
    const half = Math.min(520, width / 2 - 30);
    const left = width / 2 - half;
    const right = width / 2 + half;
    const top = 146;
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

  /**
   * THE STAFF SHELF: upgrades per helper, bought once they're unlocked (Residency Board, or X-ray for Donald). The front
   * desk gets all three; Omar, Alan and Donald stay all shift once they're out, so they skip Overtime.
   */
  private drawStaff(bank: number): void {
    const { width, height } = this.scale;
    const half = Math.min(520, width / 2 - 30);
    const left = width / 2 - half;
    const right = width / 2 + half;
    const top = 146;
    const rowH = Math.min(78, (height - top - 90) / SCRIBES.length);
    SCRIBES.forEach((sc, i) => {
      const y = top + i * rowH;
      const open = scribeUnlocked(sc.id);
      const level = staffLevel(sc.id);
      // (Omar, Alan and Donald stay all shift once they're out, so they don't get Overtime)
      const tiers = staffTiers(sc.id);
      const max = tiers.length;
      const tier = tiers[level];
      const next = tier === undefined ? undefined : STAFF.levels[tier];
      this.body.add(this.add.image(left + 24, y + 24, `scribe-${sc.id}`).setAngle(-90).setScale(0.55).setAlpha(open ? 1 : 0.4));
      this.txt(left + 56, y, `${sc.name}, ${sc.role.toLowerCase()}`, 20, open ? COLORS.uiText : '#9fb8b3', '900');
      for (let k = 0; k < max; k++) this.txt(left + 56 + k * 22, y + 27, '★', 18, k < level ? '#ffe66d' : '#3f5f66', '900');
      const nextText = tier === undefined ? undefined : STAFF_LEVEL_TEXT[tier];
      const line = !open ? `Not on staff yet. ${sc.unlockHint ?? 'Hire them on the Residency Board'}.`
        : next && nextText ? `Next: ${nextText.name} (${nextText.blurb})` : 'Fully upgraded. Somebody give them a raise.';
      this.txt(left + 132, y + 29, line, 15, open && next ? '#cfe9e4' : '#9fb8b3');
      const mid = y + rowH / 2 - 4;
      const label = !open ? 'LOCKED' : next ? `UPGRADE  $${next.cost.toLocaleString()}` : 'MAXED';
      const can = open && !!next && bank >= next.cost;
      const b = this.add.text(right, mid, label, {
        fontFamily: font, fontSize: '18px', fontStyle: '900', color: open && !next ? '#0d2b2e' : COLORS.uiText,
        backgroundColor: open && !next ? '#ffe66d' : can ? '#2a9d8f' : '#3f5f66', padding: { x: 14, y: 8 },
      }).setOrigin(1, 0.5).setAlpha(open && next && !can ? 0.5 : open ? 1 : 0.5);
      if (can) b.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (buyStaffLevel(sc.id)) sfx.cash();
        this.draw();
      });
      this.body.add(b);
    });
  }
}
