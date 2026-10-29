import Phaser from 'phaser';
import { MENU } from '../ui/menuTheme';
import { readSafeArea } from '../core/safeArea';
import { CHARACTERS } from '../data/characters';
import { buySecond, doctorUnlocked, hireDoctor, progress, secondUnlocked } from '../core/progress';
import { settings, saveSettings } from '../core/settings';
import { transitionTo, renderMenuTopPanel, renderBackButton, MenuHeaderComponents } from '../ui/menuHeader';

/** One readable provider card at a time, independent of roster length and shared with iOS. */
export class ProvidersScene extends Phaser.Scene {
  private index = 0;
  private confirming = '';
  private content?: Phaser.GameObjects.Container;
  private topHeader?: MenuHeaderComponents;
  constructor() { super('Providers'); }
  create(): void {
    if (this.cameras?.main) {
      this.cameras.main.fadeIn(150, 0, 0, 0);
    }
    this.index = Math.max(0,CHARACTERS.findIndex(c=>c.id === settings.character));
    this.confirming=''; this.draw();
    this.scale.on('resize',this.draw,this);
    this.events.once('shutdown',() => {
      this.scale.off('resize',this.draw,this);
      this.topHeader?.destroy();
    });
    this.input.keyboard?.on('keydown-ESC',() => transitionTo(this, 'Title'));
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
    this.topHeader?.destroy();
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

    // Standardized Top Panel: Single active tab badge '👥 PROVIDERS'
    this.topHeader = renderMenuTopPanel(this, 'providers');

    // Responsive vertical budgeting
    const heroTop = 84;
    const availH = h - heroTop - Math.max(68, safe.bottom + 56);
    const tileH = Math.min(92, Math.max(64, Math.round(availH * 0.18)));
    const cardH = Math.min(410, availH - tileH - 14);
    const stripY = heroTop + cardH + 10;

    // Hero Card drop-shadow elevation and bevel
    panels.fillStyle(0x000000, 0.08).fillRoundedRect(left + 2, heroTop + 4, right - left, cardH, 24);
    panels.fillStyle(0xd5d2c4, 1).fillRoundedRect(left, heroTop + 2, right - left, cardH, 24);
    panels.fillStyle(MENU.card).fillRoundedRect(left, heroTop, right - left, cardH - 2, 24);
    panels.lineStyle(1.5, MENU.line).strokeRoundedRect(left, heroTop, right - left, cardH - 2, 24);
    items.push(panels);

    text(left + 16, heroTop + 24, `${this.index + 1} / ${CHARACTERS.length} · ${settings.character === c.id ? 'ON SHIFT' : owned ? 'AVAILABLE' : 'LOCKED'}`, 16, MENU.muted);

    const portraitH = Math.min(320, Math.round(cardH * 0.78)), portraitW = Math.round(portraitH * .75);
    const px = left + (right - left) * .23;
    const py = heroTop + cardH / 2 + 10;
    // Portrait frame elevation
    panels.fillStyle(0x000000, 0.1).fillRoundedRect(px - portraitW / 2 + 2, py - portraitH / 2 + 4, portraitW, portraitH, 18);
    panels.fillStyle(0xfffcf6, 1).fillRoundedRect(px - portraitW / 2, py - portraitH / 2, portraitW, portraitH, 18);
    panels.lineStyle(2, 0x80eac8, 0.85).strokeRoundedRect(px - portraitW / 2, py - portraitH / 2, portraitW, portraitH, 18);
    items.push(this.add.image(px, py, 'provider-portraits', c.id).setDisplaySize(portraitW, portraitH));

    const x = left + (right - left) * .48;
    text(x, heroTop + 38, c.name, 38);
    text(x, heroTop + 96, c.blurb, 19, MENU.muted).setLineSpacing(5);
    text(x, heroTop + 162, `Helper output ×${c.helperDamage}`, 17, MENU.teal);
    text(x, heroTop + 204, c.second ? `SECOND SPECIAL · ${c.second.name}` : 'Second special coming in a future update', 17, MENU.amber);
    const hire = owned ? (settings.character === c.id ? 'SELECTED FOR SHIFT' : 'SELECT FOR SHIFT') : `${this.confirming === `hire:${c.id}` ? 'CONFIRM HIRE' : 'HIRE'} · ${c.price.toLocaleString()} NPS`;
    button(x, heroTop + 264, hire, () => this.select(), true).setAlpha(owned || progress().nps >= c.price ? 1 : .5);
    if (c.second) button(x, heroTop + 326, secondUnlocked(c.id) ? 'SECOND UNLOCKED' : `${this.confirming === `second:${c.id}` ? 'CONFIRM' : 'UNLOCK SECOND'} · ${c.second.price.toLocaleString()} NPS`, () => this.unlockSecond())
      .setAlpha(owned && progress().nps >= c.second.price || secondUnlocked(c.id) ? 1 : .5);

    const count = 6, first = Math.floor(this.index / count) * count;
    const tileW = Math.min(110, (right - left - 170) / count);
    const stripX = w / 2 - count * (tileW + 12) / 2;
    for (let i = first; i < Math.min(first + count, CHARACTERS.length); i++) {
      const def = CHARACTERS[i], tx = stripX + (i - first) * (tileW + 12);
      const isSelected = i === this.index;
      panels.fillStyle(0x000000, isSelected ? 0.15 : 0.06).fillRoundedRect(tx, stripY + (isSelected ? 3 : 2), tileW, tileH, 14);
      panels.fillStyle(isSelected ? 0x147a62 : 0xd5d2c4, 1).fillRoundedRect(tx, stripY + (isSelected ? 2 : 1), tileW, tileH, 14);
      panels.fillStyle(isSelected ? 0x80eac8 : 0xfffcf6, 1).fillRoundedRect(tx, stripY, tileW, tileH - (isSelected ? 2 : 1), 14);
      panels.lineStyle(1.5, isSelected ? 0x4db896 : 0xd8ded4, 0.9).strokeRoundedRect(tx, stripY, tileW, tileH - (isSelected ? 2 : 1), 14);

      const hit = this.add.rectangle(tx + tileW / 2, stripY + tileH / 2, tileW, tileH, 0xffffff, 0).setInteractive({ useHandCursor: true });
      items.push(hit);
      const art = this.add.image(tx + tileW / 2, stripY + tileH / 2 - 10, 'provider-portraits', def.id).setDisplaySize(Math.round(tileW * 0.55), Math.round(tileH * 0.7));
      hit.on('pointerup', () => { this.index = i; this.confirming = ''; this.draw(); });
      items.push(art);
      text(tx + tileW / 2, stripY + tileH - 14, def.short, 13).setOrigin(.5);
    }
    button(left + 20, stripY + tileH / 2, '◀', () => this.next(-1));
    button(right - 20, stripY + tileH / 2, '▶', () => this.next(1)).setOrigin(1, .5);

    // Standardized BACK button in bottom left
    const backBtn = renderBackButton(this, () => transitionTo(this, 'Title'));
    items.push(backBtn);

    this.content = this.add.container(0, 0, items);
  }
}
