import Phaser from 'phaser';
import { dialogueText } from '../core/dialogue';
import { BALANCE } from '../config/balance';
import { sfx } from '../core/sfx';
import { events, GameEvents } from '../core/events';
import { PATIENT_ZERO_LINES as LINES } from '../data/patientZero';
import type { Germ } from '../entities/Germ';
import type { BossBrain } from './BossBrain';
import type { BossHost } from './DiamondBrain';
import { SpeechBubble } from '../ui/SpeechBubble';

type Mode = 'chase' | 'coughWindup' | 'sneezeWindup' | 'leaving';

const pick = (lines: string[]): string => Phaser.Utils.Array.GetRandom(lines);

/**
 * BOSS #2: PATIENT ZERO, the waiting room's most contagious patient (round 10, 20...).
 * - Cough Cone: inhales (puffs up), then coughs a cone that hurts and launches Viral Sprinters.
 * - Sneeze Line (below 60%): a red line shows where; then a volley of mucus globs down it.
 * - Compliance: every spray hit fills his mask meter. When it fills he masks up for a while:
 *   no coughing or sneezing, and he takes double damage. Then he pulls it down again.
 * - Against Medical Advice (below 25%): he heads for the EXIT. If he gets there, he escapes
 *   and you get no reward. Stop him.
 */
export class PatientZeroBrain implements BossBrain {
  private readonly cfg = BALANCE.patientZero;
  private readonly bubble: SpeechBubble;
  private readonly fx: Phaser.GameObjects.Graphics;
  private mode: Mode = 'chase';
  private modeUntil = 0;
  private nextCoughAt: number;
  private nextSneezeAt: number;
  private nextChatterAt: number;
  private aimAngle = 0;
  /** Compliance meter (spray hits) and when the mask comes off. */
  private compliance = 0;
  private maskedUntil = 0;
  private done = false;

  constructor(private readonly host: BossHost & { cough(x: number, y: number, angle: number): void; sneezeVolley(x: number, y: number, angle: number): void },
    readonly germ: Germ) {
    const now = host.scene.time.now;
    this.bubble = new SpeechBubble(host.scene);
    this.fx = host.scene.add.graphics().setDepth(11);
    this.nextCoughAt = now + this.cfg.firstCoughMs;
    this.nextSneezeAt = now + this.cfg.sneezeEveryMs;
    this.nextChatterAt = now + 3000;
    host.scene.time.delayedCall(700, () => this.say(pick(LINES.arrive)));
  }

  private get active(): boolean {
    return !this.done && this.germ.active;
  }

  private get hpFraction(): number {
    return this.germ.hp / this.germ.maxHp;
  }

  get masked(): boolean {
    return this.host.scene.time.now < this.maskedUntil;
  }

  /** 0..1 how close he is to masking up (for the HUD/tests). */
  get complianceLevel(): number {
    return this.masked ? 1 : this.compliance / this.cfg.complianceHits;
  }

  get priorityTarget(): Germ | undefined {
    return this.active && this.mode === 'leaving' ? this.germ : undefined;
  }

  get ignoresContact(): boolean {
    return false;
  }

  get damageTaken(): number {
    return this.masked ? this.cfg.maskedDamageTaken : 1;
  }

  get currentMode(): Mode {
    return this.mode;
  }

  movement(): { target: { x: number; y: number }; speed: number } | undefined {
    if (!this.active) return undefined;
    switch (this.mode) {
      case 'coughWindup':
      case 'sneezeWindup':
        return { target: this.host.player, speed: 0 };
      case 'leaving':
        return { target: this.host.exit, speed: this.cfg.leaveSpeed };
      default:
        return undefined;
    }
  }

