import Phaser from 'phaser';
import { toTitle } from '../core/native';
import { COLORS as GAME_COLORS } from '../config/theme';
import { MENU, restartOnMenuResize } from '../ui/menuTheme';
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
  private modePills: Phaser.GameObjects.Text[] = [];
  private diffPills: Phaser.GameObjects.Text[] = [];
  private returnTo = 'Title';
  private requestSerial = 0;

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
    this.events.once('shutdown', () => { ++this.requestSerial; });
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, MENU.paper).setOrigin(0);

    this.add.text(width / 2, 36, 'LEADERBOARD', {
      fontFamily: font, fontSize: '36px', fontStyle: '900', color: COLORS.uiText,
    }).setOrigin(0.5);

    const callsignText = this.add.text(width - 32, 36, `CALLSIGN: ${getSavedPlayerName()} ✎`, {
      fontFamily: font, fontSize: '15px', fontStyle: 'bold', color: MENU.teal,
      backgroundColor: '#eeeade', padding: { x: 12, y: 6 },
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
      const x = width / 2 - 160 + i * 320;
      const b = this.add.text(x, 88, m.label, {
        fontFamily: font, fontSize: '18px', fontStyle: '900', color: COLORS.uiText,
        backgroundColor: '#eeeade', padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.mode = m.id;
        this.updateFilterStyles();
        this.loadScores();
      });
      return b;
    });

    // Difficulty filter pills
    this.diffPills = DIFFICULTIES.map((d, i) => {
      const x = width / 2 + (i - 1) * 220;
      const b = this.add.text(x, 134, d.name.toUpperCase(), {
        fontFamily: font, fontSize: '16px', fontStyle: 'bold', color: COLORS.uiText,
        backgroundColor: '#eeeade', padding: { x: 14, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.difficulty = d.id;
        this.updateFilterStyles();
        this.loadScores();
      });
      return b;
    });

    // Header row
    const tableY = 176;
    const cw = Math.min(940, width - 60);
    const left = width / 2 - cw / 2;
    const headerBg = this.add.rectangle(width / 2, tableY + 12, cw, 32, MENU.card, 0.9).setOrigin(0.5);
    headerBg.setStrokeStyle(1, 0x2a9d8f, 0.4);

    const th = (x: number, text: string, origin = 0) =>
      this.add.text(x, tableY + 2, text, {
        fontFamily: font, fontSize: '14px', fontStyle: '900', color: MENU.teal,
      }).setOrigin(origin, 0);

    th(left + 24, 'RANK');
    th(left + 90, 'NAME');
    th(left + cw * 0.45, 'SCORE', 0.5);
    th(left + cw * 0.62, 'ROUND', 0.5);
    th(left + cw * 0.78, 'PROVIDER', 0.5);
    th(left + cw - 24, 'DATE', 1);

    this.rowsContainer = this.add.container(0, 0);

    this.statusText = this.add.text(width / 2, 340, 'Connecting to global registry...', {
      fontFamily: font, fontSize: '20px', fontStyle: 'bold', color: MENU.muted, align: 'center',
    }).setOrigin(0.5);

    // Bottom buttons
    const by = height - 42;
    this.add.text(width / 2 - 120, by, 'REFRESH', {
      fontFamily: font, fontSize: '22px', fontStyle: 'bold', color: COLORS.uiText,
      backgroundColor: MENU.mint, padding: { x: 28, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.loadScores());

    this.add.text(width / 2 + 120, by, 'BACK', {
      fontFamily: font, fontSize: '22px', fontStyle: 'bold', color: COLORS.uiText,
      backgroundColor: '#e4e6dc', padding: { x: 36, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.close());

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
    } else {
      toTitle(this);
    }
  }

  private updateFilterStyles(): void {
    const isStandard = this.mode === 'standard';
    this.modePills[0]?.setBackgroundColor(isStandard ? MENU.mint : '#eeeade');
    this.modePills[1]?.setBackgroundColor(!isStandard ? MENU.mint : '#eeeade');

    DIFFICULTIES.forEach((d, i) => {
      this.diffPills[i]?.setBackgroundColor(this.difficulty === d.id ? MENU.mint : '#eeeade');
    });
  }

  private async loadScores(): Promise<void> {
    const request = ++this.requestSerial;
    this.rowsContainer.removeAll(true);
    this.statusText.setText('Fetching scores...').setVisible(true);

    const res = await fetchOnlineLeaderboard({
      mode: this.mode,
      difficulty: this.difficulty,
      limit: 10,
    });

    // Resizing rebuilds the scene. Old requests must never paint into the new
    // table, overwrite a newer filter, or touch objects destroyed on close.
    if (request !== this.requestSerial || !this.sys.isActive()) return;

    if (!res.ok) {
      this.statusText.setText(`Leaderboard offline or unavailable.\n(${res.error ?? 'Connection failed'})\nTap REFRESH to retry.`).setVisible(true);
      return;
    }

    if (res.scores.length === 0) {
      this.statusText.setText('No scores recorded yet for this category.\nBe the first to finish a shift and set the record!').setVisible(true);
      return;
    }

    this.statusText.setVisible(false);
    this.renderScores(res.scores);
  }

  private renderScores(scores: LeaderboardEntry[]): void {
    const { width } = this.scale;
    const cw = Math.min(940, width - 60);
    const left = width / 2 - cw / 2;
    const startY = 216;
    const rowH = 40;

    scores.forEach((entry, i) => {
      const y = startY + i * rowH;
      const isTop3 = i < 3;
      const rankColor = i === 0 ? MENU.amber : MENU.teal;

      const bg = this.add.rectangle(width / 2, y + 14, cw, rowH - 4, i % 2 === 0 ? 0xfffcf6 : 0xf0f0e6, 1).setOrigin(0.5);
      this.rowsContainer.add(bg);

      const t = (x: number, s: string, color = MENU.ink, style = 'bold', origin = 0) => {
        const textObj = this.add.text(x, y + 4, s, {
          fontFamily: font, fontSize: '17px', fontStyle: style, color,
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
