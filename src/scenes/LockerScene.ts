import Phaser from 'phaser';
import { renderMenuTopPanel, renderBackButton, transitionTo, MenuHeaderComponents } from '../ui/menuHeader';
import { COLORS as GAME_COLORS } from '../config/theme';
import { MENU, renderMenuBackground, restartOnMenuResize, queueMenuArt } from '../ui/menuTheme';
const COLORS = { ...GAME_COLORS, uiText: MENU.ink, uiAccent: MENU.teal };
import { LOCKER, STAFF } from '../config/locker';
import { sfx } from '../core/sfx';
import { buyLockerLevel, buyStaffLevel, lockerLevel, progress, scribeUnlocked, staffLevel, staffTiers } from '../core/progress';
import { EQUIPMENT } from '../data/equipment';
import { LOCKER_LEVEL_TEXT, LOCKER_TOOLS, STAFF_LEVEL_TEXT } from '../data/locker';
import { SCRIBES } from '../data/scribes';
import { readSafeArea } from '../core/safeArea';

const font = MENU.font;

/**
 * THE EQUIPMENT LOCKER: 4x2 3D tool card grid + right-side tool inspector + left vertical TOOLS/STAFF tabs
 * (matching moshi-and-pals-locker.PNG).
 */
export class LockerScene extends Phaser.Scene {
  private body!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;
  private tabGfx!: Phaser.GameObjects.Graphics;
  private shelf: 'tools' | 'staff' = 'tools';
  private selectedTool: string = LOCKER_TOOLS[0];
  private tabs: { id: 'tools' | 'staff'; text: Phaser.GameObjects.Text }[] = [];
  private topHeader?: MenuHeaderComponents;

  constructor() {
    super('Locker');
  }

  preload(): void {
    queueMenuArt(this);
  }