  update(time: number): void {
    this.bubble.follow();
    this.fx.clear();
    if (!this.active) return;
    const { player, exit } = this.host;
    if (player.dead) return;
    const g = this.germ;
    if (this.maskedUntil && time >= this.maskedUntil) {
      this.maskedUntil = 0;
      this.compliance = 0;
      this.say(pick(LINES.unmasked));
    }
    if (this.masked) this.drawMask();

    // Against medical advice: low on health, he makes a run for the exit
    if (this.mode !== 'leaving' && this.hpFraction < this.cfg.leaveBelow) {
      this.mode = 'leaving';
      this.say(pick(LINES.leaving), 4000);
      events.emit(GameEvents.BossHealth, { name: g.def.name, hp: g.hp, maxHp: g.maxHp });
    }
    const toPlayer = Phaser.Math.Distance.Between(g.x, g.y, player.x, player.y);
    switch (this.mode) {
      case 'chase':
        if (!this.masked && this.hpFraction < this.cfg.sneezeBelow && time >= this.nextSneezeAt && toPlayer < this.cfg.sneezeRange) {
          this.mode = 'sneezeWindup';
          this.modeUntil = time + this.cfg.sneezeWindupMs;
          this.aimAngle = Phaser.Math.Angle.Between(g.x, g.y, player.x, player.y);
          this.say(pick(LINES.sneezeWindup));
          sfx.sneezeWindup();
        } else if (!this.masked && time >= this.nextCoughAt && toPlayer < this.cfg.coughRange + 100) {
          this.mode = 'coughWindup';
          this.modeUntil = time + this.cfg.coughWindupMs;
          this.host.scene.tweens.add({ targets: g, scale: 1.15, duration: this.cfg.coughWindupMs / 2, yoyo: true });
        } else if (time >= this.nextChatterAt) {
          this.say(pick(LINES.chatter));
        }
        break;
      case 'coughWindup': {
        // A pale cone shows where the cough will land
        this.aimAngle = Phaser.Math.Angle.Between(g.x, g.y, player.x, player.y);
        this.drawCone(0.15 + 0.15 * Math.sin(time / 50));
        if (time >= this.modeUntil) this.cough(time);
        break;
      }
      case 'sneezeWindup': {
        // The red line: where the sneeze goes (aimed when the wind-up began, so you can step aside)
        const len = this.cfg.sneezeRange;
        this.fx.lineStyle(10, 0xd7263d, 0.25 + 0.25 * Math.sin(time / 40))
          .lineBetween(g.x, g.y, g.x + Math.cos(this.aimAngle) * len, g.y + Math.sin(this.aimAngle) * len);
        if (time >= this.modeUntil) {
          this.mode = 'chase';
          this.nextSneezeAt = time + this.cfg.sneezeEveryMs;
          this.say(pick(LINES.sneeze), 1200);
          sfx.sneeze();
          this.host.sneezeVolley(g.x, g.y, this.aimAngle);
        }
        break;
      }
      case 'leaving':
        if (Phaser.Math.Distance.Between(g.x, g.y, exit.x, exit.y) < this.cfg.escapeDistance) this.escape();
        break;
    }
  }

  private cough(time: number): void {
    const g = this.germ;
    const { player } = this.host;
    this.mode = 'chase';
    this.nextCoughAt = time + Phaser.Math.Between(...this.cfg.coughEveryMs);
    this.say(pick(LINES.cough), 1400);
    sfx.hurt();
    this.host.scene.cameras.main.shake(140, 0.004);
    this.drawCone(0.5);
    // Hurt Eugene if he's in the cone
    const d = Phaser.Math.Distance.Between(g.x, g.y, player.x, player.y);
    const off = Math.abs(Phaser.Math.Angle.Wrap(Phaser.Math.Angle.Between(g.x, g.y, player.x, player.y) - this.aimAngle));
    if (d < this.cfg.coughRange && off < Phaser.Math.DegToRad(this.cfg.coughConeDeg / 2)) this.host.damagePlayer(this.cfg.coughDamage);
    this.host.cough(g.x + Math.cos(this.aimAngle) * (g.def.radius + 20), g.y + Math.sin(this.aimAngle) * (g.def.radius + 20), this.aimAngle);
  }

  private escape(): void {
    const g = this.germ;
    this.done = true;
    this.say(pick(LINES.escaped), 3000);
    this.bubble.say(pick(LINES.escaped), { x: g.x, y: g.y }, g.def.radius + 18, 3000);
    events.emit(GameEvents.BossEscaped, { name: g.def.name });
    g.kill();
  }

  onHurt(_amount: number, time: number): void {
    if (!this.active || this.masked) return;
    this.compliance++;
    if (this.compliance >= this.cfg.complianceHits) {
      this.maskedUntil = time + this.cfg.maskedMs;
      if (this.mode !== 'leaving') this.mode = 'chase';
      this.say(pick(LINES.masked), 2600);
      sfx.tapeRip();
    }
  }

  onDefeated(): void {
    this.bubble.say(pick(LINES.defeat), { x: this.germ.x, y: this.germ.y }, this.germ.def.radius + 18, 3200);
    this.done = true;
    this.fx.clear();
  }

  onPlayerDown(): void {
    if (!this.active) return;
    this.say(pick(LINES.victory), 3000);
    this.done = true;
  }

  destroy(): void {
    this.fx.destroy();
    this.bubble.destroy();
  }

  private say(line: string, ms = 2400): void {
    if (!this.bubble.scene) return; // replaced by a newer boss before a delayed line came due
    this.bubble.say(dialogueText(line, { SURNAME: this.host.surname ?? 'MOSHKOVICH' }), this.germ, this.germ.def.radius + 18, ms);
    this.nextChatterAt = this.host.scene.time.now + ms + Phaser.Math.Between(4000, 7000);
  }

  private drawCone(alpha: number): void {
    const g = this.germ;
    const half = Phaser.Math.DegToRad(this.cfg.coughConeDeg / 2);
    this.fx.fillStyle(0xc5e1a5, alpha).slice(g.x, g.y, this.cfg.coughRange, this.aimAngle - half, this.aimAngle + half, false).fillPath();
  }

  /** A big blue surgical mask over his face while he's complying. */
  private drawMask(): void {
    const g = this.germ;
    const r = g.def.radius;
    const fx = g.x + Math.cos(g.rotation) * r * 0.55;
    const fy = g.y + Math.sin(g.rotation) * r * 0.55;
    this.fx.fillStyle(0x9fd0ee).fillCircle(fx, fy, r * 0.42);
    this.fx.lineStyle(3, 0x6fa9cf).strokeCircle(fx, fy, r * 0.42);
  }
}
