import Phaser from 'phaser';
import { renderMenuTopPanel, renderBackButton, transitionTo, MenuHeaderComponents } from '../ui/menuHeader';
import { COLORS as GAME_COLORS } from '../config/theme';
import { MENU, renderMenuBackground, restartOnMenuResize } from '../ui/menuTheme';
const COLORS = { ...GAME_COLORS, uiText: MENU.ink, uiAccent: MENU.teal };
import { buy, chooseSpecialty, chooseStartTool, progress } from '../core/progress';
import { ATLAS, ATLAS_UNLOCK_KILLS } from '../data/atlas';
import { CRATE_POOL, EQUIPMENT } from '../data/equipment';
import { GERMS } from '../data/germs';
import { SPECIALTIES, STARTER_KIT_COST } from '../data/residency';
import { SCRIBES, scribeUnlockId } from '../data/scribes';
import { BALANCE } from '../config/balance';
import { readSafeArea } from '../core/safeArea';

type Tab = 'specialties' | 'kit' | 'scribes' | 'atlas';
const font = MENU.font;

const GERM_SPRITE_MAP: Record<string, string> = {
  basic: 'germ-basic',
  sprinter: 'germ-sprinter',
  sneezer: 'germ-sneezer',
  sporePod: 'germ-sporePod',
  duo: 'germ-duo',
  monococcus: 'germ-duo',
  patientZero: 'germ-patientZero',
  methicillin: 'germ-patientZero',
};

/**
 * THE RESIDENCY BOARD & MICROBIOLOGY ATLAS:
 * Styled with blurred 3D clinic hallway background, 6-column vertical staff cards (moshi-and-pals-residency.PNG),
 * and 6-column 3D germ cards + filter bar + discovered counter (moshi-and-pals-atlas.PNG).
 */
export class BoardScene extends Phaser.Scene {
  private tab: Tab = 'specialties';
  private atlasPage = 0;
  private body!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;
  private tabGfx!: Phaser.GameObjects.Graphics;
  private tabs: { id: Tab; text: Phaser.GameObjects.Text }[] = [];
  private topHeader?: MenuHeaderComponents;

  constructor() {
    super('Board');
  }

  init(data?: { tab?: Tab }): void {
    if (data?.tab) this.tab = data.tab;
    this.atlasPage = 0;
  }

