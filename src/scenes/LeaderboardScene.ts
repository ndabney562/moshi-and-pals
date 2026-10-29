import Phaser from 'phaser';
import { toTitle } from '../core/native';
import { transitionTo, renderMenuTopPanel, renderBackButton, MenuHeaderComponents } from '../ui/menuHeader';
import { COLORS as GAME_COLORS } from '../config/theme';
import { MENU, renderMenuBackground, restartOnMenuResize } from '../ui/menuTheme';
const COLORS = { ...GAME_COLORS, uiText: MENU.ink, uiAccent: MENU.teal };
import type { ShiftMode } from '../core/shift';
import type { DifficultyId } from '../data/difficulties';
import { DIFFICULTIES } from '../data/difficulties';
import { fetchOnlineLeaderboard, getSavedPlayerName, savePlayerName, type LeaderboardEntry } from '../core/leaderboard';

const font = MENU.font;

export class LeaderboardScene extends Phaser.Scene {
  private mode: ShiftMode = 'standard';
  private difficulty: DifficultyId = 'urgent';
  private rowsContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private podiumImg?: Phaser.GameObjects.Image;
  private pillGfx!: Phaser.GameObjects.Graphics;
  private modePills: Phaser.GameObjects.Text[] = [];
  private diffPills: Phaser.GameObjects.Text[] = [];
  private returnTo = 'Title';
  private requestSerial = 0;
  private topHeader?: MenuHeaderComponents;

  constructor() {
    super('Leaderboard');
  }

  init(data?: { returnTo?: string; mode?: ShiftMode; difficulty?: DifficultyId }): void {
    if (data?.returnTo) this.returnTo = data.returnTo;
    if (data?.mode) this.mode = data.mode;
    if (data?.difficulty) this.difficulty = data.difficulty;
  }

