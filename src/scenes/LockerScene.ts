import Phaser from 'phaser';
import { toTitle } from '../core/native';
import { renderMenuTopPanel, renderBackButton, MenuHeaderComponents } from '../ui/menuHeader';
import { COLORS as GAME_COLORS } from '../config/theme';
import { MENU, restartOnMenuResize } from '../ui/menuTheme';
const COLORS = { ...GAME_COLORS, uiText: MENU.ink, uiAccent: MENU.teal };
import { LOCKER, STAFF } from '../config/locker';
import { sfx } from '../core/sfx';
import { buyLockerLevel, buyStaffLevel, lockerLevel, progress, scribeUnlocked, staffLevel, staffTiers } from '../core/progress';
import { EQUIPMENT } from '../data/equipment';
import { LOCKER_LEVEL_TEXT, LOCKER_TOOLS, STAFF_LEVEL_TEXT } from '../data/locker';
import { SCRIBES } from '../data/scribes';

const font = MENU.font;

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
  private topHeader?: MenuHeaderComponents;

  constructor() {
    super('Locker');
  }

  create(): void {
    restartOnMenuResize(this);
    if (this.cameras?.main) {
      this.cameras.main.fadeIn(150, 0, 0, 0);
    }
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, MENU.paper).setOrigin(0);

    // Standardized Top Panel: Single active tab badge '🧰 LOCKER'
    this.topHeader = renderMenuTopPanel(this, 'locker');
    this.events.once('shutdown', () => {
      this.topHeader?.destroy();
    });

    this.header = this.add.text(width / 2, 40, '', { fontFamily: font, fontSize: '38px', fontStyle: '900', color: COLORS.uiText }).setOrigin(0.5).setVisible(false);
    this.add.text(width / 2, 84, `${Math.round(LOCKER.bankShare * 100)}% of the Copays you earn on every shift come home here. Upgrades work on every shift after.`, {
      fontFamily: font, fontSize: '16px', fontStyle: 'italic', color: COLORS.uiAccent,
    }).setOrigin(0.5).setWordWrapWidth(width - 60);
    this.tabs = (['tools', 'staff'] as const).map((id, i) => ({
      id,
      text: this.add.text(width / 2 + (i - 0.5) * 200, 118, id === 'tools' ? 'TOOLS' : 'STAFF', {
        fontFamily: font, fontSize: '18px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#eeeade', padding: { x: 18, y: 7 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.shelf = id; this.draw(); }),
    }));
    this.body = this.add.container(0, 0);

    // Standardized bottom-left BACK button
    renderBackButton(this, () => toTitle(this));
    this.input.keyboard?.on('keydown-ESC', () => toTitle(this));
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
    for (const t of this.tabs) {
      t.text.setBackgroundColor(t.id === this.shelf ? MENU.mint : '#eeeade');
      t.text.setColor(t.id === this.shelf ? MENU.ink : COLORS.uiText);
    }
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
    const cardW = right - left;

    const rowGfx = this.add.graphics();
    this.body.add(rowGfx);

    LOCKER_TOOLS.forEach((id, i) => {
      const def = EQUIPMENT[id];
      if (!def) return;
      const y = top + i * rowH;
      const level = lockerLevel(id);
      const next = LOCKER.levels[level];

      // Row card backplate
      const ch = rowH - 8;
      rowGfx.fillStyle(0x000000, 0.04).fillRoundedRect(left, y - 4 + 2, cardW, ch, 12);
      rowGfx.fillStyle(MENU.card, 1).fillRoundedRect(left, y - 4, cardW, ch, 12);
      rowGfx.lineStyle(1.5, MENU.line, 0.85).strokeRoundedRect(left, y - 4, cardW, ch, 12);

      this.txt(left + 14, y, def.name, 20, COLORS.uiText, '900');
      for (let k = 0; k < max; k++) this.txt(left + 14 + k * 22, y + 27, '★', 18, k < level ? MENU.teal : '#dcd8cc', '900');
      const nextText = LOCKER_LEVEL_TEXT[level];
      const line = next && nextText ? `Next: ${nextText.name} (${nextText.blurb})` : 'Fully upgraded. It even has your name on it.';
      this.txt(left + 90, y + 29, line, 15, next ? MENU.muted : MENU.muted);
      const mid = y + rowH / 2 - 4;
      const label = next ? `UPGRADE  $${next.cost.toLocaleString()}` : 'MAXED';
      const can = !!next && bank >= next.cost;
      const b = this.add.text(right - 14, mid, label, {
        fontFamily: font, fontSize: '18px', fontStyle: '900', color: next ? COLORS.uiText : MENU.ink,
        backgroundColor: !next ? MENU.mint : can ? MENU.mint : '#e4e6dc', padding: { x: 16, y: 8 },
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
    const cardW = right - left;

    const rowGfx = this.add.graphics();
    this.body.add(rowGfx);

    SCRIBES.forEach((sc, i) => {
      const y = top + i * rowH;
      const open = scribeUnlocked(sc.id);
      const level = staffLevel(sc.id);
      const tiers = staffTiers(sc.id);
      const max = tiers.length;
      const tier = tiers[level];
      const next = tier === undefined ? undefined : STAFF.levels[tier];

      // Row card backplate
      const ch = rowH - 8;
      rowGfx.fillStyle(0x000000, 0.04).fillRoundedRect(left, y - 4 + 2, cardW, ch, 14);
      rowGfx.fillStyle(MENU.card, 1).fillRoundedRect(left, y - 4, cardW, ch, 14);
      rowGfx.lineStyle(1.5, MENU.line, 0.85).strokeRoundedRect(left, y - 4, cardW, ch, 14);

      // Staff thumbnail frame
      rowGfx.fillStyle(0x000000, 0.06).fillCircle(left + 36, y + ch / 2 - 2, 24);
      rowGfx.fillStyle(open ? 0xfffcf6 : 0xe4e6dc, 1).fillCircle(left + 36, y + ch / 2 - 4, 24);
      rowGfx.lineStyle(1.5, open ? 0x80eac8 : 0xd8ded4, 0.9).strokeCircle(left + 36, y + ch / 2 - 4, 24);

      this.body.add(this.add.image(left + 36, y + ch / 2 - 4, `scribe-${sc.id}`).setAngle(-90).setScale(0.55).setAlpha(open ? 1 : 0.4));
      this.txt(left + 72, y, `${sc.name}, ${sc.role.toLowerCase()}`, 20, open ? COLORS.uiText : MENU.muted, '900');
      for (let k = 0; k < max; k++) this.txt(left + 72 + k * 22, y + 27, '★', 18, k < level ? MENU.teal : '#dcd8cc', '900');
      const nextText = tier === undefined ? undefined : STAFF_LEVEL_TEXT[tier];
      const line = !open ? `Not on staff yet. ${sc.unlockHint ?? 'Hire them on the Residency Board'}.`
        : next && nextText ? `Next: ${nextText.name} (${nextText.blurb})` : 'Fully upgraded. Somebody give them a raise.';
      this.txt(left + 148, y + 29, line, 15, open && next ? MENU.muted : MENU.muted);
      const mid = y + rowH / 2 - 4;
      const label = !open ? 'LOCKED' : next ? `UPGRADE  $${next.cost.toLocaleString()}` : 'MAXED';
      const can = open && !!next && bank >= next.cost;
      const b = this.add.text(right - 14, mid, label, {
        fontFamily: font, fontSize: '18px', fontStyle: '900', color: open && !next ? MENU.ink : COLORS.uiText,
        backgroundColor: open && !next ? MENU.mint : can ? MENU.mint : '#e4e6dc', padding: { x: 16, y: 8 },
      }).setOrigin(1, 0.5).setAlpha(open && next && !can ? 0.5 : open ? 1 : 0.5);
      if (can) b.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (buyStaffLevel(sc.id)) sfx.cash();
        this.draw();
      });
      this.body.add(b);
    });
  }
}
