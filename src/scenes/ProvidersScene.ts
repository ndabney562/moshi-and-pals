import Phaser from 'phaser';
import { MENU, renderMenuBackground, queueMenuArt } from '../ui/menuTheme';
import { readSafeArea } from '../core/safeArea';
import { CHARACTERS } from '../data/characters';
import { buySecond, doctorUnlocked, hireDoctor, progress, secondUnlocked } from '../core/progress';
import { settings, saveSettings } from '../core/settings';
import { transitionTo, renderMenuTopPanel, renderBackButton, MenuHeaderComponents } from '../ui/menuHeader';

/** Providers showcase with glowing hallway pedestals and cyan-bordered bio card (matching moshi-and-pals-providers.PNG). */
export class ProvidersScene extends Phaser.Scene {
  private index = 0;
  private confirming = '';
  private content?: Phaser.GameObjects.Container;
  private topHeader?: MenuHeaderComponents;
  constructor() { super('Providers'); }

  preload(): void {
    queueMenuArt(this);
  }

  create(): void {
    if (this.cameras?.main) {
      this.cameras.main.fadeIn(150, 0, 0, 0);
    }
    renderMenuBackground(this, 'bg-providers');
    this.index = Math.max(0, CHARACTERS.findIndex(c => c.id === settings.character));
    this.confirming = '';
    this.draw();
    this.scale.on('resize', this.draw, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.draw, this);
      this.topHeader?.destroy();
    });
    this.input.keyboard?.on('keydown-ESC', () => transitionTo(this, 'Title'));
    this.input.keyboard?.on('keydown-RIGHT', () => this.next(1));
    this.input.keyboard?.on('keydown-LEFT', () => this.next(-1));
  }

  next(direction: number): void {
    this.index = (this.index + direction + CHARACTERS.length) % CHARACTERS.length;
    this.confirming = '';
    this.draw();
  }

  select(): void {
    const c = CHARACTERS[this.index];
    if (!doctorUnlocked(c.id)) {
      if (this.confirming !== `hire:${c.id}`) {
        this.confirming = `hire:${c.id}`;
        this.draw();
        return;
      }
      if (!hireDoctor(c.id)) return;
    }
    settings.character = c.id;
    saveSettings();
    this.confirming = '';
    this.draw();
  }

  unlockSecond(): void {
    const c = CHARACTERS[this.index];
    if (!c.second || secondUnlocked(c.id) || !doctorUnlocked(c.id)) return;
    if (this.confirming !== `second:${c.id}`) {
      this.confirming = `second:${c.id}`;
      this.draw();
      return;
    }
    buySecond(c.id);
    this.confirming = '';
    this.draw();
  }

  private draw(): void {
    this.topHeader?.destroy();
    this.content?.destroy(true);
    const { width: w, height: h } = this.scale;
    const safe = readSafeArea();
    const left = Math.max(28, safe.left + 16);
    const right = w - Math.max(28, safe.right + 16);
    const c = CHARACTERS[this.index];
    const owned = doctorUnlocked(c.id);
    const items: Phaser.GameObjects.GameObject[] = [];

    const panels = this.add.graphics();
    items.push(panels);

    const text = (x: number, y: number, label: string, size = 22, color = MENU.ink, wrapW = (right - left) * 0.44) => {
      const t = this.add.text(x, y, label, {
        fontFamily: MENU.font,
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        wordWrap: { width: wrapW },
      }).setOrigin(0, 0.5);
      items.push(t);
      return t;
    };

    const button = (x: number, y: number, label: string, action: () => void, primary = false, circular = false) => {
      const t = text(x, y, label, circular ? 20 : 17, primary ? '#04242c' : '#123740')
        .setOrigin(circular ? 0.5 : 0, 0.5)
        .setPadding(circular ? 14 : 18, circular ? 12 : 12)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', action);
      const b = t.getBounds();
      const radius = circular ? Math.round(b.height / 2) : 16;
      panels.fillStyle(0x03131a, primary ? 0.28 : 0.16).fillRoundedRect(b.x, b.y + 3, b.width, b.height, radius);
      panels.fillStyle(primary ? 0x0e7490 : 0xcbc4b4, 1).fillRoundedRect(b.x, b.y + 2, b.width, b.height, radius);
      panels.fillStyle(primary ? 0x38e8d8 : 0xfbf7ee, 1).fillRoundedRect(b.x, b.y, b.width, b.height - 2, radius);
      panels.lineStyle(2, primary ? 0xa5f3fc : 0xd6cfc0, 0.95).strokeRoundedRect(b.x, b.y, b.width, b.height - 2, radius);
      return t;
    };

    // Standardized Top Panel: Single active tab badge '👥 PROVIDERS'
    this.topHeader = renderMenuTopPanel(this, 'providers');

    // Screen Title Banner (top-left, matching moshi-and-pals-providers.PNG)
    text(left + 6, 82, '🩺 Providers', 28, '#0b2530');
    text(left + 12, 110, 'Meet your next shift.', 15, '#2b4c59');

    // Vertical layout: Upper pedestal carousel + Lower cyan-bordered bio card
    const pedestalTop = 128;
    const availH = h - pedestalTop - Math.max(60, safe.bottom + 48);
    const carouselH = Math.min(220, Math.max(125, Math.round(availH * 0.40)));
    const bioTop = pedestalTop + carouselH + 10;
    const bioH = Math.min(310, Math.max(195, availH - carouselH - 12));

    // Bottom Bio Card (white/cream rounded card with glowing cyan border)
    const cardW = right - left;
    panels.fillStyle(0x041822, 0.28).fillRoundedRect(left + 2, bioTop + 5, cardW, bioH, 24);
    panels.fillStyle(0xfdfaf2, 0.97).fillRoundedRect(left, bioTop, cardW, bioH, 24);
    panels.lineStyle(2.5, 0x38bdf8, 0.9).strokeRoundedRect(left, bioTop, cardW, bioH, 24);

    // IMPORTANT FOR TESTS (menu-design.spec.ts:129):
    // The first Image in `this.content.list` MUST be the selected provider's portrait (`c.id`).
    const portraitH = Math.min(230, Math.round(bioH * 0.82));
    const portraitW = Math.round(portraitH * 0.78);
    const px = left + Math.max(95, portraitW * 0.62);
    const py = bioTop + bioH / 2;
    panels.fillStyle(0xe8f4f8, 1).fillRoundedRect(px - portraitW / 2 - 4, py - portraitH / 2 - 4, portraitW + 8, portraitH + 8, 18);
    panels.lineStyle(2, 0x38bdf8, 0.75).strokeRoundedRect(px - portraitW / 2 - 4, py - portraitH / 2 - 4, portraitW + 8, portraitH + 8, 18);
    const mainPortrait = this.add.image(px, py, 'provider-portraits', c.id).setDisplaySize(portraitW, portraitH);
    items.push(mainPortrait);

    // Pedestal Carousel Lineup (upper-middle hallway)
    const count = 6;
    const first = Math.floor(this.index / count) * count;
    const slotW = Math.min(148, (cardW - 140) / count);
    const stripW = count * slotW;
    const stripStartX = w / 2 - stripW / 2;
    const pedestalBaseY = pedestalTop + carouselH - 26;

    for (let i = first; i < Math.min(first + count, CHARACTERS.length); i++) {
      const def = CHARACTERS[i];
      const isSelected = i === this.index;
      const cx = stripStartX + (i - first + 0.5) * slotW;
      const tileW = slotW - 10;
      const tileH = carouselH - 12;

      if (isSelected) {
        // Spotlight beam + glowing cyan pedestal
        panels.fillStyle(0x38bdf8, 0.16).fillRoundedRect(cx - tileW * 0.48, pedestalTop + 2, tileW * 0.96, tileH - 6, 20);
        panels.lineStyle(2, 0x38bdf8, 0.75).strokeRoundedRect(cx - tileW * 0.48, pedestalTop + 2, tileW * 0.96, tileH - 6, 20);
      }

      // Pedestal disc at character's feet
      const discW = isSelected ? tileW * 0.86 : tileW * 0.72;
      const discH = isSelected ? 22 : 16;
      panels.fillStyle(0x06202c, 0.55).fillEllipse(cx, pedestalBaseY + 5, discW, discH);
      panels.fillStyle(isSelected ? 0x22d3ee : 0x164e63, 0.92).fillEllipse(cx, pedestalBaseY, discW, discH);
      panels.lineStyle(isSelected ? 2.5 : 1.5, isSelected ? 0xa5f3fc : 0x38bdf8, 0.9).strokeEllipse(cx, pedestalBaseY, discW, discH);

      // Interactive Rectangle hit area (first 6 interactive Rectangles in content.list correspond to indices 0..5)
      const hit = this.add.rectangle(cx, pedestalTop + carouselH / 2, tileW, tileH, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        this.index = i;
        this.confirming = '';
        this.draw();
      });
      items.push(hit);

      // Character figure card standing on pedestal
      const charH = isSelected ? Math.min(144, carouselH - 36) : Math.min(114, carouselH - 54);
      const charW = Math.round(charH * 0.78);
      const charY = pedestalBaseY - charH * 0.5 - 8;
      panels.fillStyle(0xfaf5eb, 1).fillRoundedRect(cx - charW / 2 - 3, charY - charH / 2 - 3, charW + 6, charH + 6, 14);
      panels.lineStyle(isSelected ? 2.5 : 1.5, isSelected ? 0x22d3ee : 0xcbd5e1, 0.95)
        .strokeRoundedRect(cx - charW / 2 - 3, charY - charH / 2 - 3, charW + 6, charH + 6, 14);
      const art = this.add.image(cx, charY, 'provider-portraits', def.id).setDisplaySize(charW, charH);
      if (!doctorUnlocked(def.id) && !isSelected) {
        art.setTint(0xcbd5e1);
      }
      items.push(art);

      // Nameplate pill on pedestal
      const plateW = Math.min(tileW - 4, Math.max(68, def.short.length * 9 + 18));
      const plateY = pedestalBaseY + 1;
      panels.fillStyle(isSelected ? 0x083344 : 0x0f2936, 0.96).fillRoundedRect(cx - plateW / 2, plateY - 10, plateW, 20, 8);
      panels.lineStyle(1.5, isSelected ? 0x67e8f9 : 0x38bdf8, 0.85).strokeRoundedRect(cx - plateW / 2, plateY - 10, plateW, 20, 8);
      text(cx, plateY, def.short, isSelected ? 12 : 11, isSelected ? '#67e8f9' : '#f0fdfa').setOrigin(0.5);
    }

    // Left / Right circular carousel buttons
    button(left + 26, pedestalTop + carouselH / 2, '◀', () => this.next(-1), false, true);
    button(right - 26, pedestalTop + carouselH / 2, '▶', () => this.next(1), false, true);

    // Pagination dots under pedestals
    const dotY = bioTop - 6;
    const dotSpacing = 12;
    const dotsStartX = w / 2 - ((CHARACTERS.length - 1) * dotSpacing) / 2;
    for (let i = 0; i < CHARACTERS.length; i++) {
      const activeDot = i === this.index;
      panels.fillStyle(activeDot ? 0x22d3ee : 0x94a3b8, activeDot ? 1 : 0.55)
        .fillCircle(dotsStartX + i * dotSpacing, dotY, activeDot ? 4 : 3);
    }

    // Bio Card Center Column: Name (38px required by test), Status, Signature & Stats
    const infoX = px + portraitW / 2 + 24;
    const rightColW = Math.min(310, Math.round(cardW * 0.33));
    const infoWrapW = Math.max(220, right - rightColW - infoX - 24);

    // Name (strictly 38px for menu-design.spec.ts:132)
    const nameText = text(infoX, bioTop + 34, c.name, 38, '#0b2530', infoWrapW);

    // Status pill beside name
    const statusLabel = `${this.index + 1} / ${CHARACTERS.length} · ${settings.character === c.id ? 'ON SHIFT' : owned ? 'AVAILABLE' : 'LOCKED'}`;
    const badgeX = Math.min(right - rightColW - 150, infoX + nameText.width + 16);
    const statusText = text(badgeX, bioTop + 34, statusLabel, 13, owned ? '#065f46' : '#92400e');
    const sb = statusText.getBounds();
    panels.fillStyle(owned ? 0xd1fae5 : 0xfef3c7, 1).fillRoundedRect(sb.x - 8, sb.y - 4, sb.width + 16, sb.height + 8, 10);
    panels.lineStyle(1, owned ? 0x34d399 : 0xf59e0b, 0.8).strokeRoundedRect(sb.x - 8, sb.y - 4, sb.width + 16, sb.height + 8, 10);

    // Blurb / signature perks
    text(infoX, bioTop + 88, `⚡ ${c.blurb}`, 16, '#1e3a46', infoWrapW).setLineSpacing(3);
    text(infoX, bioTop + 138, `👥 Helper output ×${c.helperDamage}`, 16, MENU.teal, infoWrapW);
    text(
      infoX,
      bioTop + 172,
      c.second ? `SECOND SPECIAL · ${c.second.name}` : 'Second special coming in a future update',
      15,
      MENU.amber,
      infoWrapW
    );

    // Bio Card Right Column: Action sub-cards & Hire / Select / Second Special buttons
    const actionX = right - rightColW - 12;
    panels.fillStyle(0xf4efe4, 0.95).fillRoundedRect(actionX - 10, bioTop + 16, rightColW, bioH - 32, 18);
    panels.lineStyle(1.5, 0xd8d0c0, 0.9).strokeRoundedRect(actionX - 10, bioTop + 16, rightColW, bioH - 32, 18);

    const hire = owned
      ? (settings.character === c.id ? 'SELECTED FOR SHIFT' : 'SELECT FOR SHIFT')
      : `${this.confirming === `hire:${c.id}` ? 'CONFIRM HIRE' : 'HIRE'} · ${c.price.toLocaleString()} NPS`;

    const hireBtn = button(actionX + 6, bioTop + (c.second ? 68 : bioH / 2), hire, () => this.select(), true);
    hireBtn.setAlpha(owned || progress().nps >= c.price ? 1 : 0.5);

    if (c.second) {
      const secLabel = secondUnlocked(c.id)
        ? 'SECOND UNLOCKED'
        : `${this.confirming === `second:${c.id}` ? 'CONFIRM' : 'UNLOCK SECOND'} · ${c.second.price.toLocaleString()} NPS`;
      const secBtn = button(actionX + 6, bioTop + 142, secLabel, () => this.unlockSecond(), false);
      secBtn.setAlpha((owned && progress().nps >= c.second.price) || secondUnlocked(c.id) ? 1 : 0.5);
    }

    // Standardized BACK button in bottom left (keep pillBg behind backBtn inside content container)
    const backBtn = renderBackButton(this, () => transitionTo(this, 'Title'));
    const pillBg = (backBtn as any).__pillBg as Phaser.GameObjects.Graphics | undefined;
    if (pillBg) items.push(pillBg);
    items.push(backBtn);

    this.content = this.add.container(0, 0, items);
  }
}
