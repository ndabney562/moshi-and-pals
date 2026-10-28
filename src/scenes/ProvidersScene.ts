import Phaser from 'phaser';
import { MENU } from '../ui/menuTheme';
import { readSafeArea } from '../core/safeArea';
import { CHARACTERS } from '../data/characters';
import { buySecond, doctorUnlocked, hireDoctor, progress, secondUnlocked } from '../core/progress';
import { settings, saveSettings } from '../core/settings';
import { toTitle } from '../core/native';

/** One readable provider card at a time, independent of roster length and shared with iOS. */
export class ProvidersScene extends Phaser.Scene {
  private index = 0;
  private confirming = '';
  private content?: Phaser.GameObjects.Container;
  constructor() { super('Providers'); }
  create(): void {
    this.index = Math.max(0,CHARACTERS.findIndex(c=>c.id === settings.character));
    this.confirming=''; this.draw();
    this.scale.on('resize',this.draw,this);
    this.events.once('shutdown',()=>this.scale.off('resize',this.draw,this));
    this.input.keyboard?.on('keydown-ESC',()=>toTitle(this));
    this.input.keyboard?.on('keydown-RIGHT',()=>this.next(1));
    this.input.keyboard?.on('keydown-LEFT',()=>this.next(-1));
  }
  next(direction: number): void { this.index=(this.index+direction+CHARACTERS.length)%CHARACTERS.length; this.confirming=''; this.draw(); }
  select(): void {
    const c=CHARACTERS[this.index];
    if (!doctorUnlocked(c.id)) {
      if (this.confirming !== `hire:${c.id}`) { this.confirming=`hire:${c.id}`; this.draw(); return; }
      if (!hireDoctor(c.id)) return;
    }
    settings.character=c.id; saveSettings(); this.confirming=''; this.draw();
  }
  unlockSecond(): void {
    const c=CHARACTERS[this.index];
    if (!c.second || secondUnlocked(c.id) || !doctorUnlocked(c.id)) return;
    if (this.confirming !== `second:${c.id}`) { this.confirming=`second:${c.id}`; this.draw(); return; }
    buySecond(c.id); this.confirming=''; this.draw();
  }
  private draw(): void {
    this.content?.destroy(true);
    const { width: w, height: h } = this.scale;
    const safe = readSafeArea();
    const left = Math.max(32, safe.left + 16), right = w - Math.max(32, safe.right + 16);
    const c = CHARACTERS[this.index], owned = doctorUnlocked(c.id);
    const items: Phaser.GameObjects.GameObject[] = [];
    const text = (x: number, y: number, label: string, size = 24, color = MENU.ink) => {
      const t = this.add.text(x, y, label, { fontFamily: MENU.font, fontSize: `${size}px`, fontStyle: 'bold', color, wordWrap: { width: (right - left) * .46 } }).setOrigin(0, .5);
      items.push(t); return t;
    };
    const button = (x: number, y: number, label: string, action: () => void, primary = false) =>
      (() => {
        const t = text(x, y, label, 18).setOrigin(label === 'BACK' ? .5 : label === '▶' ? 1 : 0, .5).setPadding(18, 16).setInteractive({ useHandCursor: true }).on('pointerup', action);
        // A rounded surface shares the text's real hit bounds with tactile depth.
        const b = t.getBounds();
        const radius = 16;
        panels.fillStyle(0x000000, primary ? 0.16 : 0.08).fillRoundedRect(b.x, b.y + (primary ? 3 : 2), b.width, b.height, radius);
        panels.fillStyle(primary ? 0x147a62 : 0xd0cec0, 1).fillRoundedRect(b.x, b.y + (primary ? 2 : 1), b.width, b.height, radius);
        panels.fillStyle(primary ? 0x80eac8 : 0xfffcf6, 1).fillRoundedRect(b.x, b.y, b.width, b.height - (primary ? 2 : 1), radius);
        panels.lineStyle(1.5, primary ? 0x4db896 : 0xd8ded4, 0.9).strokeRoundedRect(b.x, b.y, b.width, b.height - (primary ? 2 : 1), radius);
        if (primary) {
          panels.lineStyle(1, 0xffffff, 0.55).beginPath()
            .moveTo(b.x + radius, b.y + 1)
            .lineTo(b.x + b.width - radius, b.y + 1)
            .strokePath();
        }
        return t;
      })();
    items.push(this.add.rectangle(0, 0, w, h, MENU.paper).setOrigin(0));
    const panels = this.add.graphics();
    // Hero Card drop-shadow elevation and bevel
    panels.fillStyle(0x000000, 0.08).fillRoundedRect(left + 2, 126 + 4, right - left, 420, 24);
    panels.fillStyle(0xd5d2c4, 1).fillRoundedRect(left, 126 + 2, right - left, 420, 24);
    panels.fillStyle(MENU.card).fillRoundedRect(left, 126, right - left, 418, 24);
    panels.lineStyle(1.5, MENU.line).strokeRoundedRect(left, 126, right - left, 418, 24);
    items.push(panels);

    // Top Header & NPS Badge
    text(left, 42, 'Moshi and Pals / Providers', 25);
    const npsW = 164;
    panels.fillStyle(0x000000, 0.06).fillRoundedRect(right - npsW, 26, npsW, 34, 17);
    panels.fillStyle(0xfffcf6, 1).fillRoundedRect(right - npsW, 24, npsW, 34, 17);
    panels.lineStyle(1.5, 0x80eac8, 0.9).strokeRoundedRect(right - npsW, 24, npsW, 34, 17);
    text(right - npsW / 2, 41, `⭐ ${progress().nps.toLocaleString()} NPS`, 18, MENU.teal).setOrigin(.5);
    text(left, 92, 'Meet your next shift.', 30);
    text(right, 92, `${this.index + 1} / ${CHARACTERS.length} · ${settings.character === c.id ? 'ON SHIFT' : owned ? 'AVAILABLE' : 'LOCKED'}`, 17, MENU.muted).setOrigin(1, .5);

    const portraitH = 352, portraitW = portraitH * .75;
    const px = left + (right - left) * .23;
    const py = 336;
    // Portrait frame elevation
    panels.fillStyle(0x000000, 0.1).fillRoundedRect(px - portraitW / 2 + 2, py - portraitH / 2 + 4, portraitW, portraitH, 18);
    panels.fillStyle(0xfffcf6, 1).fillRoundedRect(px - portraitW / 2, py - portraitH / 2, portraitW, portraitH, 18);
    panels.lineStyle(2, 0x80eac8, 0.85).strokeRoundedRect(px - portraitW / 2, py - portraitH / 2, portraitW, portraitH, 18);
    items.push(this.add.image(px, py, 'provider-portraits', c.id).setDisplaySize(portraitW, portraitH));

    const x = left + (right - left) * .48;
    text(x, 178, c.name, 38);
    text(x, 248, c.blurb, 21, MENU.muted).setLineSpacing(6);
    text(x, 324, `Helper output ×${c.helperDamage}`, 18, MENU.teal);
    text(x, 374, c.second ? `SECOND SPECIAL · ${c.second.name}` : 'Second special coming in a future update', 18, MENU.amber);
    const hire = owned ? (settings.character === c.id ? 'SELECTED FOR SHIFT' : 'SELECT FOR SHIFT') : `${this.confirming === `hire:${c.id}` ? 'CONFIRM HIRE' : 'HIRE'} · ${c.price.toLocaleString()} NPS`;
    button(x, 440, hire, () => this.select(), true).setAlpha(owned || progress().nps >= c.price ? 1 : .5);
    if (c.second) button(x, 506, secondUnlocked(c.id) ? 'SECOND UNLOCKED' : `${this.confirming === `second:${c.id}` ? 'CONFIRM' : 'UNLOCK SECOND'} · ${c.second.price.toLocaleString()} NPS`, () => this.unlockSecond())
      .setAlpha(owned && progress().nps >= c.second.price || secondUnlocked(c.id) ? 1 : .5);
    const count = 6, first = Math.floor(this.index / count) * count;
    const tileW = Math.min(110, (right - left - 170) / count), tileH = 104;
    const stripX = w / 2 - count * (tileW + 12) / 2;
    for (let i = first; i < Math.min(first + count, CHARACTERS.length); i++) {
      const def = CHARACTERS[i], tx = stripX + (i - first) * (tileW + 12);
      const isSelected = i === this.index;
      panels.fillStyle(0x000000, isSelected ? 0.15 : 0.06).fillRoundedRect(tx, 570 + (isSelected ? 3 : 2), tileW, tileH, 14);
      panels.fillStyle(isSelected ? 0x147a62 : 0xd5d2c4, 1).fillRoundedRect(tx, 570 + (isSelected ? 2 : 1), tileW, tileH, 14);
      panels.fillStyle(isSelected ? 0x80eac8 : 0xfffcf6, 1).fillRoundedRect(tx, 570, tileW, tileH - (isSelected ? 2 : 1), 14);
      panels.lineStyle(1.5, isSelected ? 0x4db896 : 0xd8ded4, 0.9).strokeRoundedRect(tx, 570, tileW, tileH - (isSelected ? 2 : 1), 14);

      const hit = this.add.rectangle(tx + tileW / 2, 622, tileW, tileH, 0xffffff, 0).setInteractive({ useHandCursor: true });
      items.push(hit);
      const art = this.add.image(tx + tileW / 2, 610, 'provider-portraits', def.id).setDisplaySize(60, 80);
      hit.on('pointerup', () => { this.index = i; this.confirming = ''; this.draw(); });
      items.push(art);
      text(tx + tileW / 2, 658, def.short, 14).setOrigin(.5);
    }
    button(left, 615, '◀', () => this.next(-1));
    button(right, 615, '▶', () => this.next(1)).setOrigin(1, .5);
    button(w / 2, h - Math.max(32, safe.bottom + 26), 'BACK', () => toTitle(this)).setFontSize(15);
    this.content = this.add.container(0, 0, items);
  }
}
