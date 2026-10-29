import Phaser from 'phaser';
import { MENU, menuButton } from '../ui/menuTheme';
import { renderMenuTopPanel, MenuHeaderComponents } from '../ui/menuHeader';
import { DISPLAY } from '../config/display';
import { COLORS } from '../config/theme';
import { applyUpdate, offerFilesToCache, onUpdateReady } from '../core/updates';
import { doctorUnlocked } from '../core/progress';
import { saveSettings, settings } from '../core/settings';
import { characterById } from '../data/characters';
import { readSafeArea } from '../core/safeArea';
import { chooseShift, dailyShift, localDate, savedDifficulty, savedMode } from '../core/shift';
import { savedShift } from '../core/shiftSave';
import { dailyBest } from '../core/save';
import { BALANCE } from '../config/balance';
import { DIFFICULTIES, difficultyById } from '../data/difficulties';
import { modifierById, type ModifierId } from '../data/modifiers';

const font = 'system-ui, -apple-system, sans-serif';

/**
 * "Tap to start" screen. Only explicit actions (NEW SHIFT or CONTINUE SHIFT)
 * start a shift, preventing accidental launches while navigating tabs.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  private art!: Phaser.GameObjects.Image;
  private bgArt!: Phaser.GameObjects.Image;
  private menuCards!: Phaser.GameObjects.Graphics;
  private tap!: Phaser.GameObjects.Text;
  private updatePill!: Phaser.GameObjects.Text;
  private boardButton!: Phaser.GameObjects.Text;
  private lockerButton!: Phaser.GameObjects.Text;
  private atlasButton!: Phaser.GameObjects.Text;
  private pickInfo!: Phaser.GameObjects.Text;
  public npsText!: Phaser.GameObjects.Text;
  private providersButton!: Phaser.GameObjects.Text;
  private leaderboardButton!: Phaser.GameObjects.Text;
  /** M17: TODAY'S SHIFT (opens the pre-shift panel), today's best beside it, and the difficulty switch. */
  private dailyButton!: Phaser.GameObjects.Text;
  private dailyBestText!: Phaser.GameObjects.Text;
  private difficultyButton!: Phaser.GameObjects.Text;
  private difficultyInfo!: Phaser.GameObjects.Text;
  private modeButton!: Phaser.GameObjects.Text;
  private modeInfo!: Phaser.GameObjects.Text;
  /** The pre-shift panel: today's two modifiers, the day's best, CLOCK IN / BACK. */
  private dailyPanel!: Phaser.GameObjects.Container;
  private panelDim!: Phaser.GameObjects.Rectangle;
  private panelCard!: Phaser.GameObjects.Graphics;
  private panelTexts: Phaser.GameObjects.Text[] = [];
  private panelButtons: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];

  private heading!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private wordmark!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Image;
  private started = false;
  /** CONTINUE SHIFT: shown when a shift was saved from the pause menu. */
  private continueButton!: Phaser.GameObjects.Text;
  private topHeader!: MenuHeaderComponents;

  create(): void {
    this.started = false;
    this.input.enabled = true;
    if (this.cameras?.main) {
      this.cameras.main.fadeIn(150, 0, 0, 0);
    }
    this.bgArt = this.add.image(0, 0, 'title-art').setOrigin(0.5, 0.5).setAlpha(0.55).setTint(0xaaccee);
    this.art = this.add.image(0, 0, 'title-art').setOrigin(0.5, 0.5);
    if (!settings.reducedMotion) this.tweens.add({ targets: this.art, alpha: { from: 0, to: 1 }, duration: 400 });
    this.menuCards = this.add.graphics();

    this.tap = this.add.text(0, 0, 'START SHIFT  →', {
      fontFamily: font, fontSize: '32px', fontStyle: '900',
      backgroundColor: '#7fffd4', color: '#0d2b2e', padding: { x: 28, y: 14 },
    }).setOrigin(0.5);
    if (!settings.reducedMotion) this.tweens.add({ targets: this.tap, alpha: 0.82, duration: 1100, yoyo: true, repeat: -1 });

    // A newer build is live: offer it (tapping here reloads instead of starting)
    this.updatePill = this.add.text(0, 0, '✨ UPDATE READY · TAP HERE TO GET IT', {
      fontFamily: font, fontSize: '20px', fontStyle: '900', color: '#0d2b2e', backgroundColor: '#ffe66d', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
    this.updatePill.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      applyUpdate();
    });
    const off = onUpdateReady(() => this.updatePill.setVisible(true));
    offerFilesToCache();
    navigator.serviceWorker?.ready.then(() => offerFilesToCache()).catch(() => undefined);
    this.events.once('shutdown', off);

    // CONTINUE SHIFT: pick a saved shift up again at the start of its round
    const saved = savedShift();
    const diffName = saved ? difficultyById(saved.shift.difficulty).name.toUpperCase() : '';
    const modeLabel = saved?.shift.mode === 'fluSeason' ? 'FLU SEASON' : saved?.shift.daily ? "TODAY'S SHIFT" : diffName;
    this.continueButton = this.add.text(0, 0, saved ? `▶ CONTINUE SHIFT · ROUND ${saved.round} · ${modeLabel}` : '', {
      fontFamily: font, fontSize: '22px', fontStyle: '900', color: '#0d2b2e', backgroundColor: '#7fffd4', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setVisible(!!saved).setInteractive({ useHandCursor: true });
    const onContinue = (e?: any) => {
      e?.stopPropagation?.();
      this.begin(undefined, true);
    };
    this.continueButton.on('pointerdown', (_p: any, _x: any, _y: any, e: any) => onContinue(e));
    this.continueButton.on('pointerup', (_p: any, _x: any, _y: any, e: any) => onContinue(e));

    // Render standardized top panel with all 5 tabs
    const buttonsOut: { [key: string]: Phaser.GameObjects.Text } = {};
    this.topHeader = renderMenuTopPanel(this, 'title', buttonsOut);
    this.portrait = this.topHeader.portrait;
    this.pickInfo = this.topHeader.pickInfo;
    this.npsText = this.topHeader.npsText;
    this.providersButton = buttonsOut['providersButton'];
    this.lockerButton = buttonsOut['lockerButton'];
    this.boardButton = buttonsOut['boardButton'];
    this.atlasButton = buttonsOut['atlasButton'];
    this.leaderboardButton = buttonsOut['leaderboardButton'];

    // TODAY'S SHIFT: the daily challenge, with today's best beside it
    this.dailyButton = this.add.text(0, 0, "📋 TODAY'S SHIFT", {
      fontFamily: font, fontSize: '18px', fontStyle: '900', color: '#0d2b2e', backgroundColor: '#ffe66d', padding: { x: 14, y: 9 },
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    this.dailyButton.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.openDaily();
    });
    this.dailyBestText = this.add.text(0, 0, '', {
      fontFamily: font, fontSize: '15px', fontStyle: 'bold', color: '#ffe66d', backgroundColor: '#0d2b2ecc', padding: { x: 8, y: 4 },
    }).setOrigin(0, 0.5);

    // Difficulty for normal shifts (saved); tap to cycle
    this.difficultyButton = this.add.text(0, 0, '', {
      fontFamily: font, fontSize: '18px', fontStyle: '900', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 14, y: 9 },
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    this.difficultyButton.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.cycleDifficulty();
    });
    this.difficultyInfo = this.add.text(0, 0, '', {
      fontFamily: font, fontSize: '15px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 8, y: 4 },
    }).setOrigin(0, 0.5);

    // Mode switch: standard vs endless flu season
    this.modeButton = this.add.text(0, 0, '', {
      fontFamily: font, fontSize: '18px', fontStyle: '900', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 14, y: 9 },
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    this.modeButton.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.cycleMode();
    });
    this.modeInfo = this.add.text(0, 0, '', {
      fontFamily: font, fontSize: '15px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 8, y: 4 },
    }).setOrigin(0, 0.5);

    this.showDifficulty();
    this.showMode();
    this.showDailyBest();
    this.buildDailyPanel();

    this.heading = this.add.text(0, 0, 'Moshi\nand Pals.', { fontFamily: MENU.font, fontSize: '66px', fontStyle: '900', color: MENU.ink, lineSpacing: -12 }).setVisible(false);
    this.subtitle = this.add.text(0, 0, 'A little chaos. A lot of care.', { fontFamily: MENU.font, fontSize: '21px', color: MENU.muted }).setVisible(false);
    this.wordmark = this.add.text(0, 0, 'Moshi and Pals', { fontFamily: MENU.font, fontSize: '24px', fontStyle: '900', color: MENU.ink }).setVisible(false);

    menuButton(this.tap, true).setInteractive({ useHandCursor: true });
    const onStart = (e?: any) => {
      e?.stopPropagation?.();
      this.begin();
    };
    this.tap.on('pointerdown', (_p: any, _x: any, _y: any, e: any) => onStart(e));
    this.tap.on('pointerup', (_p: any, _x: any, _y: any, e: any) => onStart(e));

    for (const b of [this.dailyButton, this.difficultyButton, this.modeButton, this.continueButton, this.updatePill]) menuButton(b);
    this.dailyButton.setText("TODAY'S SHIFT").setColor('#0d2b2e');
    this.modeButton.setColor('#e8fff9');
    this.difficultyButton.setColor('#e8fff9');
    this.dailyBestText.setColor('#ffe66d').setBackgroundColor('rgba(0,0,0,0)').setVisible(false);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.topHeader?.destroy();
    });

    this.input.keyboard?.once('keydown', () => (this.dailyPanel.visible ? this.begin(localDate()) : this.begin()));

    // Hit-forgiveness for buttons on touch, but background taps NEVER start the game
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.dailyPanel.visible) return;
      const buttons: Phaser.GameObjects.GameObject[] = [
        this.providersButton, this.leaderboardButton, this.updatePill, this.continueButton,
        this.boardButton, this.lockerButton, this.atlasButton, this.dailyButton, this.difficultyButton, this.modeButton,
        this.tap, this.portrait, this.pickInfo,
      ];
      if (buttons.some((b) => over.includes(b))) return;

      const hit = (buttons as (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[]).find(b => {
        if (!b?.visible) return false;
        const bounds = b.getBounds();
        return _p.x >= bounds.x - 16 && _p.x <= bounds.right + 16 &&
               _p.y >= bounds.y - 16 && _p.y <= bounds.bottom + 16;
      });
      if (hit) {
        hit.emit('pointerdown', _p, 0, 0, { stopPropagation() {} });
        return;
      }
      // Background taps do NOT call this.begin()
    });
  }

  /** Clean arcade layout with unobstructed full-poster artwork and tactile controls. */
  layout(): void {
    const { width: w, height: h } = this.scale;
    const safe = readSafeArea();
    const left = Math.max(20, safe.left + 14);

    const topBarH = 64;
    const bottomBarH = Math.min(130, Math.max(96, Math.round(h * 0.18)));
    const bottomBarY = h - bottomBarH;
    const availH = bottomBarY - topBarH;
    const centerY = topBarH + availH / 2;

    const bgK = Math.max(w / this.bgArt.width, h / this.bgArt.height);
    this.bgArt.setScale(bgK).setPosition(w / 2, h / 2);

    const k = Math.min(w / this.art.width, availH / this.art.height);
    this.art.setScale(k).setPosition(w / 2, centerY);

    this.menuCards.clear();
    // Bottom console shelf
    this.menuCards.fillStyle(0x06181b, 0.90).fillRect(0, bottomBarY, w, bottomBarH);
    this.menuCards.lineStyle(1.5, 0x1f4f55, 0.8).lineBetween(0, bottomBarY, w, bottomBarY);

    this.heading.setVisible(false);
    this.subtitle.setVisible(false);
    this.wordmark.setVisible(false);

    // Refresh selected character display
    const selected = characterById(doctorUnlocked(settings.character) ? settings.character : 'eugene');
    settings.character = selected.id;
    this.pickInfo.setText(selected.name);
    this.portrait.setFrame(selected.id);

    // Call header layout
    this.topHeader.layout();

    // Bottom controls
    const yHero = bottomBarY + bottomBarH * 0.36;
    const ySec = bottomBarY + bottomBarH * 0.77;

    if (this.continueButton.visible) {
      this.continueButton.setOrigin(0.5).setPosition(w / 2 - 140, yHero).setFontSize(18).setPadding(18, 10);
      this.tap.setText('NEW SHIFT  →').setOrigin(0.5).setPosition(w / 2 + 140, yHero).setFontSize(18).setPadding(18, 10);
    } else {
      this.tap.setText('START SHIFT  →').setOrigin(0.5).setPosition(w / 2, yHero).setFontSize(22).setPadding(28, 12);
    }

    const secSpacing = Math.min(240, (w - left * 2) / 3.4);
    this.modeButton.setOrigin(0.5).setPosition(w / 2 - secSpacing, ySec).setFontSize(15).setPadding(14, 7);
    this.difficultyButton.setOrigin(0.5).setPosition(w / 2, ySec).setFontSize(15).setPadding(14, 7);
    this.dailyButton.setOrigin(0.5).setPosition(w / 2 + secSpacing, ySec).setFontSize(15).setPadding(14, 7);
    this.modeInfo.setVisible(false);
    this.difficultyInfo.setVisible(false);
    this.dailyBestText.setVisible(false);
    this.updatePill.setOrigin(0.5).setPosition(w / 2, 76).setFontSize(15);

    // Style bottom buttons with tactile depth
    for (const b of [this.tap, this.modeButton, this.difficultyButton, this.dailyButton, this.continueButton]) {
      b.setBackgroundColor('rgba(0,0,0,0)');
      if (!b.visible) continue;
      const box = b.getBounds();
      b.input?.hitArea?.setTo?.(-8, -8, box.width + 16, box.height + 16);
      const isPrimary = b === this.tap || (b === this.continueButton && this.continueButton.visible);
      const isDaily = b === this.dailyButton;
      const radius = isPrimary ? 18 : 12;

      this.menuCards.fillStyle(0x000000, isPrimary ? 0.25 : 0.15)
        .fillRoundedRect(box.x, box.y + (isPrimary ? 3 : 2), box.width, box.height, radius);

      if (isPrimary) {
        this.menuCards.fillStyle(0x147a62, 1).fillRoundedRect(box.x, box.y + 2, box.width, box.height, radius);
      } else if (isDaily) {
        this.menuCards.fillStyle(0x8a6d00, 1).fillRoundedRect(box.x, box.y + 2, box.width, box.height, radius);
      } else {
        this.menuCards.fillStyle(0x163f45, 1).fillRoundedRect(box.x, box.y + 1, box.width, box.height, radius);
      }

      const faceColor = isPrimary ? 0x80eac8 : isDaily ? 0xffe66d : 0x1f4f55;
      this.menuCards.fillStyle(faceColor, 1)
        .fillRoundedRect(box.x, box.y, box.width, box.height - (isPrimary ? 2 : 1), radius);

      const strokeColor = isPrimary ? 0x4db896 : isDaily ? 0xffd166 : 0x3da896;
      this.menuCards.lineStyle(1.5, strokeColor, 0.9)
        .strokeRoundedRect(box.x, box.y, box.width, box.height - (isPrimary ? 2 : 1), radius);

      if (isPrimary) {
        this.menuCards.lineStyle(1, 0xffffff, 0.5)
          .beginPath()
          .moveTo(box.x + radius, box.y + 1)
          .lineTo(box.x + box.width - radius, box.y + 1)
          .strokePath();
      }
    }
    this.layoutDailyPanel();
  }

  /** The difficulty switch shows the saved one. */
  private showDifficulty(): void {
    const d = difficultyById(savedDifficulty());
    this.difficultyButton.setText(`${d.name.toUpperCase()} ▾`);
    this.difficultyInfo.setText(d.blurb);
  }

  /** The mode switch shows standard or fluSeason. */
  private showMode(): void {
    const isFlu = savedMode() === 'fluSeason';
    this.modeButton.setText(isFlu ? 'FLU SEASON ▾' : 'STANDARD ▾');
    this.modeInfo.setText(isFlu ? 'Endless outbreak' : 'Scheduled breaks');
  }


  private cycleMode(): void {
    settings.mode = settings.mode === 'fluSeason' ? 'standard' : 'fluSeason';
    saveSettings();
    this.showMode();
    this.layout();
  }

  /** Walk-In → Urgent → Trauma Center → Walk-In (saved for next time). */
  private cycleDifficulty(): void {
    const i = DIFFICULTIES.findIndex((d) => d.id === savedDifficulty());
    settings.difficulty = DIFFICULTIES[(i + 1) % DIFFICULTIES.length].id;
    saveSettings();
    this.showDifficulty();
    this.layout();
  }

  private showDailyBest(): void {
    const best = dailyBest(localDate());
    this.dailyBestText.setText(best.finished ? `Today's best: ${best.bestScore.toLocaleString()}` : `New today · +${BALANCE.daily.firstFinishCme} CME`);
  }

  /** Today's two modifiers for a date (the same every time for the same date). */
  dailyFor(date: string): ModifierId[] {
    return dailyShift(date).mods;
  }

  /** The pre-shift panel for TODAY'S SHIFT. */
  private buildDailyPanel(): void {
    this.panelDim = this.add.rectangle(0, 0, 10, 10, 0x061416, 0.82).setOrigin(0).setInteractive();
    this.panelCard = this.add.graphics();
    const text = (size: number, color: string, style = 'bold') => this.add.text(0, 0, '', {
      fontFamily: font, fontSize: `${size}px`, fontStyle: style, color, align: 'center',
    }).setOrigin(0.5, 0);
    // title, date line, mod 1 name, mod 1 blurb, mod 2 name, mod 2 blurb, the day's best
    this.panelTexts = [text(38, '#ffe66d', '900'), text(17, COLORS.uiText), text(26, COLORS.uiText, '900'), text(18, '#b8d8d2'),
      text(26, COLORS.uiText, '900'), text(18, '#b8d8d2'), text(17, '#ffe66d')];
    const button = (label: string, color: number, onTap: () => void) => {
      const bg = this.add.rectangle(0, 0, 10, 64, color).setStrokeStyle(3, 0xe8fff9, 0.9).setInteractive({ useHandCursor: true });
      const t = this.add.text(0, 0, label, { fontFamily: font, fontSize: '26px', fontStyle: '900', color: COLORS.uiText }).setOrigin(0.5);
      bg.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        bg.setScale(0.95);
      });
      bg.on('pointerout', () => bg.setScale(1));
      bg.on('pointerup', () => {
        bg.setScale(1);
        onTap();
      });
      return { bg, label: t };
    };
    this.panelButtons = [
      button('CLOCK IN', 0x2a9d8f, () => this.begin(localDate())),
      button('BACK', 0x3f5f66, () => this.dailyPanel.setVisible(false)),
    ];
    this.dailyPanel = this.add.container(0, 0, [
      this.panelDim, this.panelCard, ...this.panelTexts, ...this.panelButtons.flatMap((b) => [b.bg, b.label]),
    ]).setDepth(50).setVisible(false);
  }

  /** Opens the pre-shift panel with today's modifiers. */
  private openDaily(): void {
    const date = localDate();
    const shift = dailyShift(date);
    const best = dailyBest(date);
    const [y, m, d] = date.split('-').map(Number);
    const day = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const mods = shift.mods.map((id) => modifierById(id)!);
    const t = this.panelTexts;
    t[0].setText("📋 TODAY'S SHIFT");
    t[1].setText(`${day.toUpperCase()}  ·  URGENT  ·  Everyone works the same shift today`);
    mods.forEach((mod, i) => {
      t[2 + i * 2].setText(`${mod.icon}  ${mod.name.toUpperCase()}`);
      t[3 + i * 2].setText(mod.blurb);
    });
    t[6].setText(best.finished
      ? `Today's best: ${best.bestScore.toLocaleString()} pts (round ${best.bestRound})  ·  ${best.finished} shift${best.finished === 1 ? '' : 's'} today`
      : `Not worked yet today. Your first finished shift earns +${BALANCE.daily.firstFinishCme} CME.`);
    this.layoutDailyPanel();
    this.dailyPanel.setVisible(true);
  }

  private layoutDailyPanel(): void {
    if (!this.dailyPanel) return;
    const { width, height } = this.scale;
    this.panelDim.setSize(width, height);
    this.panelDim.input?.hitArea.setSize(width, height);
    const cw = Math.min(860, width - 60);
    const ch = Math.min(470, height - 40);
    const cx = width / 2 - cw / 2;
    const cy = height / 2 - ch / 2;
    this.panelCard.clear()
      .fillStyle(0x000000, 0.4).fillRoundedRect(cx + 6, cy + 8, cw, ch, 18)
      .fillStyle(0x0d2b2e, 1).fillRoundedRect(cx, cy, cw, ch, 18)
      .lineStyle(4, 0xffe66d, 0.9).strokeRoundedRect(cx, cy, cw, ch, 18);
    const ys = [22, 72, 118, 154, 200, 236, 294];
    this.panelTexts.forEach((t, i) => t.setPosition(width / 2, cy + ys[i]).setWordWrapWidth(cw - 40));
    const by = cy + ch - 56;
    const [go, back] = this.panelButtons;
    go.bg.setSize(300, 64).setPosition(width / 2 - 100, by);
    go.bg.input?.hitArea.setSize(300, 64);
    go.label.setPosition(width / 2 - 100, by);
    back.bg.setSize(170, 64).setPosition(width / 2 + 150, by);
    back.bg.input?.hitArea.setSize(170, 64);
    back.label.setPosition(width / 2 + 150, by);
  }

  /** Starts a shift: a normal one, TODAY'S SHIFT for `daily` (a date), or the saved one (`resume`). */
  private begin(daily?: string, resume = false): void {
    if (this.started) return;
    this.started = true;
    // (A continued Today's Shift stays one for PLAY AGAIN)
    const mode = resume ? savedShift()?.shift.mode : (daily ? undefined : (savedMode() === 'fluSeason' ? 'fluSeason' : undefined));
    chooseShift(resume ? savedShift()?.shift.daily : daily, mode);
    // Fade to black, then the clinic fades in from black (GameScene/HudScene.create)
    this.input.enabled = false;
    this.cameras.main.fadeOut(DISPLAY.fadeOutMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game', { resume }));
  }
}