  create(): void {
    restartOnMenuResize(this);
    if (this.cameras?.main) {
      this.cameras.main.fadeIn(150, 0, 0, 0);
    }
    const { width } = this.scale;
    renderMenuBackground(this, 'bg-locker');

    // Standardized Top Panel: Single active tab badge '🧰 LOCKER'
    this.topHeader = renderMenuTopPanel(this, 'locker');
    this.events.once('shutdown', () => {
      this.topHeader?.destroy();
    });

    const safe = readSafeArea();
    const left = Math.max(24, safe.left + 14);

    this.header = this.add.text(left + 126, 82, '', {
      fontFamily: font,
      fontSize: '28px',
      fontStyle: '900',
      color: '#0b2530',
    }).setOrigin(0, 0.5);

    this.add.text(
      left + 126,
      110,
      `${Math.round(LOCKER.bankShare * 100)}% of the Copays you earn on every shift come home here. Upgrades work on every shift after.`,
      {
        fontFamily: font,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#1e3a46',
      }
    ).setOrigin(0, 0.5).setWordWrapWidth(width - left - 150);

    this.tabGfx = this.add.graphics();
    this.tabs = (['tools', 'staff'] as const).map((id, i) => ({
      id,
      text: this.add.text(left + 54, 195 + i * 64, id === 'tools' ? 'TOOLS' : 'STAFF', {
        fontFamily: font,
        fontSize: '16px',
        fontStyle: '900',
        color: '#0b2530',
        padding: { x: 20, y: 12 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.shelf = id;
        this.draw();
      }),
    }));

    this.body = this.add.container(0, 0);

    // Standardized bottom-left BACK button
    renderBackButton(this, () => transitionTo(this, 'Title'));
    this.input.keyboard?.on('keydown-ESC', () => transitionTo(this, 'Title'));
    this.draw();
  }

  private txt(x: number, y: number, s: string, size: number, color: string = COLORS.uiText, style = 'bold'): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, { fontFamily: font, fontSize: `${size}px`, fontStyle: style, color });
    this.body.add(t);
    return t;
  }

  private draw(): void {
    const { width, height } = this.scale;
    const safe = readSafeArea();
    const left = Math.max(24, safe.left + 14);
    const right = width - Math.max(24, safe.right + 14);
    const bank = progress().bank;

    this.header.setText(`🗄️ EQUIPMENT LOCKER  ·  $${bank.toLocaleString()} BANKED`);
    this.body.removeAll(true);

    // Draw left vertical TOOLS / STAFF switcher pills
    this.tabGfx.clear();
    for (const t of this.tabs) {
      const isSelected = t.id === this.shelf;
      t.text.setBackgroundColor('rgba(0,0,0,0)');
      t.text.setColor(isSelected ? '#1f1600' : '#e2f1f8');
      const b = t.text.getBounds();
      const pw = Math.max(104, b.width + 8);
      const px = t.text.x - pw / 2;
      this.tabGfx.fillStyle(0x03131a, 0.32).fillRoundedRect(px, b.y + 3, pw, b.height, 16);
      if (isSelected) {
        this.tabGfx.fillStyle(0xb45309, 1).fillRoundedRect(px, b.y + 2, pw, b.height, 16);
        this.tabGfx.fillStyle(0xfacc15, 1).fillRoundedRect(px, b.y, pw, b.height - 2, 16);
        this.tabGfx.lineStyle(2, 0xfef08a, 0.95).strokeRoundedRect(px, b.y, pw, b.height - 2, 16);
      } else {
        this.tabGfx.fillStyle(0x0b2736, 0.9).fillRoundedRect(px, b.y, pw, b.height, 16);
        this.tabGfx.lineStyle(1.5, 0x38bdf8, 0.55).strokeRoundedRect(px, b.y, pw, b.height, 16);
      }
    }

    if (this.shelf === 'staff') {
      this.drawStaff(bank);
      return;
    }

    const contentLeft = left + 122;
    const top = 132;
    const availH = height - top - Math.max(58, safe.bottom + 46);
    const showInspector = width >= 920;
    const inspectorW = showInspector ? Math.min(250, Math.round((right - contentLeft) * 0.27)) : 0;
    const gridW = right - contentLeft - (showInspector ? inspectorW + 14 : 0);

    const cols = 4;
    const rows = 2;
    const gapX = 10;
    const gapY = 10;
    const cardW = Math.floor((gridW - gapX * (cols - 1)) / cols);
    const cardH = Math.min(220, Math.floor((availH - gapY) / rows));
    const max = LOCKER.levels.length;

    const rowGfx = this.add.graphics();
    this.body.add(rowGfx);

    LOCKER_TOOLS.forEach((id, i) => {
      const def = EQUIPMENT[id];
      if (!def) return;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = contentLeft + col * (cardW + gapX);
      const cy = top + row * (cardH + gapY);
      const level = lockerLevel(id);
      const next = LOCKER.levels[level];
      const isSelected = this.selectedTool === id;

      // White/cream rounded tool card matching moshi-and-pals-locker.PNG
      rowGfx.fillStyle(0x041822, 0.22).fillRoundedRect(cx + 1, cy + 4, cardW, cardH, 16);
      rowGfx.fillStyle(0xfdfaf2, 0.98).fillRoundedRect(cx, cy, cardW, cardH, 16);
      rowGfx.lineStyle(isSelected ? 2.5 : 1.5, isSelected ? 0x22d3ee : 0xd6cfc0, 0.95)
        .strokeRoundedRect(cx, cy, cardW, cardH, 16);

      // Card selection hit area (behind upgrade button)
      const selectHit = this.add.rectangle(cx + cardW / 2, cy + (cardH - 36) / 2, cardW, cardH - 36, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          this.selectedTool = id;
          this.draw();
        });
      this.body.add(selectHit);

      // 3D tool illustration inside soft inset box
      const imgBoxH = Math.max(46, Math.round(cardH * 0.44));
      const imgBoxW = cardW - 16;
      rowGfx.fillStyle(isSelected ? 0xdcfce7 : 0xf4efe4, 0.95)
        .fillRoundedRect(cx + 8, cy + 8, imgBoxW, imgBoxH, 12);
      const frameKey = `tool-${id}`;
      if (this.textures.exists('menu-sprites') && this.textures.get('menu-sprites').has(frameKey)) {
        const icon = this.add.image(cx + cardW / 2, cy + 8 + imgBoxH / 2, 'menu-sprites', frameKey);
        const s = Math.min((imgBoxW - 6) / 200, (imgBoxH - 4) / 190);
        icon.setScale(s);
        this.body.add(icon);
      }

      // Tool Name
      const titleY = cy + imgBoxH + 14;
      this.txt(cx + cardW / 2, titleY, def.name, cardH < 150 ? 12 : 14, '#0b2530', '900')
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setWordWrapWidth(cardW - 12);

      // Stars row
      const starsY = cy + cardH - 54;
      for (let k = 0; k < max; k++) {
        this.txt(cx + cardW / 2 + (k - 1) * 18, starsY, '★', 15, k < level ? '#f59e0b' : '#cbd5e1', '900')
          .setOrigin(0.5);
      }

      // Next upgrade summary (kept in body for test visibility)
      const nextText = LOCKER_LEVEL_TEXT[level];
      const line = next && nextText ? `Next: ${nextText.name} (${nextText.blurb})` : 'Fully upgraded.';
      this.txt(cx + cardW / 2, cy + cardH - 40, line, 9, MENU.muted)
        .setOrigin(0.5)
        .setWordWrapWidth(cardW - 10)
        .setAlpha(cardH < 155 ? 0.01 : 0.85);

      // Upgrade Button at bottom of card
      const btnY = cy + cardH - 20;
      const label = next ? `UPGRADE  $${next.cost.toLocaleString()}` : 'MAXED';
      const can = !!next && bank >= next.cost;
      const b = this.add.text(cx + cardW / 2, btnY, label, {
        fontFamily: font,
        fontSize: cardW < 155 ? '12px' : '14px',
        fontStyle: '900',
        color: !next ? '#065f46' : can ? '#04242c' : '#64748b',
        padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setAlpha(next && !can ? 0.65 : 1);

      const bb = b.getBounds();
      const bw = Math.min(cardW - 14, Math.max(bb.width + 8, cardW - 22));
      const bh = bb.height;
      rowGfx.fillStyle(!next ? 0xd1fae5 : can ? 0x38e8d8 : 0xe2e8f0, 1)
        .fillRoundedRect(cx + cardW / 2 - bw / 2, btnY - bh / 2, bw, bh, 10);
      rowGfx.lineStyle(1.5, !next ? 0x34d399 : can ? 0x0e7490 : 0xcbd5e1, 0.9)
        .strokeRoundedRect(cx + cardW / 2 - bw / 2, btnY - bh / 2, bw, bh, 10);

      if (can) {
        b.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.selectedTool = id;
          if (buyLockerLevel(id)) sfx.cash();
          this.draw();
        });
      }
      this.body.add(b);
    });

    // Right-Side Selected Tool Inspector Panel (matching moshi-and-pals-locker.PNG)
    if (showInspector) {
      const ix = right - inspectorW;
      const iy = top;
      const ih = cardH * 2 + gapY;
      const selId = this.selectedTool;
      const selDef = EQUIPMENT[selId] ?? EQUIPMENT[LOCKER_TOOLS[0]];
      const selLevel = lockerLevel(selId);
      const selNext = LOCKER.levels[selLevel];
      const selNextText = LOCKER_LEVEL_TEXT[selLevel];

      rowGfx.fillStyle(0x041822, 0.26).fillRoundedRect(ix + 2, iy + 4, inspectorW, ih, 20);
      rowGfx.fillStyle(0xfdfaf2, 0.98).fillRoundedRect(ix, iy, inspectorW, ih, 20);
      rowGfx.lineStyle(2.5, 0x38bdf8, 0.9).strokeRoundedRect(ix, iy, inspectorW, ih, 20);

      const previewH = Math.round(ih * 0.42);
      rowGfx.fillStyle(0xeef8f6, 1).fillRoundedRect(ix + 12, iy + 12, inspectorW - 24, previewH, 14);
      const frameKey = `tool-${selId}`;
      if (this.textures.exists('menu-sprites') && this.textures.get('menu-sprites').has(frameKey)) {
        const bigIcon = this.add.image(ix + inspectorW / 2, iy + 12 + previewH / 2, 'menu-sprites', frameKey);
        const s = Math.min((inspectorW - 36) / 200, (previewH - 12) / 190);
        bigIcon.setScale(s);
        this.body.add(bigIcon);
      }

      const midX = ix + inspectorW / 2;
      let curY = iy + previewH + 24;
      this.txt(midX, curY, selDef.name, 18, '#0b2530', '900')
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setWordWrapWidth(inspectorW - 24);
      curY += 46;

      for (let k = 0; k < max; k++) {
        this.txt(midX + (k - 1) * 24, curY, '★', 20, k < selLevel ? '#f59e0b' : '#cbd5e1', '900')
          .setOrigin(0.5);
      }
      curY += 24;

      const detail = selNext && selNextText
        ? `${selNextText.name}\n${selNextText.blurb}`
        : 'All 3 upgrades unlocked!\nName engraved & shift ready.';
      this.txt(midX, curY, detail, 14, '#1e3a46', 'bold')
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setWordWrapWidth(inspectorW - 28);

      const footerY = iy + ih - 28;
      const statusStr = selNext ? `TIER ${selLevel + 1} COST: $${selNext.cost.toLocaleString()}` : 'FULLY UPGRADED';
      this.txt(midX, footerY, statusStr, 14, selNext ? MENU.teal : '#065f46', '900').setOrigin(0.5);
    }
  }

  /**
   * THE STAFF SHELF: upgrades per helper, with 3D staff portraits from menu-sprites.jpg.
   */
  private drawStaff(bank: number): void {
    const { width, height } = this.scale;
    const safe = readSafeArea();
    const left = Math.max(24, safe.left + 14) + 122;
    const right = width - Math.max(24, safe.right + 14);
    const top = 136;
    const rowH = Math.min(76, (height - top - Math.max(58, safe.bottom + 46)) / SCRIBES.length);
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

      const ch = rowH - 6;
      rowGfx.fillStyle(0x041822, 0.18).fillRoundedRect(left, y + 2, cardW, ch, 14);
      rowGfx.fillStyle(0xfdfaf2, 0.98).fillRoundedRect(left, y, cardW, ch, 14);
      rowGfx.lineStyle(1.5, open ? 0x38bdf8 : 0xd6cfc0, 0.85).strokeRoundedRect(left, y, cardW, ch, 14);

      // 3D Staff Portrait thumbnail
      const thumbSize = Math.min(46, ch - 8);
      const thumbX = left + 34;
      const thumbY = y + ch / 2;
      rowGfx.fillStyle(0xfcf6e8, 1).fillRoundedRect(thumbX - thumbSize / 2, thumbY - thumbSize / 2, thumbSize, thumbSize, 10);
      rowGfx.lineStyle(1.5, open ? 0x22d3ee : 0xcbd5e1, 0.9).strokeRoundedRect(thumbX - thumbSize / 2, thumbY - thumbSize / 2, thumbSize, thumbSize, 10);

      const staffFrame = `staff-${sc.id}`;
      if (this.textures.exists('menu-sprites') && this.textures.get('menu-sprites').has(staffFrame)) {
        const img = this.add.image(thumbX, thumbY, 'menu-sprites', staffFrame)
          .setDisplaySize(thumbSize - 4, thumbSize - 4)
          .setAlpha(open ? 1 : 0.45);
        this.body.add(img);
      } else {
        this.body.add(this.add.image(thumbX, thumbY, `scribe-${sc.id}`).setAngle(-90).setScale(0.55).setAlpha(open ? 1 : 0.4));
      }

      this.txt(left + 68, y + 6, `${sc.name}, ${sc.role.toLowerCase()}`, 18, open ? COLORS.uiText : MENU.muted, '900');
      for (let k = 0; k < max; k++) {
        this.txt(left + 68 + k * 20, y + 28, '★', 16, k < level ? '#f59e0b' : '#cbd5e1', '900');
      }
      const nextText = tier === undefined ? undefined : STAFF_LEVEL_TEXT[tier];
      const line = !open
        ? `Not on staff yet. ${sc.unlockHint ?? 'Hire them on the Residency Board'}.`
        : next && nextText
          ? `Next: ${nextText.name} (${nextText.blurb})`
          : 'Fully upgraded. Somebody give them a raise.';
      this.txt(left + 140, y + 30, line, 14, MENU.muted);

      const mid = y + ch / 2;
      const label = !open ? 'LOCKED' : next ? `UPGRADE  $${next.cost.toLocaleString()}` : 'MAXED';
      const can = open && !!next && bank >= next.cost;
      const b = this.add.text(right - 14, mid, label, {
        fontFamily: font,
        fontSize: '16px',
        fontStyle: '900',
        color: open && !next ? '#065f46' : can ? '#04242c' : '#64748b',
        backgroundColor: open && !next ? MENU.mint : can ? '#38e8d8' : '#e2e8f0',
        padding: { x: 14, y: 7 },
      }).setOrigin(1, 0.5).setAlpha(open && next && !can ? 0.55 : open ? 1 : 0.5);
      if (can) {
        b.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          if (buyStaffLevel(sc.id)) sfx.cash();
          this.draw();
        });
      }
      this.body.add(b);
    });
  }
}
