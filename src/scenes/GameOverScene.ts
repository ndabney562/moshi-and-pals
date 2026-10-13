import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import type { RunResult } from '../core/events';

/** Shown over the frozen game when Eugene goes down. Lines are easy to add to. */
const DEFEAT_LINES = [
  'Cause of death: insufficient hand hygiene.',
  'The germs have taken over the waiting room. Again.',
  'Eugene has been placed on medical leave.',
  'Infection control has failed. Write it up.',
  'Even the magazines are contaminated now.',
];

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(result: RunResult): void {
    const { width, height } = this.scale;
    const font = 'system-ui, -apple-system, sans-serif';
    this.add.rectangle(0, 0, width, height, 0x0d2b2e, 0).setOrigin(0).setInteractive(); // swallow taps
    const shade = this.add.rectangle(0, 0, width, height, 0x0d2b2e, 0.88).setOrigin(0).setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 400 });

    const title = this.add.text(width / 2, height * 0.16, 'CONTAMINATED', {
      fontFamily: font, fontSize: '76px', fontStyle: '900', color: '#ff6b6b',
    }).setOrigin(0.5).setShadow(0, 6, '#000', 10).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 450, ease: 'Back.out' });

    this.add.text(width / 2, height * 0.16 + 62, Phaser.Utils.Array.GetRandom(DEFEAT_LINES), {
      fontFamily: font, fontSize: '24px', fontStyle: 'italic', color: COLORS.uiAccent,
    }).setOrigin(0.5);

    const stats = [
      `ROUND REACHED   ${result.round}${result.newBestRound ? '   NEW BEST!' : ''}`,
      `SCORE   ${result.score.toLocaleString()}${result.newBestScore ? '   NEW BEST!' : ''}`,
      `GERMS DISINFECTED   ${result.kills}`,
      `BEST   Round ${result.bestRound}  ·  ${result.bestScore.toLocaleString()} pts`,
    ];
    stats.forEach((line, i) => {
      const t = this.add.text(width / 2, height * 0.42 + i * 40, line, {
        fontFamily: font, fontSize: i === 3 ? '20px' : '28px', fontStyle: i === 3 ? 'normal' : 'bold',
        color: line.includes('NEW BEST') ? '#ffe66d' : COLORS.uiText,
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: i === 3 ? 0.75 : 1, duration: 300, delay: 300 + i * 150 });
    });

    this.makeButton(width / 2 - 170, height * 0.84, 'SCRUB IN AGAIN', 0x2a9d8f, () => this.scene.start('Game'));
    this.makeButton(width / 2 + 170, height * 0.84, 'MAIN MENU', 0x3f5f66, () => {
      this.scene.stop('Game');
      this.scene.start('Title');
    });
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Game'));
  }

  private makeButton(x: number, y: number, text: string, color: number, onTap: () => void): void {
    const w = 300;
    const h = 72;
    const bg = this.add.rectangle(x, y, w, h, color).setStrokeStyle(3, 0xe8fff9, 0.9).setInteractive({ useHandCursor: true });
    this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    bg.on('pointerdown', () => bg.setScale(0.95));
    bg.on('pointerup', () => { bg.setScale(1); onTap(); });
    bg.on('pointerout', () => bg.setScale(1));
  }
}
