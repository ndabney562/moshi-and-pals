import Phaser from 'phaser';
import { toTitle } from '../core/native';
import { renderMenuTopPanel, renderBackButton, MenuHeaderComponents } from '../ui/menuHeader';
import { COLORS as GAME_COLORS } from '../config/theme';
import { MENU, restartOnMenuResize } from '../ui/menuTheme';
const COLORS = { ...GAME_COLORS, uiText: MENU.ink, uiAccent: MENU.teal };
import { buy, chooseSpecialty, chooseStartTool, progress } from '../core/progress';
import { ATLAS, ATLAS_UNLOCK_KILLS } from '../data/atlas';
import { CRATE_POOL, EQUIPMENT } from '../data/equipment';
import { GERMS } from '../data/germs';
import { SPECIALTIES, STARTER_KIT_COST } from '../data/residency';
import { SCRIBES, scribeUnlockId } from '../data/scribes';
import { BALANCE } from '../config/balance';

type Tab = 'specialties' | 'kit' | 'scribes' | 'atlas';
const font = MENU.font;

/**
 * THE RESIDENCY BOARD (from the title screen): spend CME Credits on Specialties and the Starter Kit,
 * hire the scribes (and see if Donald is on call), choose what to bring to the next shift, and read the Microbiology Atlas.
 */
export class BoardScene extends Phaser.Scene {
  private tab: Tab = 'specialties';
  private body!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;
  private tabs: { id: Tab; text: Phaser.GameObjects.Text }[] = [];
  private topHeader?: MenuHeaderComponents;

  constructor() {
    super('Board');
  }

  init(data?: { tab?: Tab }): void {
    if (data?.tab) this.tab = data.tab;
  }

  create(): void {
    restartOnMenuResize(this);
    if (this.cameras?.main) {
      this.cameras.main.fadeIn(150, 0, 0, 0);
    }
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, MENU.paper).setOrigin(0);

    // Standardized Top Panel: Single active tab badge ('🎓 BOARD' or '🔬 ATLAS')
    this.topHeader = renderMenuTopPanel(this, this.tab === 'atlas' ? 'atlas' : 'board');
    this.events.once('shutdown', () => {
      this.topHeader?.destroy();
    });

    this.header = this.add.text(width / 2, 40, '', { fontFamily: font, fontSize: '38px', fontStyle: '900', color: COLORS.uiText }).setOrigin(0.5).setVisible(false);
    const labels: [Tab, string][] = [['specialties', 'SPECIALTIES'], ['kit', 'STARTER KIT'], ['scribes', 'STAFF'], ['atlas', 'MICROBIOLOGY ATLAS']];
    this.tabs = labels.map(([id, label], i) => {
      const text = this.add.text(width / 2 + (i - (labels.length - 1) / 2) * Math.min(250, (width - 64) / 4), 96, label, {
        fontFamily: font, fontSize: '18px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#eeeade', padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.show(id));
      return { id, text };
    });
    this.body = this.add.container(0, 0);

    // Standardized bottom-left BACK button
    renderBackButton(this, () => toTitle(this));
    this.input.keyboard?.on('keydown-ESC', () => toTitle(this));
    this.show(this.tab);
  }

  private show(tab: Tab): void {
    this.tab = tab;
    const p = progress();
    this.header.setText(`RESIDENCY BOARD  ·  ${p.credits} CME`);
    if (this.topHeader?.activeTabBadge) {
      this.topHeader.activeTabBadge.setText(tab === 'atlas' ? '🔬 ATLAS' : '🎓 BOARD');
    }
    for (const t of this.tabs) t.text.setBackgroundColor(t.id === tab ? MENU.mint : '#eeeade');
    this.body.removeAll(true);
    if (tab === 'specialties') this.drawSpecialties();
    else if (tab === 'kit') this.drawKit();
    else if (tab === 'scribes') this.drawScribes();
    else this.drawAtlas();
  }

