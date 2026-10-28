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
        // A rounded surface shares the text's real hit bounds.
        const b = t.getBounds();
        panels.fillStyle(primary ? 0x80eac8 : 0xe9e8dd).fillRoundedRect(b.x, b.y, b.width, b.height, 16);
        return t;
      })();
    items.push(this.add.rectangle(0, 0, w, h, MENU.paper).setOrigin(0));
    const panels = this.add.graphics().fillStyle(MENU.card).lineStyle(1, MENU.line);
    panels.fillRoundedRect(left, 126, right - left, 420, 24).strokeRoundedRect(left, 126, right - left, 420, 24);
    items.push(panels);
    text(left, 42, 'Moshi and Pals / Providers', 25);
    text(right, 42, `${progress().nps.toLocaleString()} NPS`, 21, MENU.teal).setOrigin(1, .5);
    text(left, 92, 'Meet your next shift.', 30);
    text(right, 92, `${this.index + 1} / ${CHARACTERS.length} · ${settings.character === c.id ? 'ON SHIFT' : owned ? 'AVAILABLE' : 'LOCKED'}`, 17, MENU.muted).setOrigin(1, .5);
    const portraitH = 352, portraitW = portraitH * .75;
    items.push(this.add.image(left + (right - left) * .23, 336, 'provider-portraits', c.id).setDisplaySize(portraitW, portraitH));
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
      panels.fillStyle(i === this.index ? 0x80eac8 : 0xeeeade).fillRoundedRect(tx, 570, tileW, tileH, 12);
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
