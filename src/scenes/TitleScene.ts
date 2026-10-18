import Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { COLORS } from '../config/theme';
import { applyUpdate, offerFilesToCache, onUpdateReady } from '../core/updates';
import { doctorUnlocked, hireDoctor, progress } from '../core/progress';
import { saveSettings, settings } from '../core/settings';
import { CHARACTERS, characterById } from '../data/characters';


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
  /** NPS Scores to spend, and the locked Pal tapped once (a second tap hires them). */
  private npsText!: Phaser.GameObjects.Text;
  private hiring = '';

  private started = false;

  create(): void {
    this.started = false;
    this.input.enabled = true;
    const font = 'system-ui, -apple-system, sans-serif';
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
      const name = this.add.text(0, 0, '', {
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
    this.npsText = this.add.text(0, 0, '', {
      fontFamily: font, fontSize: '15px', fontStyle: '900', color: COLORS.uiText, backgroundColor: '#0d2b2ecc', padding: { x: 8, y: 4 },
    }).setOrigin(1, 1);
    this.hiring = '';
    this.pick(doctorUnlocked(settings.character) ? settings.character : 'eugene');

    // The screen's shape can change after load (rotating, Safari's toolbars), so re-fit whenever it does
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    this.input.keyboard?.once('keydown', () => this.begin());
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.includes(this.updatePill) && !over.includes(this.boardButton) && !this.picks.some((p) => over.includes(p.ring))) this.begin();
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
    this.boardButton.setPosition(24, height - 20);
    this.picks.forEach((p, i) => {
      const x = width - 70 - (this.picks.length - 1 - i) * 112;
      const y = height - 92;
      p.ring.setPosition(x, y);
      p.art.setPosition(x, y + 4);
      p.name.setPosition(x, y + 44);
    });
    this.pickInfo.setPosition(width - 20, height - 150);
    this.placeNps();
  }

  /**
   * Chooses who's on shift (saved for next time). A Pal not yet hired shows their price instead; tapping
   * them again hires them with NPS Scores if there's enough.
   */
  private pick(id: string): void {
    const c = characterById(id);
    if (!doctorUnlocked(c.id)) {
      const nps = progress().nps;
      if (this.hiring === c.id && hireDoctor(c.id)) {
        // A little pop on the new hire's portrait
        const art = this.picks.find((p) => p.id === c.id)?.art;
        if (art) this.tweens.add({ targets: art, scale: { from: 1.25, to: 0.85 }, duration: 380, ease: 'Back.out' });
      } else {
        this.hiring = c.id;
        const ask = nps >= c.price ? 'TAP AGAIN TO HIRE' : `NEED ${c.price - nps} MORE`;
        this.pickInfo.setText(`🔒 ${c.name.toUpperCase()} · ${c.price} NPS · ${ask}\n${c.blurb}`);
        this.showPicks(settings.character, c.id);
        this.placeNps();
        return;
      }
    }
    this.hiring = '';
    settings.character = c.id;
    saveSettings();
    this.showPicks(c.id);
    this.pickInfo.setText(`${c.name.toUpperCase()} · ${c.blurb}`);
    this.placeNps();
  }

  /** The NPS counter sits just above the doctor's line (which is one or two lines tall). */
  private placeNps(): void {
    this.npsText.setPosition(this.pickInfo.x, this.pickInfo.y - this.pickInfo.height - 6);
  }

  /** Portrait rings: the doctor on shift in gold, a locked one being looked at in white, locked ones dimmed with a price. */
  private showPicks(onShift: string, looking = ''): void {
    for (const p of this.picks) {
      const c = characterById(p.id);
      const open = doctorUnlocked(p.id);
      const on = p.id === onShift;
      p.ring.setStrokeStyle(on || p.id === looking ? 5 : 3, on ? 0xffe66d : 0xe8fff9, on || p.id === looking ? 1 : 0.4);
      p.art.setAlpha(on ? 1 : open ? 0.6 : 0.3);
      p.name.setText(open ? c.short : `🔒 ${c.price} NPS`).setColor(on ? '#ffe66d' : COLORS.uiText);
    }
    this.npsText.setText(`⭐ ${progress().nps} NPS SCORES`);
  }

  private begin(): void {
    if (this.started) return;
    this.started = true;
    // Fade to black, then the clinic fades in from black (GameScene/HudScene.create)
    this.input.enabled = false;
    this.cameras.main.fadeOut(DISPLAY.fadeOutMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game'));
  }
}