  private txt(x: number, y: number, s: string, size: number, color: string = COLORS.uiText, style = 'bold'): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, { fontFamily: font, fontSize: `${size}px`, fontStyle: style, color });
    this.body.add(t);
    return t;
  }

  /** A tappable pill: lit when `on`, dimmed (and inert) when `enabled` is false. */
  private pill(x: number, y: number, label: string, onTap: () => void, on = false, enabled = true): Phaser.GameObjects.Text {
    const b = this.add.text(x, y, label, {
      fontFamily: font, fontSize: '18px', fontStyle: '900', color: on ? MENU.ink : COLORS.uiText,
      backgroundColor: on ? MENU.mint : enabled ? MENU.mint : '#e4e6dc', padding: { x: 14, y: 8 },
    }).setOrigin(1, 0.5).setAlpha(enabled ? 1 : 0.5);
    if (enabled) b.setInteractive({ useHandCursor: true }).on('pointerup', onTap);
    this.body.add(b);
    return b;
  }

  private drawSpecialties(): void {
    const { width, height } = this.scale;
    const p = progress();
    const left = Math.max(32, width / 2 - 520);
    const right = Math.min(width - 32, width / 2 + 520);
    this.txt(left, 140, 'One at a time, for the whole shift. Every perk has a catch.', 17, COLORS.uiAccent, 'italic');
    const rows = [{ id: '', name: 'General Practice', perk: 'No perk', catch: 'No catch', cost: 0 }, ...SPECIALTIES];
    const rowH = Math.min(72, (height - 180 - 80) / rows.length);
    const cardGfx = this.add.graphics();
    this.body.add(cardGfx);
    rows.forEach((s, i) => {
      const y = 180 + i * rowH;
      const owned = !s.id || p.owned.includes(s.id);
      const active = p.specialty === s.id;
      const ch = rowH - 8;

      cardGfx.fillStyle(0x000000, 0.04).fillRoundedRect(left, y - 4 + 2, right - left, ch, 12);
      cardGfx.fillStyle(active ? 0xf0faf6 : MENU.card, 1).fillRoundedRect(left, y - 4, right - left, ch, 12);
      cardGfx.lineStyle(1.5, active ? 0x80eac8 : MENU.line, 0.9).strokeRoundedRect(left, y - 4, right - left, ch, 12);

      this.txt(left + 14, y, s.name, 22, owned ? COLORS.uiText : MENU.muted, '900');
      this.txt(left + 14, y + 30, `+ ${s.perk}    − ${s.catch}`, 16, owned ? (active ? MENU.teal : MENU.muted) : MENU.muted);
      const mid = y + 22;
      if (!owned) {
        this.pill(right - 14, mid, `BUY  ${s.cost} CME`, () => { if (buy(s.id)) chooseSpecialty(s.id); this.show('specialties'); }, false, p.credits >= s.cost);
      } else {
        this.pill(right - 14, mid, active ? 'ON SHIFT' : 'CHOOSE', () => { chooseSpecialty(s.id); this.show('specialties'); }, active);
      }
    });
  }

  private drawKit(): void {
    const { width } = this.scale;
    const p = progress();
    const left = Math.max(32, width / 2 - 520);
    const right = Math.min(width - 32, width / 2 + 520);
    this.txt(left, 140, 'Bring a crate tool from home: you start every shift carrying it.', 17, COLORS.uiAccent, 'italic');
    if (!p.owned.includes('starterKit')) {
      const cardGfx = this.add.graphics();
      this.body.add(cardGfx);
      cardGfx.fillStyle(0x000000, 0.04).fillRoundedRect(left, 180, right - left, 90, 14);
      cardGfx.fillStyle(MENU.card, 1).fillRoundedRect(left, 178, right - left, 90, 14);
      cardGfx.lineStyle(1.5, MENU.line, 0.9).strokeRoundedRect(left, 178, right - left, 90, 14);

      this.txt(left + 16, 192, 'STARTER KIT', 26, COLORS.uiText, '900');
      this.txt(left + 16, 230, 'Unlocks choosing a starting tool. The bottle comes either way.', 17, MENU.muted);
      this.pill(right - 16, 222, `BUY  ${STARTER_KIT_COST} CME`, () => { buy('starterKit'); this.show('kit'); }, false, p.credits >= STARTER_KIT_COST);
      return;
    }
    const rows = ['', ...CRATE_POOL];
    const rowH = Math.min(58, 440 / rows.length);
    const cardGfx = this.add.graphics();
    this.body.add(cardGfx);
    rows.forEach((id, i) => {
      const y = 180 + i * rowH;
      const def = id ? EQUIPMENT[id] : undefined;
      const active = p.startTool === id;
      const ch = rowH - 6;

      cardGfx.fillStyle(0x000000, 0.04).fillRoundedRect(left, y - 4 + 2, right - left, ch, 12);
      cardGfx.fillStyle(active ? 0xf0faf6 : MENU.card, 1).fillRoundedRect(left, y - 4, right - left, ch, 12);
      cardGfx.lineStyle(1.5, active ? 0x80eac8 : MENU.line, 0.9).strokeRoundedRect(left, y - 4, right - left, ch, 12);

      this.txt(left + 14, y, def ? def.name : 'Just the bottle', 21, COLORS.uiText, '900');
      if (def?.blurb) this.txt(left + 360, y + 3, def.blurb, 15, MENU.muted);
      this.pill(right - 14, y + 12, active ? 'PACKED' : 'PACK IT', () => { chooseStartTool(id); this.show('kit'); }, active);
    });
  }

  /**
   * Omar and Alan: hire one and every shift they wait in a random first-floor exam room. Donald waits in X-ray (and
   * unlocks the first time it's opened).
   * Selina and Elaine (the front desk) drop as pills once hired. Their upgrades are in the Equipment Locker's STAFF shelf.
   */
  private drawScribes(): void {
    const { width, height } = this.scale;
    const p = progress();
    const left = Math.max(32, width / 2 - 520);
    const right = Math.min(width - 32, width / 2 + 520);
    this.txt(left, 140, `Omar and Alan wait in an exam room, Donald in X-ray: open it and they help all shift. Front desk pills drop, ${BALANCE.scribes.ms / 1000} s a visit.`, 17, COLORS.uiAccent, 'italic');
    const top = 176;
    const rowH = Math.min(120, (height - top - 84) / SCRIBES.length);
    const small = rowH < 110;
    const cardGfx = this.add.graphics();
    this.body.add(cardGfx);
    SCRIBES.forEach((sc, i) => {
      const y = top + i * rowH;
      const id = scribeUnlockId(sc.id);
      const hired = p.owned.includes(id);
      const ch = rowH - 10;

      cardGfx.fillStyle(0x000000, 0.04).fillRoundedRect(left, y - 4 + 2, right - left, ch, 14);
      cardGfx.fillStyle(hired ? 0xf8fcfb : MENU.card, 1).fillRoundedRect(left, y - 4, right - left, ch, 14);
      cardGfx.lineStyle(1.5, hired ? 0x80eac8 : MENU.line, 0.9).strokeRoundedRect(left, y - 4, right - left, ch, 14);

      cardGfx.fillStyle(0x000000, 0.06).fillCircle(left + 48, y + (small ? 30 : 34) + 2, 26);
      cardGfx.fillStyle(hired ? 0xfffcf6 : 0xe4e6dc, 1).fillCircle(left + 48, y + (small ? 30 : 34), 26);
      cardGfx.lineStyle(1.5, hired ? 0x80eac8 : 0xd8ded4, 0.9).strokeCircle(left + 48, y + (small ? 30 : 34), 26);

      const portrait = this.add.image(left + 48, y + (small ? 30 : 34), `scribe-${sc.id}`).setAngle(-90).setAlpha(hired ? 1 : 0.6).setScale(small ? 0.75 : 0.95);
      this.body.add(portrait);
      const k = small ? 0.8 : 1;
      this.txt(left + 110, y, `${sc.name.toUpperCase()}, ${sc.role}`, Math.round(24 * k), hired ? COLORS.uiText : MENU.muted, '900');
      this.txt(left + 110, y + 34 * k, sc.blurb, Math.round(16 * k + 1), hired ? MENU.muted : MENU.muted);
      const extra = sc.desk ? 'Patients line up at the desk and complain about the wait instead of misbehaving.'
        : 'Also shames patients with health code violations into cleaning up.';
      this.txt(left + 110, y + 58 * k, extra, Math.round(15 * k + 1), hired ? MENU.muted : MENU.muted, 'italic');
      const mid = y + 30 * k;
      if (hired) this.pill(right - 14, mid, 'ON CALL', () => undefined, true, false).setAlpha(1);
      else if (sc.cost === undefined) this.pill(right - 14, mid, (sc.unlockHint ?? 'LOCKED').toUpperCase(), () => undefined, false, false);
      else this.pill(right - 14, mid, `HIRE  ${sc.cost} CME`, () => { buy(id); this.show('scribes'); }, false, p.credits >= sc.cost);
    });
  }

  private drawAtlas(): void {
    const { width, height } = this.scale;
    const p = progress();
    const perCol = Math.ceil(ATLAS.length / 2);
    const colW = Math.min(620, (width - 100) / 2);
    const left = width / 2 - colW;
    const rowH = Math.min(64, (height - 150 - 90) / perCol);
    const cardGfx = this.add.graphics();
    this.body.add(cardGfx);
    ATLAS.forEach((entry, i) => {
      const def = GERMS[entry.id];
      if (!def) return;
      const x = left + Math.floor(i / perCol) * colW + 10;
      const y = 140 + (i % perCol) * rowH;
      const kills = p.kills[entry.id] ?? 0;
      const need = def.boss ? 1 : ATLAS_UNLOCK_KILLS;
      const known = kills >= need;
      const ch = rowH - 6;

      cardGfx.fillStyle(0x000000, 0.03).fillRoundedRect(x, y - 2 + 2, colW - 20, ch, 10);
      cardGfx.fillStyle(known ? MENU.card : 0xf2efe6, 1).fillRoundedRect(x, y - 2, colW - 20, ch, 10);
      cardGfx.lineStyle(1.5, known ? 0x80eac8 : MENU.line, 0.8).strokeRoundedRect(x, y - 2, colW - 20, ch, 10);

      this.txt(x + 12, y, `${known ? '🔬' : '🔒'}  ${def.name}  ·  ${kills.toLocaleString()} disinfected`, 18, known ? MENU.teal : MENU.muted, '900');
      this.txt(x + 36, y + 24, known ? entry.note : `Disinfect ${need - Math.min(kills, need)} more to unlock the clinical note.`, 14, known ? COLORS.uiText : MENU.muted)
        .setWordWrapWidth(colW - 60);
    });
  }
}
