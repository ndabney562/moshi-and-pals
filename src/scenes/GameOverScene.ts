import Phaser from 'phaser';
import { toTitle } from '../core/native';
import { COLORS } from '../config/theme';
import type { RunResult } from '../core/events';
import { CREDITS } from '../data/miracleCure';

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
    this.add.rectangle(0, 0, width, height, 0x0d2b2e, 0).setOrigin(0).setInteractive(); // swallow taps
    const shade = this.add.rectangle(0, 0, width, height, 0x0d2b2e, 0.86).setOrigin(0).setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 350 });
    // The Miracle Cure's alternate ending: the credits roll first
    if (result.clockedOut) this.rollCredits(() => this.summary(result));
    else this.summary(result);
  }

  /** SHIFT COMPLETE: the credits scroll up (tap to skip), then the Discharge Summary. */
  private rollCredits(done: () => void): void {
    const { width, height } = this.scale;
    const font = 'system-ui, -apple-system, sans-serif';
    const roll = this.add.text(width / 2, height + 20, CREDITS.join('\n'), {
      fontFamily: font, fontSize: '30px', fontStyle: 'bold', color: '#e8fff9', align: 'center', lineSpacing: 14,
    }).setOrigin(0.5, 0);
    roll.setShadow(0, 3, '#000', 6);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.tweens.killTweensOf(roll);
      roll.destroy();
      done();
    };
    this.tweens.add({ targets: roll, y: -roll.height - 20, duration: 14000, ease: 'Linear', onComplete: finish });
    this.time.delayedCall(400, () => this.input.once('pointerup', finish));
    this.input.keyboard?.once('keydown-ENTER', finish);
  }

  private summary(result: RunResult): void {
    const { width, height } = this.scale;
    const font = 'system-ui, -apple-system, sans-serif';
    const title = this.add.text(width / 2, height * 0.085, result.clockedOut ? 'SHIFT COMPLETE' : 'CONTAMINATED', {
      fontFamily: font, fontSize: '58px', fontStyle: '900', color: result.clockedOut ? '#7fffd4' : '#ff6b6b',
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
      t(cx + cw - 28, cy + 22, `PATIENT: ${result.chart ?? 'MOSHKOVICH, E.'}  ·  SHIFT ${result.runs}  ·  ${result.mode === 'fluSeason' ? 'ENDLESS FLU SEASON' : (result.difficulty ?? 'Urgent').toUpperCase()}${result.specialty ? `  ·  ${result.specialty.toUpperCase()}` : ''}`, 16, INK_SOFT, 'bold').setOrigin(1, 0),
      t(cx + cw - 28, cy + 80, `🎓 +${result.cme ?? 0} CME CREDITS${result.dailyBonus ? `  (+${result.dailyBonus} FIRST SHIFT TODAY)` : ''}  ·  ⭐ +${result.nps ?? 0} NPS`, 20, RECORD, '900').setOrigin(1, 0),
      t(cx + 28, cy + 76, result.clockedOut ? 'CAUSE OF DEATH (NONE)' : 'CAUSE OF DEATH', 14, INK_SOFT),
      t(cx + 28, cy + 96, result.causeOfDeath, 22, INK, 'italic'),
    ]);
    // Today's Shift (or forced modifiers): which ones were in play
    const mods = result.modifiers ?? [];
    if (result.daily || mods.length) {
      const label = result.daily ? `📋 TODAY'S SHIFT ${result.daily}` : 'MODIFIERS';
      card.add(t(cx + cw - 28, cy + 110, `${label}: ${mods.join(' + ').toUpperCase()}`, 15, INK_SOFT, '900').setOrigin(1, 0));
    }

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
      ['Copays earned · to the Locker', `$${result.copaysEarned.toLocaleString()} · 🧰 $${(result.bank ?? 0).toLocaleString()}`],
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

    // Records are per difficulty; Today's Shift shows the day's best
    const bests = result.daily
      ? `TODAY'S BEST  ·  ${result.bestScore.toLocaleString()} pts  ·  Round ${result.bestRound}  ·  ${result.totalKills.toLocaleString()} germs all-time`
      : result.mode === 'fluSeason'
      ? `PERSONAL BESTS (FLU SEASON · ${(result.difficulty ?? 'Urgent').toUpperCase()})  ·  Round ${result.bestRound}  ·  ${result.bestScore.toLocaleString()} pts  ·  Streak ${result.recordStreak}  ·  ${result.totalKills.toLocaleString()} germs all-time`
      : `PERSONAL BESTS (${(result.difficulty ?? 'Urgent').toUpperCase()})  ·  Round ${result.bestRound}  ·  ${result.bestScore.toLocaleString()} pts  ·  Streak ${result.recordStreak}  ·  ${result.totalKills.toLocaleString()} germs all-time`;
    card.add(t(width / 2, cy + ch - 34, bests, 15, INK_SOFT, 'bold', 0.5));
    this.tweens.add({ targets: card, y: 0, alpha: 1, duration: 420, delay: 180, ease: 'Cubic.out' });

    // Achievements unlocked this shift
    if (result.newAchievements?.length) {
      const names = result.newAchievements;
      const line = names.length > 3 ? `${names.slice(0, 3).join('  ·  ')}  +${names.length - 3} more` : names.join('  ·  ');
      const ach = this.add.text(width / 2, cy + ch + 22, `🏆  NEW: ${line}`, {
        fontFamily: font, fontSize: '18px', fontStyle: '900', color: '#ffe66d',
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: ach, alpha: 1, duration: 400, delay: 600 });
    }

    // One big PLAY AGAIN (plus the menu), ready the moment the summary lands
    const by = Math.min(height - 56, cy + ch + 70);
    this.makeButton(width / 2 - 130, by, 360, 'PLAY AGAIN', 0x2a9d8f, () => this.scene.start('Game', { resume: false }));
    this.makeButton(width / 2 + 200, by, 220, 'MAIN MENU', 0x3f5f66, () => {
      this.scene.stop('Game');
      toTitle(this);
    });
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Game', { resume: false }));
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
