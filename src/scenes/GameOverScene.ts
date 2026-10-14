import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import type { RunResult } from '../core/events';

/**
 * Game over: the DISCHARGE SUMMARY. Shown over the frozen clinic. What killed you, how far you got,
 * what you did, and which records fell, then one big PLAY AGAIN. Built to make "one more run" easy.
 */
const PAPER = 0xfff6e8;
const INK = '#2b1d24';
const INK_SOFT = '#6d5a63';
const RECORD = '#c2185b';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(result: RunResult): void {
    const { width, height } = this.scale;
    const font = 'system-ui, -apple-system, sans-serif';
    this.add.rectangle(0, 0, width, height, 0x0d2b2e, 0).setOrigin(0).setInteractive(); // swallow taps
    const shade = this.add.rectangle(0, 0, width, height, 0x0d2b2e, 0.86).setOrigin(0).setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 350 });

    const title = this.add.text(width / 2, height * 0.085, 'CONTAMINATED', {
      fontFamily: font, fontSize: '58px', fontStyle: '900', color: '#ff6b6b',
    }).setOrigin(0.5).setShadow(0, 5, '#000', 10).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 420, ease: 'Back.out' });

    // The discharge form
    const cw = Math.min(1000, width - 80);
    const ch = 430;
    const cx = width / 2 - cw / 2;
    const cy = height * 0.16;
    const card = this.add.container(0, 30).setAlpha(0);
    const paper = this.add.graphics();
    paper.fillStyle(0x000000, 0.35).fillRoundedRect(cx + 6, cy + 8, cw, ch, 16);
    paper.fillStyle(PAPER).fillRoundedRect(cx, cy, cw, ch, 16);
    paper.fillStyle(0xd7263d).fillRect(cx, cy + 58, cw, 4);
    card.add(paper);
    const t = (x: number, y: number, s: string, size: number, color = INK, style = 'bold', origin = 0) =>
      this.add.text(x, y, s, { fontFamily: font, fontSize: `${size}px`, fontStyle: style, color }).setOrigin(origin, 0);
    card.add([
      t(cx + 28, cy + 16, 'DISCHARGE SUMMARY', 28, INK, '900'),
      t(cx + cw - 28, cy + 22, `PATIENT: MOSHKOVICH, E.  ·  SHIFT ${result.runs}`, 16, INK_SOFT, 'bold').setOrigin(1, 0),
      t(cx + 28, cy + 76, 'CAUSE OF DEATH', 14, INK_SOFT),
      t(cx + 28, cy + 96, result.causeOfDeath, 22, INK, 'italic'),
    ]);

    // Left: the headline numbers
    const lx = cx + 28;
    const ly = cy + 148;
    const roundText = t(lx, ly + 18, `${result.round}`, 64, INK, '900');
    const scoreText = t(lx, ly + 122, result.score.toLocaleString(), 44, INK, '900');
    card.add([t(lx, ly, 'ROUND REACHED', 14, INK_SOFT), roundText, t(lx, ly + 104, 'SCORE', 14, INK_SOFT), scoreText]);
    const badge = (x: number, y: number) => {
      const b = t(x, y, 'NEW RECORD!', 16, '#ffffff', '900').setBackgroundColor(RECORD).setPadding(8, 4, 8, 4).setAngle(-6);
      card.add(b);
      this.tweens.add({ targets: b, scale: 1.12, duration: 380, yoyo: true, repeat: -1, delay: 600 });
    };
    if (result.newBestRound) badge(lx + roundText.width + 16, ly + 40);
    if (result.newBestScore) badge(lx + scoreText.width + 16, ly + 132);

    // Right: the chart
    const rx = cx + Math.max(330, cw * 0.42);
    const rows: [string, string, boolean?][] = [
      ['Germs disinfected', `${result.kills}`],
      ['Best Sanitation Streak', `${result.bestStreak}`, result.newBestStreak],
      ['Time on shift', mmss(result.secondsSurvived)],
      ['Copays earned', `$${result.copaysEarned.toLocaleString()}`],
      ['Rooms opened', `${result.roomsOpened} of ${result.roomsTotal}`],
      ['Upgrades · Perfect Pours · STAT! crits', `${result.upgrades} · ${result.perfectPours} · ${result.crits}`],
    ];
    if (result.favoriteVictim) rows.push(['Most disinfected', `${result.favoriteVictim.name} ×${result.favoriteVictim.count}`]);
    const rowH = 34;
    rows.forEach(([label, value, isRecord], i) => {
      const y = ly + i * rowH;
      card.add(t(rx, y, label, 18, INK_SOFT, 'bold'));
      card.add(t(cx + cw - 28, y - 2, value + (isRecord ? '  ★' : ''), 20, isRecord ? RECORD : INK, '900').setOrigin(1, 0));
    });
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0xd9cbbf);
    rows.forEach((_, i) => lineG.lineBetween(rx, ly + i * rowH + 27, cx + cw - 28, ly + i * rowH + 27));
    card.add(lineG);

    card.add(t(width / 2, cy + ch - 34, `PERSONAL BESTS  ·  Round ${result.bestRound}  ·  ${result.bestScore.toLocaleString()} pts  ·  Streak ${result.recordStreak}  ·  ${result.totalKills.toLocaleString()} germs all-time`, 15, INK_SOFT, 'bold', 0.5));
    this.tweens.add({ targets: card, y: 0, alpha: 1, duration: 420, delay: 180, ease: 'Cubic.out' });

    // One big PLAY AGAIN (plus the menu), ready the moment the summary lands
    const by = Math.min(height - 56, cy + ch + 70);
    this.makeButton(width / 2 - 130, by, 360, 'PLAY AGAIN', 0x2a9d8f, () => this.scene.start('Game'));
    this.makeButton(width / 2 + 200, by, 220, 'MAIN MENU', 0x3f5f66, () => {
      this.scene.stop('Game');
      this.scene.start('Title');
    });
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Game'));
  }

  private makeButton(x: number, y: number, w: number, text: string, color: number, onTap: () => void): void {
    const h = 72;
    const bg = this.add.rectangle(x, y, w, h, color).setStrokeStyle(3, 0xe8fff9, 0.9).setInteractive({ useHandCursor: true });
    this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '28px', fontStyle: '900', color: COLORS.uiText }).setOrigin(0.5);
    bg.on('pointerdown', () => bg.setScale(0.95));
    bg.on('pointerup', () => { bg.setScale(1); onTap(); });
    bg.on('pointerout', () => bg.setScale(1));
  }
}
