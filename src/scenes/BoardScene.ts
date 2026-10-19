import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import { buy, chooseSpecialty, chooseStartTool, progress } from '../core/progress';
import { ATLAS, ATLAS_UNLOCK_KILLS } from '../data/atlas';
import { CRATE_POOL, EQUIPMENT } from '../data/equipment';
import { GERMS } from '../data/germs';
import { SPECIALTIES, STARTER_KIT_COST } from '../data/residency';
import { SCRIBES, scribeUnlockId } from '../data/scribes';
import { BALANCE } from '../config/balance';

type Tab = 'specialties' | 'kit' | 'scribes' | 'atlas';
const font = 'system-ui, -apple-system, sans-serif';

/**
 * THE RESIDENCY BOARD (from the title screen): spend CME Credits on Specialties and the Starter Kit,
 * hire the scribes (and see if Donald is on call), choose what to bring to the next shift, and read the Microbiology Atlas.
 */
export class BoardScene extends Phaser.Scene {
  private tab: Tab = 'specialties';
  private body!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;
  private tabs: { id: Tab; text: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super('Board');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0d2b2e).setOrigin(0);
    this.header = this.add.text(width / 2, 40, '', { fontFamily: font, fontSize: '38px', fontStyle: '900', color: COLORS.uiText }).setOrigin(0.5).setShadow(0, 4, '#000', 8);
    const labels: [Tab, string][] = [['specialties', 'SPECIALTIES'], ['kit', 'STARTER KIT'], ['scribes', 'STAFF'], ['atlas', 'MICROBIOLOGY ATLAS']];
    this.tabs = labels.map(([id, label], i) => {
      const text = this.add.text(width / 2 + (i - (labels.length - 1) / 2) * 270, 96, label, {
        fontFamily: font, fontSize: '20px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#1f4f55', padding: { x: 18, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.show(id));
      return { id, text };
    });
    this.body = this.add.container(0, 0);
    this.add.text(width / 2, height - 40, 'BACK', {
      fontFamily: font, fontSize: '26px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#3f5f66', padding: { x: 44, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('Title'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
    this.show(this.tab);
  }

  private show(tab: Tab): void {
    this.tab = tab;
    const p = progress();
    this.header.setText(`RESIDENCY BOARD  ·  ${p.credits} CME`);
    for (const t of this.tabs) t.text.setBackgroundColor(t.id === tab ? '#2a9d8f' : '#1f4f55');
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
      fontFamily: font, fontSize: '18px', fontStyle: '900', color: on ? '#0d2b2e' : COLORS.uiText,
      backgroundColor: on ? '#ffe66d' : enabled ? '#2a9d8f' : '#3f5f66', padding: { x: 14, y: 8 },
    }).setOrigin(1, 0.5).setAlpha(enabled ? 1 : 0.5);
    if (enabled) b.setInteractive({ useHandCursor: true }).on('pointerup', onTap);
    this.body.add(b);
    return b;
  }

  private drawSpecialties(): void {
    const { width } = this.scale;
    const p = progress();
    const left = width / 2 - 520;
    const right = width / 2 + 520;
    this.txt(left, 140, 'One at a time, for the whole shift. Every perk has a catch.', 17, COLORS.uiAccent, 'italic');
    const rowH = 72;
    const rows = [{ id: '', name: 'General Practice', perk: 'No perk', catch: 'No catch', cost: 0 }, ...SPECIALTIES];
    rows.forEach((s, i) => {
      const y = 180 + i * rowH;
      const owned = !s.id || p.owned.includes(s.id);
      this.txt(left, y, s.name, 22, owned ? COLORS.uiText : '#9fb8b3', '900');
      this.txt(left, y + 30, `+ ${s.perk}    − ${s.catch}`, 16, owned ? '#cfe9e4' : '#6f8f8a');
      const mid = y + 22;
      if (!owned) {
        this.pill(right, mid, `BUY  ${s.cost} CME`, () => { if (buy(s.id)) chooseSpecialty(s.id); this.show('specialties'); }, false, p.credits >= s.cost);
      } else {
        const active = p.specialty === s.id;
        this.pill(right, mid, active ? 'ON SHIFT' : 'CHOOSE', () => { chooseSpecialty(s.id); this.show('specialties'); }, active);
      }
    });
  }

  private drawKit(): void {
    const { width } = this.scale;
    const p = progress();
    const left = width / 2 - 520;
    const right = width / 2 + 520;
    this.txt(left, 140, 'Bring a crate tool from home: you start every shift carrying it.', 17, COLORS.uiAccent, 'italic');
    if (!p.owned.includes('starterKit')) {
      this.txt(left, 190, 'STARTER KIT', 26, COLORS.uiText, '900');
      this.txt(left, 226, 'Unlocks choosing a starting tool. The bottle comes either way.', 17, '#cfe9e4');
      this.pill(right, 208, `BUY  ${STARTER_KIT_COST} CME`, () => { buy('starterKit'); this.show('kit'); }, false, p.credits >= STARTER_KIT_COST);
      return;
    }
    const rows = ['', ...CRATE_POOL];
    const rowH = Math.min(58, 440 / rows.length);
    rows.forEach((id, i) => {
      const y = 180 + i * rowH;
      const def = id ? EQUIPMENT[id] : undefined;
      this.txt(left, y, def ? def.name : 'Just the bottle', 21, COLORS.uiText, '900');
      if (def?.blurb) this.txt(left + 360, y + 3, def.blurb, 15, '#cfe9e4');
      const active = p.startTool === id;
      this.pill(right, y + 12, active ? 'PACKED' : 'PACK IT', () => { chooseStartTool(id); this.show('kit'); }, active);
    });
  }

  /**
   * Omar and Alan: hire one and every shift they wait in a random first-floor exam room. Donald unlocks in X-ray.
   * Selina and Elaine (the front desk) drop as pills once hired. Their upgrades are in the Equipment Locker's STAFF shelf.
   */
  private drawScribes(): void {
    const { width, height } = this.scale;
    const p = progress();
    const left = width / 2 - 520;
    const right = width / 2 + 520;
    this.txt(left, 140, `Omar and Alan wait in a first-floor exam room: open it and they help all shift. Front desk pills drop, ${BALANCE.scribes.ms / 1000} s a visit.`, 17, COLORS.uiAccent, 'italic');
    const top = 176;
    const rowH = Math.min(120, (height - top - 84) / SCRIBES.length);
    const small = rowH < 110;
    SCRIBES.forEach((sc, i) => {
      const y = top + i * rowH;
      const id = scribeUnlockId(sc.id);
      const hired = p.owned.includes(id);
      const portrait = this.add.image(left + 44, y + (small ? 30 : 34), `scribe-${sc.id}`).setAngle(-90).setAlpha(hired ? 1 : 0.6).setScale(small ? 0.8 : 1);
      this.body.add(portrait);
      const k = small ? 0.8 : 1;
      this.txt(left + 110, y, `${sc.name.toUpperCase()}, ${sc.role}`, Math.round(24 * k), hired ? COLORS.uiText : '#9fb8b3', '900');
      this.txt(left + 110, y + 34 * k, sc.blurb, Math.round(16 * k + 1), hired ? '#cfe9e4' : '#6f8f8a');
      const extra = sc.desk ? 'Patients line up at the desk and complain about the wait instead of misbehaving.'
        : 'Also shames patients with health code violations into cleaning up.';
      this.txt(left + 110, y + 58 * k, extra, Math.round(15 * k + 1), hired ? '#cfe9e4' : '#6f8f8a', 'italic');
      const mid = y + 30 * k;
      if (hired) this.pill(right, mid, 'ON CALL', () => undefined, true, false).setAlpha(1);
      else if (sc.cost === undefined) this.pill(right, mid, (sc.unlockHint ?? 'LOCKED').toUpperCase(), () => undefined, false, false);
      else this.pill(right, mid, `HIRE  ${sc.cost} CME`, () => { buy(id); this.show('scribes'); }, false, p.credits >= sc.cost);
    });
  }

  private drawAtlas(): void {
    const { width, height } = this.scale;
    const p = progress();
    const perCol = Math.ceil(ATLAS.length / 2);
    const colW = Math.min(620, (width - 100) / 2);
    const left = width / 2 - colW;
    const rowH = Math.min(64, (height - 150 - 90) / perCol);
    ATLAS.forEach((entry, i) => {
      const def = GERMS[entry.id];
      if (!def) return;
      const x = left + Math.floor(i / perCol) * colW + 10;
      const y = 140 + (i % perCol) * rowH;
      const kills = p.kills[entry.id] ?? 0;
      const need = def.boss ? 1 : ATLAS_UNLOCK_KILLS;
      const known = kills >= need;
      this.txt(x, y, `${known ? '🔬' : '🔒'}  ${def.name}  ·  ${kills.toLocaleString()} disinfected`, 18, known ? '#ffe66d' : '#9fb8b3', '900');
      this.txt(x + 30, y + 24, known ? entry.note : `Disinfect ${need - Math.min(kills, need)} more to unlock the clinical note.`, 14, known ? COLORS.uiText : '#6f8f8a')
        .setWordWrapWidth(colW - 50);
    });
  }
}