  create(): void {
    restartOnMenuResize(this);
    if (this.cameras?.main) {
      this.cameras.main.fadeIn(150, 0, 0, 0);
    }
    const { width } = this.scale;
    renderMenuBackground(this, 'bg-board');

    // Standardized Top Panel: Single active tab badge ('🎓 BOARD' or '🔬 ATLAS')
    this.topHeader = renderMenuTopPanel(this, this.tab === 'atlas' ? 'atlas' : 'board');
    this.events.once('shutdown', () => {
      this.topHeader?.destroy();
    });

    const safe = readSafeArea();
    const left = Math.max(24, safe.left + 14);

    this.header = this.add.text(left + 4, 80, '', {
      fontFamily: font,
      fontSize: '26px',
      fontStyle: '900',
      color: '#0b2530',
    }).setOrigin(0, 0.5);

    this.tabGfx = this.add.graphics();
    const labels: [Tab, string][] = [
      ['specialties', 'SPECIALTIES'],
      ['kit', 'STARTER KIT'],
      ['scribes', 'STAFF'],
      ['atlas', 'MICROBIOLOGY ATLAS'],
    ];
    this.tabs = labels.map(([id, label], i) => {
      const text = this.add.text(
        width / 2 + (i - (labels.length - 1) / 2) * Math.min(210, (width - 80) / 4),
        114,
        label,
        {
          fontFamily: font,
          fontSize: '14px',
          fontStyle: '900',
          color: COLORS.uiText,
          padding: { x: 14, y: 7 },
        }
      ).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.atlasPage = 0;
        this.show(id);
      });
      return { id, text };
    });

    this.body = this.add.container(0, 0);

    // Standardized bottom-left BACK button
    renderBackButton(this, () => transitionTo(this, 'Title'));
    this.input.keyboard?.on('keydown-ESC', () => transitionTo(this, 'Title'));
    this.show(this.tab);
  }

  private show(tab: Tab): void {
    this.tab = tab;
    const p = progress();
    if (tab === 'atlas') {
      this.header.setText('🔬 MICROBIOLOGY ATLAS — Know your enemy. Disinfect to unlock the full atlas.');
      this.header.setFontSize(this.scale.width < 960 ? 18 : 22);
    } else {
      this.header.setText(`👥 RESIDENCY BOARD  •  ${p.credits} CME`);
      this.header.setFontSize(26);
    }

    if (this.topHeader?.activeTabBadge) {
      this.topHeader.activeTabBadge.setText(tab === 'atlas' ? '🔬 ATLAS' : '🎓 BOARD');
      this.topHeader.layout();
    }

    this.tabGfx.clear();
    for (const t of this.tabs) {
      const isSelected = t.id === tab;
      t.text.setBackgroundColor('rgba(0,0,0,0)');
      t.text.setColor(isSelected ? '#04242c' : '#e2f1f8');
      const b = t.text.getBounds();
      this.tabGfx.fillStyle(0x03131a, 0.28).fillRoundedRect(b.x, b.y + 2, b.width, b.height, 14);
      if (isSelected) {
        this.tabGfx.fillStyle(0x38e8d8, 0.96).fillRoundedRect(b.x, b.y, b.width, b.height, 14);
        this.tabGfx.lineStyle(2, 0xa5f3fc, 0.95).strokeRoundedRect(b.x, b.y, b.width, b.height, 14);
      } else {
        this.tabGfx.fillStyle(0x0b2736, 0.88).fillRoundedRect(b.x, b.y, b.width, b.height, 14);
        this.tabGfx.lineStyle(1.5, 0x38bdf8, 0.5).strokeRoundedRect(b.x, b.y, b.width, b.height, 14);
      }
    }

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
  private pill(x: number, y: number, label: string, onTap: () => void, on = false, enabled = true, centerOrigin = false): Phaser.GameObjects.Text {
    const b = this.add.text(x, y, label, {
      fontFamily: font,
      fontSize: '15px',
      fontStyle: '900',
      color: on ? '#065f46' : enabled ? '#04242c' : '#64748b',
      backgroundColor: on ? '#a7f3d0' : enabled ? '#38e8d8' : '#e2e8f0',
      padding: { x: 14, y: 7 },
    }).setOrigin(centerOrigin ? 0.5 : 1, 0.5).setAlpha(enabled || on ? 1 : 0.65);
    if (enabled) b.setInteractive({ useHandCursor: true }).on('pointerup', onTap);
    this.body.add(b);
    return b;
  }

  private drawSpecialties(): void {
    const { width, height } = this.scale;
    const p = progress();
    const left = Math.max(28, width / 2 - 520);
    const right = Math.min(width - 28, width / 2 + 520);
    this.txt(left, 142, 'One at a time, for the whole shift. Every perk has a catch.', 15, '#1e3a46', 'bold');
    const rows = [{ id: '', name: 'General Practice', perk: 'No perk', catch: 'No catch', cost: 0 }, ...SPECIALTIES];
    const rowH = Math.min(68, (height - 172 - 72) / rows.length);
    const cardGfx = this.add.graphics();
    this.body.add(cardGfx);
    rows.forEach((s, i) => {
      const y = 172 + i * rowH;
      const owned = !s.id || p.owned.includes(s.id);
      const active = p.specialty === s.id;
      const ch = rowH - 6;

      cardGfx.fillStyle(0x041822, 0.18).fillRoundedRect(left, y + 2, right - left, ch, 14);
      cardGfx.fillStyle(active ? 0xecfdf5 : 0xfdfaf2, 0.98).fillRoundedRect(left, y, right - left, ch, 14);
      cardGfx.lineStyle(active ? 2 : 1.5, active ? 0x22d3ee : 0xd6cfc0, 0.9).strokeRoundedRect(left, y, right - left, ch, 14);

      this.txt(left + 16, y + 6, s.name, 20, owned ? '#0b2530' : MENU.muted, '900');
      this.txt(left + 16, y + 32, `+ ${s.perk}    − ${s.catch}`, 15, owned ? (active ? MENU.teal : '#334155') : MENU.muted);
      const mid = y + ch / 2;
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
    const left = Math.max(28, width / 2 - 520);
    const right = Math.min(width - 28, width / 2 + 520);
    this.txt(left, 142, 'Bring a crate tool from home: you start every shift carrying it.', 15, '#1e3a46', 'bold');
    if (!p.owned.includes('starterKit')) {
      const cardGfx = this.add.graphics();
      this.body.add(cardGfx);
      cardGfx.fillStyle(0x041822, 0.2).fillRoundedRect(left, 178, right - left, 92, 16);
      cardGfx.fillStyle(0xfdfaf2, 0.98).fillRoundedRect(left, 174, right - left, 92, 16);
      cardGfx.lineStyle(2, 0x38bdf8, 0.85).strokeRoundedRect(left, 174, right - left, 92, 16);

      this.txt(left + 18, 190, '🧰 STARTER KIT', 24, '#0b2530', '900');
      this.txt(left + 18, 226, 'Unlocks choosing a starting tool. The bottle comes either way.', 16, '#334155');
      this.pill(right - 18, 220, `BUY  ${STARTER_KIT_COST} CME`, () => { buy('starterKit'); this.show('kit'); }, false, p.credits >= STARTER_KIT_COST);
      return;
    }
    const rows = ['', ...CRATE_POOL];
    const rowH = Math.min(56, 420 / rows.length);
    const cardGfx = this.add.graphics();
    this.body.add(cardGfx);
    rows.forEach((id, i) => {
      const y = 174 + i * rowH;
      const def = id ? EQUIPMENT[id] : undefined;
      const active = p.startTool === id;
      const ch = rowH - 6;

      cardGfx.fillStyle(0x041822, 0.16).fillRoundedRect(left, y + 2, right - left, ch, 12);
      cardGfx.fillStyle(active ? 0xecfdf5 : 0xfdfaf2, 0.98).fillRoundedRect(left, y, right - left, ch, 12);
      cardGfx.lineStyle(active ? 2 : 1.5, active ? 0x22d3ee : 0xd6cfc0, 0.9).strokeRoundedRect(left, y, right - left, ch, 12);

      this.txt(left + 16, y + 8, def ? def.name : 'Just the bottle', 19, '#0b2530', '900');
      if (def?.blurb) this.txt(left + 340, y + 10, def.blurb, 14, '#334155');
      this.pill(right - 14, y + ch / 2, active ? 'PACKED' : 'PACK IT', () => { chooseStartTool(id); this.show('kit'); }, active);
    });
  }

  /**
   * 6-column vertical staff cards with 3D character portraits matching moshi-and-pals-residency.PNG.
   */
  private drawScribes(): void {
    const { width, height } = this.scale;
    const safe = readSafeArea();
    const p = progress();
    const left = Math.max(20, safe.left + 12);
    const right = width - Math.max(20, safe.right + 12);
    this.txt(
      left + 4,
      140,
      `Omar and Alan wait in an exam room, Donald in X-ray: open it and they help all shift. Front desk pills drop, ${BALANCE.scribes.ms / 1000} s a visit.`,
      14,
      '#1e3a46',
      'bold'
    );

    const top = 162;
    const cardH = Math.min(360, height - top - Math.max(58, safe.bottom + 46));
    const cols = SCRIBES.length; // 6 columns
    const gap = 10;
    const cardW = Math.floor((right - left - gap * (cols - 1)) / cols);

    const cardGfx = this.add.graphics();
    this.body.add(cardGfx);

    SCRIBES.forEach((sc, i) => {
      const cx = left + i * (cardW + gap);
      const cy = top;
      const id = scribeUnlockId(sc.id);
      const hired = p.owned.includes(id);

      // White/cream rounded vertical card matching moshi-and-pals-residency.PNG
      cardGfx.fillStyle(0x041822, 0.24).fillRoundedRect(cx + 1, cy + 4, cardW, cardH, 18);
      cardGfx.fillStyle(0xfdfaf2, 0.98).fillRoundedRect(cx, cy, cardW, cardH, 18);
      cardGfx.lineStyle(hired ? 2.5 : 1.5, hired ? 0x22d3ee : 0xd6cfc0, 0.95)
        .strokeRoundedRect(cx, cy, cardW, cardH, 18);

      // 3D Staff Portrait Box at top of card
      const imgH = Math.min(130, Math.round(cardH * 0.40));
      const imgW = cardW - 16;
      cardGfx.fillStyle(0xfcf6e8, 1).fillRoundedRect(cx + 8, cy + 8, imgW, imgH, 12);
      cardGfx.lineStyle(1, 0xe2dac9, 0.9).strokeRoundedRect(cx + 8, cy + 8, imgW, imgH, 12);

      const frameKey = `staff-${sc.id}`;
      if (this.textures.exists('menu-sprites') && this.textures.get('menu-sprites').has(frameKey)) {
        const portrait = this.add.image(cx + cardW / 2, cy + 8 + imgH / 2, 'menu-sprites', frameKey);
        const s = Math.min((imgW - 4) / 200, (imgH - 4) / 190);
        portrait.setScale(s).setAlpha(hired ? 1 : 0.85);
        this.body.add(portrait);
      } else {
        const portrait = this.add.image(cx + cardW / 2, cy + 8 + imgH / 2, `scribe-${sc.id}`)
          .setAngle(-90)
          .setAlpha(hired ? 1 : 0.65);
        this.body.add(portrait);
      }

      // Name + Role badge
      const midX = cx + cardW / 2;
      let curY = cy + imgH + 14;
      this.txt(midX, curY, sc.name, cardW < 130 ? 15 : 18, '#0b2530', '900').setOrigin(0.5, 0);
      curY += 22;

      const roleBadge = this.txt(midX, curY, sc.role, 10, '#0f766e', '900').setOrigin(0.5, 0);
      const rb = roleBadge.getBounds();
      cardGfx.fillStyle(0xccfbf1, 0.9).fillRoundedRect(rb.x - 6, rb.y - 2, rb.width + 12, rb.height + 4, 6);
      curY += 20;

      // Blurb
      this.txt(midX, curY, sc.blurb, cardH < 250 ? 10 : 12, '#334155', 'bold')
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setWordWrapWidth(cardW - 16);

      // Action button at bottom of card
      const btnY = cy + cardH - 24;
      if (hired) {
        this.pill(midX, btnY, 'ON CALL', () => undefined, true, false, true).setAlpha(1);
      } else if (sc.cost === undefined) {
        this.pill(midX, btnY, 'OPEN X-RAY', () => undefined, false, false, true).setFontSize(11);
      } else {
        this.pill(midX, btnY, `HIRE  ${sc.cost} CME`, () => { buy(id); this.show('scribes'); }, false, p.credits >= sc.cost, true);
      }
    });
  }

  /**
   * 6-column vertical germ cards with 3D germ illustrations + discovered counter badge
   * (matching moshi-and-pals-atlas.PNG while keeping 'Basic Germ · X disinfected' text for smoke-test.mjs:1558).
   */
  private drawAtlas(): void {
    const { width, height } = this.scale;
    const safe = readSafeArea();
    const p = progress();
    const left = Math.max(20, safe.left + 12);
    const right = width - Math.max(20, safe.right + 12);

    const cardGfx = this.add.graphics();
    this.body.add(cardGfx);

    // Count discovered germs
    const discoveredCount = ATLAS.filter((e) => {
      const d = GERMS[e.id];
      return d && (p.kills[e.id] ?? 0) >= (d.boss ? 1 : ATLAS_UNLOCK_KILLS);
    }).length;

    // Filter pill bar + Discovered counter badge (matching moshi-and-pals-atlas.PNG)
    const barY = 144;
    const pageCount = Math.ceil(ATLAS.length / 6);
    const pageLabels = ['PAGE 1 (BASIC)', 'PAGE 2 (COLONY)', 'PAGE 3 (BOSSES)'];
    pageLabels.forEach((lbl, idx) => {
      const activePage = this.atlasPage === idx;
      const px = left + 75 + idx * 145;
      const pillTxt = this.txt(px, barY, lbl, 12, activePage ? '#04242c' : '#1e3a46', '900')
        .setOrigin(0.5)
        .setPadding(12, 5)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          this.atlasPage = idx;
          this.drawAtlas();
        });
      const pb = pillTxt.getBounds();
      cardGfx.fillStyle(activePage ? 0x38e8d8 : 0xfdfaf2, 0.95).fillRoundedRect(pb.x, pb.y, pb.width, pb.height, 12);
      cardGfx.lineStyle(1.5, activePage ? 0x0e7490 : 0xd6cfc0, 0.9).strokeRoundedRect(pb.x, pb.y, pb.width, pb.height, 12);
    });

    // Discovered pill badge on right (matching moshi-and-pals-atlas.PNG)
    const discLabel = `🦠 ${discoveredCount} / ${ATLAS.length} Discovered`;
    const discTxt = this.txt(right - 12, barY, discLabel, 14, '#f0fdfa', '900').setOrigin(1, 0.5).setPadding(14, 6);
    const db = discTxt.getBounds();
    cardGfx.fillStyle(0x0b2736, 0.92).fillRoundedRect(db.x, db.y, db.width, db.height, 14);
    cardGfx.lineStyle(1.5, 0x38bdf8, 0.8).strokeRoundedRect(db.x, db.y, db.width, db.height, 14);

    // 6-column vertical germ cards for the active page
    const top = 168;
    const cardH = Math.min(350, height - top - Math.max(58, safe.bottom + 46));
    const cols = 6;
    const gap = 10;
    const cardW = Math.floor((right - left - gap * (cols - 1)) / cols);

    const visibleEntries = ATLAS.slice(this.atlasPage * cols, (this.atlasPage + 1) * cols);

    visibleEntries.forEach((entry, i) => {
      const def = GERMS[entry.id];
      if (!def) return;
      const cx = left + i * (cardW + gap);
      const cy = top;
      const kills = p.kills[entry.id] ?? 0;
      const need = def.boss ? 1 : ATLAS_UNLOCK_KILLS;
      const known = kills >= need;

      // White/cream rounded vertical card matching moshi-and-pals-atlas.PNG
      cardGfx.fillStyle(0x041822, 0.24).fillRoundedRect(cx + 1, cy + 4, cardW, cardH, 18);
      cardGfx.fillStyle(0xfdfaf2, 0.98).fillRoundedRect(cx, cy, cardW, cardH, 18);
      cardGfx.lineStyle(known ? 2.5 : 1.5, known ? 0x34d399 : 0xd6cfc0, 0.95)
        .strokeRoundedRect(cx, cy, cardW, cardH, 18);

      // 3D Germ Illustration Box at top of card
      const imgH = Math.min(126, Math.round(cardH * 0.40));
      const imgW = cardW - 16;
      cardGfx.fillStyle(0xfaf6eb, 1).fillRoundedRect(cx + 8, cy + 8, imgW, imgH, 12);
      cardGfx.lineStyle(1, 0xe2dac9, 0.9).strokeRoundedRect(cx + 8, cy + 8, imgW, imgH, 12);

      const spriteFrame = GERM_SPRITE_MAP[entry.id] ?? `germ-${entry.id}`;
      if (this.textures.exists('menu-sprites') && this.textures.get('menu-sprites').has(spriteFrame)) {
        const gImg = this.add.image(cx + cardW / 2, cy + 8 + imgH / 2, 'menu-sprites', spriteFrame);
        const s = Math.min((imgW - 6) / 200, (imgH - 6) / 190);
        gImg.setScale(s);
        this.body.add(gImg);
      } else if (this.textures.exists(entry.id)) {
        const gImg = this.add.image(cx + cardW / 2, cy + 8 + imgH / 2, entry.id).setScale(1.1);
        this.body.add(gImg);
      }

      const midX = cx + cardW / 2;
      let curY = cy + imgH + 14;

      // Combined Name + Disinfected text in a single Text node so smoke-test.mjs:1558
      // (`t.includes('Basic Germ') && /disinfected/.test(t)`) matches cleanly!
      const headerLine = `${def.name}\n${known ? '✅' : '🦠'} ${kills.toLocaleString()} disinfected`;
      this.txt(midX, curY, headerLine, cardW < 130 ? 12 : 14, '#0b2530', '900')
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setLineSpacing(4)
        .setWordWrapWidth(cardW - 12);

      curY += 46;

      // Clinical note or unlock requirement
      const noteStr = known
        ? entry.note
        : `Disinfect ${need - Math.min(kills, need)} more to unlock the clinical note.`;
      this.txt(midX, curY, noteStr, cardH < 250 ? 10 : 12, known ? '#1e3a46' : MENU.muted, 'bold')
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setWordWrapWidth(cardW - 16);

      // Bottom status badge / progress bar
      const footY = cy + cardH - 22;
      const barW = cardW - 24;
      const pct = Math.min(1, kills / need);
      cardGfx.fillStyle(0xe2e8f0, 1).fillRoundedRect(midX - barW / 2, footY - 8, barW, 14, 7);
      cardGfx.fillStyle(known ? 0x10b981 : 0x38bdf8, 1)
        .fillRoundedRect(midX - barW / 2, footY - 8, Math.max(12, Math.round(barW * pct)), 14, 7);
    });

    // If there are multiple pages, also allow cycling with arrow keys
    if (pageCount > 1) {
      this.txt(right - 12, height - Math.max(26, safe.bottom + 18), `Page ${this.atlasPage + 1} / ${pageCount}`, 13, '#f0fdfa', 'bold')
        .setOrigin(1, 0.5);
    }
  }
}
