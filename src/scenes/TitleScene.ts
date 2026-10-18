import Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { COLORS } from '../config/theme';
import { applyUpdate, offerFilesToCache, onUpdateReady } from '../core/updates';
import { progress } from '../core/progress';
import { saveSettings, settings } from '../core/settings';
import { CHARACTERS, characterById } from '../data/characters';
import { readSafeArea } from '../core/safeArea';
import { chooseShift, dailyShift, localDate, savedDifficulty } from '../core/shift';
import { dailyBest } from '../core/save';
import { BALANCE } from '../config/balance';
import { DIFFICULTIES, difficultyById } from '../data/difficulties';
import { modifierById, type ModifierId } from '../data/modifiers';

const font = 'system-ui, -apple-system, sans-serif';

/**
 * "Tap to start" screen. The tap also matters technically: iPhones only allow
 * game audio after the player has touched the screen once.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  private art!: Phaser.GameObjects.Image;
  private tap!: Phaser.GameObjects.Text;
  private updatePill!: Phaser.GameObjects.Text;
  private boardButton!: Phaser.GameObjects.Text;
  /** WHO'S ON SHIFT: a portrait per doctor, and a line about the chosen one. */
  private picks: { id: string; ring: Phaser.GameObjects.Arc; art: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text }[] = [];
  private pickInfo!: Phaser.GameObjects.Text;
  /** M17: TODAY'S SHIFT (opens the pre-shift panel), today's best beside it, and the difficulty switch. */
  private dailyButton!: Phaser.GameObjects.Text;
  private dailyBestText!: Phaser.GameObjects.Text;
  private difficultyButton!: Phaser.GameObjects.Text;
  private difficultyInfo!: Phaser.GameObjects.Text;
  /** The pre-shift panel: today's two modifiers, the day's best, CLOCK IN / BACK. */
  private dailyPanel!: Phaser.GameObjects.Container;
  private panelDim!: Phaser.GameObjects.Rectangle;
  private panelCard!: Phaser.GameObjects.Graphics;
  private panelTexts: Phaser.GameObjects.Text[] = [];
  private panelButtons: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];

  private started = false;

  create(): void {
    this.started = false;
    this.input.enabled = true;
    this.art = this.add.image(0, 0, 'title-art').setOrigin(0.5, 0);
    this.tweens.add({ targets: this.art, alpha: { from: 0, to: 1 }, duration: 400 });

    this.tap = this.add.text(0, 0, 'TAP TO START', {
      fontFamily: font, fontSize: '40px', fontStyle: '900', color: COLORS.uiText,
      backgroundColor: '#0d2b2ecc', padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setShadow(0, 3, '#000', 6);
    this.tweens.add({ targets: this.tap, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    // A newer build is live: offer it (tapping here reloads instead of starting)
    this.updatePill = this.add.text(0, 0, '✨ UPDATE READY · TAP HERE TO GET IT', {
      fontFamily: font, fontSize: '22px', fontStyle: '900', color: '#0d2b2e', backgroundColor: '#ffe66d', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
    this.updatePill.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      applyUpdate();
    });
    const off = onUpdateReady(() => this.updatePill.setVisible(true));
    // Everything's loaded by now: let the offline cache have it
    offerFilesToCache();
    navigator.serviceWorker?.ready.then(() => offerFilesToCache()).catch(() => undefined);
    this.events.once('shutdown', off);

    // The Residency Board: spend CME Credits between shifts
    this.boardButton = this.add.text(0, 0, `🎓 RESIDENCY BOARD · ${progress().credits} CME`, {
      fontFamily: font, fontSize: '20px', fontStyle: '900', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 14, y: 9 },
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    this.boardButton.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.started = true;
      this.scene.start('Board');
    });

    // Who's on shift
    this.picks = CHARACTERS.map((c) => {
      const ring = this.add.circle(0, 0, 40, 0x0d2b2e, 0.85).setStrokeStyle(4, 0xe8fff9, 0.5).setInteractive({ useHandCursor: true });
      const art = this.add.image(0, 0, c.id).setAngle(-90).setScale(0.85);
      const name = this.add.text(0, 0, c.short, {
        fontFamily: font, fontSize: '14px', fontStyle: '900', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 6, y: 2 },
      }).setOrigin(0.5, 0);
      ring.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.pick(c.id);
      });
      return { id: c.id, ring, art, name };
    });
    this.pickInfo = this.add.text(0, 0, '', {
      fontFamily: font, fontSize: '15px', fontStyle: 'bold', color: '#ffe66d', backgroundColor: '#0d2b2ecc', padding: { x: 8, y: 4 },
    }).setOrigin(1, 1);
    this.pick(settings.character);

    // TODAY'S SHIFT: the daily challenge, with today's best beside it
    this.dailyButton = this.add.text(0, 0, "📋 TODAY'S SHIFT", {
      fontFamily: font, fontSize: '20px', fontStyle: '900', color: '#0d2b2e', backgroundColor: '#ffe66d', padding: { x: 14, y: 9 },
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
      fontFamily: font, fontSize: '20px', fontStyle: '900', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 14, y: 9 },
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    this.difficultyButton.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.cycleDifficulty();
    });
    this.difficultyInfo = this.add.text(0, 0, '', {
      fontFamily: font, fontSize: '15px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 8, y: 4 },
    }).setOrigin(0, 0.5);
    this.showDifficulty();
    this.showDailyBest();
    this.buildDailyPanel();

    // The screen's shape can change after load (rotating, Safari's toolbars), so re-fit whenever it does
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    this.input.keyboard?.once('keydown', () => (this.dailyPanel.visible ? this.begin(localDate()) : this.begin()));
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.dailyPanel.visible) return;
      const buttons: Phaser.GameObjects.GameObject[] = [this.updatePill, this.boardButton, this.dailyButton, this.difficultyButton];
      if (!buttons.some((b) => over.includes(b)) && !this.picks.some((p) => over.includes(p.ring))) this.begin();
    });
  }

  /** Noah's poster covers the screen. Wide phones crop it, mostly from the bottom, so the logo stays in view. */
  private layout(): void {
    const { width, height } = this.scale;
    const art = this.art;
    const k = Math.max(width / art.width, height / art.height);
    const spare = art.height - height / k; // image rows that don't fit
    art.setScale(k).setPosition(width / 2, -Math.min(spare, 30) * k);
    this.tap.setPosition(width / 2, height * 0.92);
    this.updatePill.setPosition(width / 2, height * 0.8);
    // The left-hand column: difficulty, Today's Shift, the board (clear of the notch)
    const left = Math.max(24, readSafeArea().left + 16);
    this.boardButton.setPosition(left, height - 20);
    this.dailyButton.setPosition(left, height - 78);
    this.dailyBestText.setPosition(left + this.dailyButton.width + 10, height - 78 - this.dailyButton.height / 2);
    this.difficultyButton.setPosition(left, height - 136);
    this.difficultyInfo.setPosition(left + this.difficultyButton.width + 10, height - 136 - this.difficultyButton.height / 2);
    this.layoutDailyPanel();
    this.picks.forEach((p, i) => {
      const x = width - 70 - (this.picks.length - 1 - i) * 112;
      const y = height - 92;
      p.ring.setPosition(x, y);
      p.art.setPosition(x, y + 4);
      p.name.setPosition(x, y + 44);
    });
    this.pickInfo.setPosition(width - 20, height - 150);
  }

  /** Chooses who's on shift (saved for next time). */
  private pick(id: string): void {
    const c = characterById(id);
    settings.character = c.id;
    saveSettings();
    for (const p of this.picks) {
      const on = p.id === c.id;
      p.ring.setStrokeStyle(on ? 5 : 3, on ? 0xffe66d : 0xe8fff9, on ? 1 : 0.4);
      p.art.setAlpha(on ? 1 : 0.6);
      p.name.setColor(on ? '#ffe66d' : COLORS.uiText);
    }
    this.pickInfo?.setText(`${c.name.toUpperCase()} · ${c.blurb}`);
  }

  /** The difficulty switch shows the saved one. */
  private showDifficulty(): void {
    const d = difficultyById(savedDifficulty());
    this.difficultyButton.setText(`🩺 ${d.name.toUpperCase()} ▸`);
    this.difficultyInfo.setText(d.blurb);
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

  /** Starts a shift: a normal one, or TODAY'S SHIFT for `daily` (a date). */
  private begin(daily?: string): void {
    if (this.started) return;
    this.started = true;
    chooseShift(daily);
    // Fade to black, then the clinic fades in from black (GameScene/HudScene.create)
    this.input.enabled = false;
    this.cameras.main.fadeOut(DISPLAY.fadeOutMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game'));
  }
}