  create(): void {
    restartOnMenuResize(this);
    if (this.cameras?.main) {
      this.cameras.main.fadeIn(150, 0, 0, 0);
    }
    this.events.once('shutdown', () => {
      ++this.requestSerial;
      this.topHeader?.destroy();
    });
    const { width, height } = this.scale;
    renderMenuBackground(this, 'bg-leaderboard');

    // Standardized Top Panel: Single active tab badge '🏆 LEADERBOARD'
    this.topHeader = renderMenuTopPanel(this, 'leaderboard');

    const frameGfx = this.add.graphics();
    this.pillGfx = this.add.graphics();

    // Frosted top banner ribbon (🏆 LEADERBOARD 📋) matching moshi-and-pals-leaderboad.PNG
    const bannerW = Math.min(360, width * 0.42);
    frameGfx.fillStyle(0xfdfaf2, 0.92).fillRoundedRect(width / 2 - bannerW / 2, 66, bannerW, 38, 16);
    frameGfx.lineStyle(2, 0x38bdf8, 0.85).strokeRoundedRect(width / 2 - bannerW / 2, 66, bannerW, 38, 16);
    this.add.text(width / 2, 85, '🏆  LEADERBOARD  📋', {
      fontFamily: font,
      fontSize: '20px',
      fontStyle: '900',
      color: '#0b2530',
    }).setOrigin(0.5);

    const callsignText = this.add.text(width - 28, 85, `CALLSIGN: ${getSavedPlayerName()} ✎`, {
      fontFamily: font,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#f0fdfa',
      backgroundColor: '#0b2736',
      padding: { x: 12, y: 6 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    callsignText.on('pointerup', () => {
      const next = window.prompt?.('Enter your leaderboard callsign (1-10 characters):', getSavedPlayerName());
      if (next) {
        savePlayerName(next);
        callsignText.setText(`CALLSIGN: ${getSavedPlayerName()} ✎`);
      }
    });

    // Mode filter pills
    const modes: { id: ShiftMode; label: string }[] = [
      { id: 'standard', label: '🏥 STANDARD' },
      { id: 'fluSeason', label: '🤧 FLU SEASON (ENDLESS)' },
    ];
    this.modePills = modes.map((m, i) => {
      const x = width / 2 - 140 + i * 280;
      const b = this.add.text(x, 122, m.label, {
        fontFamily: font,
        fontSize: '14px',
        fontStyle: '900',
        color: COLORS.uiText,
        padding: { x: 14, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.mode = m.id;
        this.updateFilterStyles();
        this.loadScores();
      });
      return b;
    });

    // Difficulty filter pills
    this.diffPills = DIFFICULTIES.map((d, i) => {
      const x = width / 2 + (i - 1) * 185;
      const b = this.add.text(x, 156, d.name.toUpperCase(), {
        fontFamily: font,
        fontSize: '13px',
        fontStyle: '900',
        color: COLORS.uiText,
        padding: { x: 14, y: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.difficulty = d.id;
        this.updateFilterStyles();
        this.loadScores();
      });
      return b;
    });

    // Main Table Frame (sized so cute 3D germs on left/right edges remain visible on wide screens)
    const tableY = 182;
    const cw = Math.min(780, width - (width >= 960 ? 250 : 60));
    const left = width / 2 - cw / 2;
    const tableH = Math.max(180, height - tableY - 72);

    // Outer frosted cyan-bordered table card + cream interior
    frameGfx.fillStyle(0x041822, 0.28).fillRoundedRect(left + 2, tableY + 4, cw, tableH, 20);
    frameGfx.fillStyle(0xf4efe2, 0.97).fillRoundedRect(left, tableY, cw, tableH, 20);
    frameGfx.lineStyle(2.5, 0x38bdf8, 0.9).strokeRoundedRect(left, tableY, cw, tableH, 20);

    // Dark-teal rounded column header bar matching moshi-and-pals-leaderboad.PNG
    frameGfx.fillStyle(0x0c4a6e, 0.96).fillRoundedRect(left + 6, tableY + 6, cw - 12, 34, 12);
    frameGfx.lineStyle(1, 0x38bdf8, 0.6).strokeRoundedRect(left + 6, tableY + 6, cw - 12, 34, 12);

    const th = (x: number, text: string, origin = 0) =>
      this.add.text(x, tableY + 15, text, {
        fontFamily: font,
        fontSize: '13px',
        fontStyle: '900',
        color: '#f0fdfa',
      }).setOrigin(origin, 0);

    th(left + 24, 'RANK');
    th(left + 90, 'NAME');
    th(left + cw * 0.45, 'SCORE', 0.5);
    th(left + cw * 0.62, 'ROUND', 0.5);
    th(left + cw * 0.78, 'PROVIDER', 0.5);
    th(left + cw - 24, 'DATE', 1);

    this.rowsContainer = this.add.container(0, 0);

    // Empty/offline state 3D podium illustration from moshi-and-pals-leaderboad.PNG
    const bodyCenterY = tableY + 40 + (tableH - 40) / 2;
    if (this.textures.exists('menu-sprites') && this.textures.get('menu-sprites').has('ui-podium')) {
      this.podiumImg = this.add.image(width / 2, bodyCenterY - 34, 'menu-sprites', 'ui-podium').setScale(0.52);
    }

    this.statusText = this.add.text(width / 2, bodyCenterY + 26, 'Connecting to global registry...', {
      fontFamily: font,
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#334155',
      align: 'center',
    }).setOrigin(0.5);

    // Bottom glossy 3D cyan REFRESH pill button
    const by = height - 36;
    const refreshBtn = this.add.text(width / 2, by, 'REFRESH', {
      fontFamily: font,
      fontSize: '18px',
      fontStyle: '900',
      color: '#04242c',
      padding: { x: 28, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.loadScores());

    const rb = refreshBtn.getBounds();
    frameGfx.fillStyle(0x03131a, 0.35).fillRoundedRect(rb.x, rb.y + 3, rb.width, rb.height, 18);
    frameGfx.fillStyle(0x0e7490, 1).fillRoundedRect(rb.x, rb.y + 2, rb.width, rb.height, 18);
    frameGfx.fillStyle(0x38e8d8, 1).fillRoundedRect(rb.x, rb.y, rb.width, rb.height - 2, 18);
    frameGfx.lineStyle(2, 0xa5f3fc, 0.95).strokeRoundedRect(rb.x, rb.y, rb.width, rb.height - 2, 18);

    // Standardized bottom-left BACK button
    renderBackButton(this, () => this.close());

    this.input.keyboard?.on('keydown-ESC', () => this.close());

    this.updateFilterStyles();
    this.loadScores();
  }

  private close(): void {
    if (this.returnTo === 'GameOver') {
      this.scene.stop('Leaderboard');
      if (this.scene.isPaused('GameOver')) {
        this.scene.resume('GameOver');
      } else {
        toTitle(this);
      }
    } else if (this.returnTo === 'Title') {
      toTitle(this);
    } else {
      transitionTo(this, this.returnTo);
    }
  }

  private updateFilterStyles(): void {
    const isStandard = this.mode === 'standard';
    this.pillGfx.clear();

    const stylePill = (btn: Phaser.GameObjects.Text | undefined, active: boolean) => {
      if (!btn) return;
      btn.setBackgroundColor('rgba(0,0,0,0)');
      btn.setColor(active ? '#04242c' : '#1e3a46');
      const b = btn.getBounds();
      this.pillGfx.fillStyle(0x03131a, 0.22).fillRoundedRect(b.x, b.y + 2, b.width, b.height, 14);
      this.pillGfx.fillStyle(active ? 0x38e8d8 : 0xfdfaf2, 0.96).fillRoundedRect(b.x, b.y, b.width, b.height, 14);
      this.pillGfx.lineStyle(1.5, active ? 0x0e7490 : 0xd6cfc0, 0.9).strokeRoundedRect(b.x, b.y, b.width, b.height, 14);
    };

    stylePill(this.modePills[0], isStandard);
    stylePill(this.modePills[1], !isStandard);

    DIFFICULTIES.forEach((d, i) => {
      stylePill(this.diffPills[i], this.difficulty === d.id);
    });
  }

  private async loadScores(): Promise<void> {
    const request = ++this.requestSerial;
    this.rowsContainer.removeAll(true);
    this.statusText.setText('Fetching scores...').setVisible(true);
    this.podiumImg?.setVisible(true);

    const res = await fetchOnlineLeaderboard({
      mode: this.mode,
      difficulty: this.difficulty,
      limit: 10,
    });

    if (request !== this.requestSerial || !this.sys.isActive()) return;

    if (!res.ok) {
      this.statusText.setText(`Leaderboard offline or unavailable.\n(${res.error ?? 'Connection failed'})\nTap REFRESH to retry.`).setVisible(true);
      this.podiumImg?.setVisible(true);
      return;
    }

    if (res.scores.length === 0) {
      this.statusText.setText('No scores recorded yet for this category.\nBe the first to finish a shift and set the record!').setVisible(true);
      this.podiumImg?.setVisible(true);
      return;
    }

    this.statusText.setVisible(false);
    this.podiumImg?.setVisible(false);
    this.renderScores(res.scores);
  }

  private renderScores(scores: LeaderboardEntry[]): void {
    const { width, height } = this.scale;
    const tableY = 182;
    const cw = Math.min(780, width - (width >= 960 ? 250 : 60));
    const left = width / 2 - cw / 2;
    const startY = tableY + 46;
    const availH = Math.max(140, height - startY - 78);
    const rowH = Math.min(34, Math.floor(availH / Math.max(1, scores.length)));

    scores.forEach((entry, i) => {
      const y = startY + i * rowH;
      const isTop3 = i < 3;
      const rankColor = i === 0 ? MENU.amber : MENU.teal;

      const bg = this.add.rectangle(width / 2, y + rowH / 2 - 2, cw - 16, rowH - 3, i % 2 === 0 ? 0xfffcf6 : 0xebe5d5, 1).setOrigin(0.5);
      this.rowsContainer.add(bg);

      const t = (x: number, s: string, color = MENU.ink, style = 'bold', origin = 0) => {
        const textObj = this.add.text(x, y + 3, s, {
          fontFamily: font,
          fontSize: '15px',
          fontStyle: style,
          color,
        }).setOrigin(origin, 0);
        this.rowsContainer.add(textObj);
        return textObj;
      };

      t(left + 24, `#${i + 1}`, rankColor, '900');
      t(left + 90, entry.name, MENU.ink, isTop3 ? '900' : 'bold');
      t(left + cw * 0.45, entry.score.toLocaleString(), MENU.teal, '900', 0.5);
      t(left + cw * 0.62, `R${entry.round}`, MENU.teal, 'bold', 0.5);
      t(left + cw * 0.78, (entry.provider ?? 'Eugene').toUpperCase(), MENU.muted, 'bold', 0.5);

      const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : '';
      t(left + cw - 24, dateStr, MENU.muted, 'normal', 1);
    });
  }
}
