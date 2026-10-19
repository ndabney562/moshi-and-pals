import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { sfx } from '../core/sfx';
import { FAX_LINES as LINES } from '../data/miracleCure';
import type { Germ } from '../entities/Germ';
import type { BossBrain } from './BossBrain';
import type { BossHost } from './DiamondBrain';
import { SpeechBubble } from '../ui/SpeechBubble';

type Mode = 'shuffle' | 'screechWindup' | 'jammed';

const pick = (lines: string[]): string => Phaser.Utils.Array.GetRandom(lines);

/**
 * THE LAST FAX MACHINE (the Miracle Cure's secret boss, alone in the Records Room).
 * - Shuffles back and forth along the top of the room, never chasing.
 * - INCOMING FAX: every few seconds it prints a fan of Fax Pages at Eugene.
 * - DIAL-UP SCREECH (below 75%): a ring shows the reach, then everything inside it gets hurt. Step out.
 * - PAPER JAM (below 50%): now and then it jams: it stops, and takes double damage until it clears.
 */
export class FaxMachineBrain implements BossBrain {
  private readonly cfg = BALANCE.faxMachine;
  private readonly bubble: SpeechBubble;
  private readonly fx: Phaser.GameObjects.Graphics;
  private mode: Mode = 'shuffle';
  private modeUntil = 0;
  private nextFaxAt: number;
  private nextScreechAt: number;
  private nextJamAt: number;
  /** Which end of its shelf it's heading for. */
  private side = 1;
  private done = false;

  constructor(private readonly host: BossHost, readonly germ: Germ, private readonly home: { x: number; y: number }) {
    const now = host.scene.time.now;
    this.bubble = new SpeechBubble(host.scene);
    this.fx = host.scene.add.graphics().setDepth(11);
    this.nextFaxAt = now + 1800;
    this.nextScreechAt = now + this.cfg.screechEveryMs;
    this.nextJamAt = now + this.cfg.jamEveryMs / 2;
    host.scene.time.delayedCall(500, () => this.say(pick(LINES.arrive)));
  }

  private get active(): boolean {
    return !this.done && this.germ.active;
  }

  private get hpFraction(): number {
    return this.germ.hp / this.germ.maxHp;
  }

  get priorityTarget(): Germ | undefined {
    return undefined;
  }

  get ignoresContact(): boolean {
    return false;
  }

  get damageTaken(): number {
    return this.mode === 'jammed' ? this.cfg.jamDamageTaken : 1;
  }

  /** For tests and the HUD. */
  get currentMode(): Mode {
    return this.mode;
  }

  movement(): { target: { x: number; y: number }; speed: number } | undefined {
    if (!this.active) return undefined;
    if (this.mode !== 'shuffle') return { target: this.host.player, speed: 0 };
    const target = { x: this.home.x + this.side * this.cfg.shuffle, y: this.home.y };
    if (Math.abs(this.germ.x - target.x) < 20) this.side = -this.side;
    return { target, speed: this.germ.def.speed };
  }

  update(time: number): void {
    this.bubble.follow();
    this.fx.clear();
    if (!this.active || this.host.player.dead) return;
    const g = this.germ;
    const { player } = this.host;
    switch (this.mode) {
      case 'shuffle':
        if (this.hpFraction < this.cfg.jamBelow && time >= this.nextJamAt) {
          this.mode = 'jammed';
          this.modeUntil = time + this.cfg.jamMs;
          this.say(LINES.jam, this.cfg.jamMs);
          sfx.tink();
          this.host.scene.tweens.add({ targets: g, angle: g.angle + 8, duration: 60, yoyo: true, repeat: 6 });
        } else if (this.hpFraction < this.cfg.screechBelow && time >= this.nextScreechAt) {
          this.mode = 'screechWindup';
          this.modeUntil = time + this.cfg.screechWindupMs;
          sfx.faxScreech();
          this.say(LINES.screech, this.cfg.screechWindupMs + 400);
        } else if (time >= this.nextFaxAt) {
          this.fax(time);
        }
        break;
      case 'screechWindup': {
        // The ring it's about to screech across: get outside it
        const k = 1 - (this.modeUntil - time) / this.cfg.screechWindupMs;
        this.fx.lineStyle(6, 0xd7263d, 0.5 + 0.3 * Math.sin(time / 40)).strokeCircle(g.x, g.y, this.cfg.screechRadius);
        this.fx.fillStyle(0xd7263d, 0.12 + 0.18 * k).fillCircle(g.x, g.y, this.cfg.screechRadius * k);
        if (time >= this.modeUntil) {
          this.mode = 'shuffle';
          this.nextScreechAt = time + this.cfg.screechEveryMs;
          this.host.scene.cameras.main.shake(220, 0.008);
          const ring = this.host.scene.add.circle(g.x, g.y, this.cfg.screechRadius).setStrokeStyle(10, 0xffffff, 0.8).setDepth(13).setScale(0.2);
          this.host.scene.tweens.add({ targets: ring, scale: 1.1, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
          if (Phaser.Math.Distance.Between(g.x, g.y, player.x, player.y) < this.cfg.screechRadius + 20) this.host.damagePlayer(this.cfg.screechDamage);
        }
        break;
      }
      case 'jammed':
        // Smoke curling out of the slot while it's stuck
        this.fx.fillStyle(0x9e9e9e, 0.35 + 0.2 * Math.sin(time / 90)).fillCircle(g.x, g.y - g.def.radius - 10, 16 + 6 * Math.sin(time / 120));
        if (time >= this.modeUntil) {
          this.mode = 'shuffle';
          this.nextJamAt = time + this.cfg.jamEveryMs;
          this.nextFaxAt = time + 600;
        }
        break;
    }
  }

  /** INCOMING FAX: a fan of pages flung at Eugene. */
  private fax(time: number): void {
    const g = this.germ;
    const { player } = this.host;
    this.nextFaxAt = time + this.cfg.faxEveryMs * (this.hpFraction < this.cfg.jamBelow ? 0.75 : 1);
    this.say(pick(LINES.fax), 1400);
    sfx.faxScreech();
    const aim = Phaser.Math.Angle.Between(g.x, g.y, player.x, player.y);
    const n = this.cfg.pages;
    for (let i = 0; i < n; i++) {
      const a = aim + (i - (n - 1) / 2) * 0.32;
      const x = g.x + Math.cos(a) * (g.def.radius + 16);
      const y = g.y + Math.sin(a) * (g.def.radius + 16);
      this.host.spawnMinion('faxPage', x, y, Math.cos(a) * this.cfg.pageSpeed, Math.sin(a) * this.cfg.pageSpeed);
    }
  }

  onHurt(): void {
    // Nothing: it doesn't feel pain, only paper jams
  }

  onDefeated(): void {
    this.bubble.say(LINES.defeated, { x: this.germ.x, y: this.germ.y }, this.germ.def.radius + 18, 3200);
    this.done = true;
    this.fx.clear();
  }

  onPlayerDown(): void {
    if (!this.active) return;
    this.say('FAX DELIVERED.', 3000);
    this.done = true;
  }

  destroy(): void {
    this.fx.destroy();
    this.bubble.destroy();
  }

  private say(line: string, ms = 2400): void {
    if (!this.bubble.scene) return;
    this.bubble.say(line, this.germ, this.germ.def.radius + 18, ms);
  }
}
