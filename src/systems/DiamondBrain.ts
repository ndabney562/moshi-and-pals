import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { sfx } from '../core/sfx';
import { DIAMOND_LINES } from '../data/diamond';
import type { Germ } from '../entities/Germ';
import type { Player } from '../entities/Player';
import { SpeechBubble } from '../ui/SpeechBubble';

/** What the brain needs from the game scene. */
export interface BossHost {
  readonly scene: Phaser.Scene;
  readonly player: Player;
  /** Where she is trying to drag Eugene. */
  readonly exit: { x: number; y: number };
  /** Spawns a germ at (x, y) flying off at (vx, vy). */
  spawnMinion(id: string, x: number, y: number, vx: number, vy: number): void;
  /** Hurts Eugene through the normal damage path (sound, HUD, death). */
  damagePlayer(amount: number): void;
}

type Mode = 'chase' | 'meetingWindup' | 'meeting' | 'tantrumWindup';

const pick = (lines: string[]): string => Phaser.Utils.Array.GetRandom(lines);

/**
 * Diamond the practice manager's behavior: grumbling, the Mandatory Meeting,
 * Write-Ups and the Policy Tantrum. The germ itself is a normal pooled Germ; this class steers it.
 */
export class DiamondBrain {
  private readonly cfg = BALANCE.diamond;
  private readonly bubble: SpeechBubble;
  private readonly tape: Phaser.GameObjects.Graphics;
  private readonly hint: Phaser.GameObjects.Text;
  private mode: Mode = 'chase';
  private modeUntil = 0;
  private nextMeetingAt: number;
  private nextTantrumAt = 0;
  private nextChatterAt: number;
  private meetingStartedAt = 0;
  private meetingDamage = 0;
  private batches = 0;
  private done = false;

  constructor(private readonly host: BossHost, readonly germ: Germ) {
    const now = host.scene.time.now;
    this.bubble = new SpeechBubble(host.scene);
    this.tape = host.scene.add.graphics().setDepth(11);
    this.hint = host.scene.add.text(0, 0, 'SPRAY HER TO BREAK FREE!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#3a1030', strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(31).setVisible(false);
    this.nextMeetingAt = now + this.cfg.meetingFirstMs;
    this.nextChatterAt = now + Phaser.Math.Between(...this.cfg.chatterMs);
    // Let her finish squeezing through the door before the first complaint
    host.scene.time.delayedCall(700, () => this.say(pick(DIAMOND_LINES.arrive)));
  }

  get active(): boolean {
    return !this.done && this.germ.active;
  }

  /** During a meeting, she is the thing to spray, so auto-aim should pick her. */
  get priorityTarget(): Germ | undefined {
    return this.active && this.mode === 'meeting' ? this.germ : undefined;
  }

  /** She doesn't body-slam Eugene while she has him on a string. */
  get ignoresContact(): boolean {
    return this.active && this.mode === 'meeting';
  }

  /** How she wants to move this frame, or undefined to chase Eugene like any germ. */
  movement(): { target: { x: number; y: number }; speed: number } | undefined {
    // Once she is gone, her pooled germ may come back as someone else
    if (!this.active) return undefined;
    const { exit, player } = this.host;
    switch (this.mode) {
      case 'meeting': {
        const atDoor = Phaser.Math.Distance.Between(this.germ.x, this.germ.y, exit.x, exit.y) < 150;
        return { target: exit, speed: atDoor ? 0 : this.cfg.meetingWalkSpeed };
      }
      case 'meetingWindup':
      case 'tantrumWindup':
        return { target: player, speed: 0 };
      default:
        return undefined;
    }
  }

  update(time: number): void {
    this.bubble.follow();
    if (!this.active) return;
    const { player, exit } = this.host;
    if (player.dead) return;
    const toPlayer = Phaser.Math.Distance.Between(this.germ.x, this.germ.y, player.x, player.y);

    switch (this.mode) {
      case 'chase': {
        if (this.hpFraction < this.cfg.tantrumBelow && time >= this.nextTantrumAt) {
          this.startTantrum(time);
        } else if (
          time >= this.nextMeetingAt && toPlayer < this.cfg.meetingRange &&
          Phaser.Math.Distance.Between(player.x, player.y, exit.x, exit.y) > this.cfg.meetingDoorDistance + 100
        ) {
          this.mode = 'meetingWindup';
          this.modeUntil = time + this.cfg.meetingWindupMs;
          this.say(pick(DIAMOND_LINES.meetingWindup));
          sfx.grumble();
        } else if (time >= this.nextChatterAt) {
          this.say(pick(DIAMOND_LINES.chatter));
          sfx.grumble();
        }
        break;
      }
      case 'meetingWindup':
        // The red tape flickers toward Eugene as a warning
        this.drawRedTape(time, 0.35 + 0.3 * Math.sin(time / 40));
        if (time >= this.modeUntil) this.startMeeting(time);
        break;
      case 'meeting': {
        const dir = Phaser.Math.Angle.Between(player.x, player.y, exit.x, exit.y);
        player.pull.set(Math.cos(dir) * this.cfg.meetingPullSpeed, Math.sin(dir) * this.cfg.meetingPullSpeed);
        this.drawRedTape(time, 1);
        if (Phaser.Math.Distance.Between(player.x, player.y, exit.x, exit.y) < this.cfg.meetingDoorDistance) {
          this.reachDoor(time);
        } else if (time - this.meetingStartedAt > this.cfg.meetingMaxMs) {
          this.endMeeting(time);
        }
        break;
      }
      case 'tantrumWindup':
        if (time >= this.modeUntil) this.stomp(time);
        break;
    }
  }

  /** Called with every hit of spray she takes. */
  onHurt(amount: number, time: number): void {
    if (!this.active || this.germ.hp <= 0) return;
    if (this.mode === 'meeting') {
      this.meetingDamage += amount;
      if (this.meetingDamage >= this.cfg.meetingBreakDamage) {
        this.say(pick(DIAMOND_LINES.breakFree));
        sfx.tapeRip();
        this.endMeeting(time);
      }
    }
    // Write-Ups: one batch per chunk of health lost
    const owed = Math.floor((1 - this.hpFraction) / this.cfg.writeUpsEvery);
    if (owed > this.batches) {
      this.batches = owed;
      this.throwWriteUps();
    }
  }

  onDefeated(): void {
    this.release();
    this.mode = 'chase';
    // Pin the bubble where she fell: her pooled germ may be reused right away
    this.bubble.say(pick(DIAMOND_LINES.defeat), { x: this.germ.x, y: this.germ.y }, this.germ.def.radius + 18, 3200);
    this.done = true;
  }

  onPlayerDown(): void {
    if (!this.active) return;
    this.release();
    this.say(pick(DIAMOND_LINES.victory), 3000);
    this.done = true;
  }

  destroy(): void {
    this.release();
    this.tape.destroy();
    this.hint.destroy();
    this.bubble.destroy();
  }

  private get hpFraction(): number {
    return this.germ.hp / this.germ.maxHp;
  }

  private say(line: string, ms: number = this.cfg.speechMs): void {
    this.bubble.say(line, this.germ, this.germ.def.radius + 18, ms);
    this.nextChatterAt = this.host.scene.time.now + ms + Phaser.Math.Between(...this.cfg.chatterMs);
  }

  private startMeeting(time: number): void {
    this.mode = 'meeting';
    this.meetingStartedAt = time;
    this.meetingDamage = 0;
    this.host.player.moveScale = this.cfg.meetingMoveScale;
    this.say(pick(DIAMOND_LINES.meeting), this.cfg.meetingMaxMs);
    sfx.tapeRip();
  }

  private reachDoor(time: number): void {
    const { player, exit } = this.host;
    this.say(pick(DIAMOND_LINES.door));
    this.host.damagePlayer(this.cfg.meetingDoorDamage);
    this.endMeeting(time);
    const away = Phaser.Math.Angle.Between(exit.x, exit.y, player.x, player.y);
    player.shove(Math.cos(away) * this.cfg.meetingDoorShove, Math.sin(away) * this.cfg.meetingDoorShove, 350);
  }

  private endMeeting(time: number): void {
    this.release();
    this.mode = 'chase';
    this.nextMeetingAt = time + this.cfg.meetingCooldownMs;
  }

  /** Lets go of Eugene. */
  private release(): void {
    this.host.player.pull.set(0, 0);
    this.host.player.moveScale = 1;
    this.tape.clear();
    this.hint.setVisible(false);
  }

  private throwWriteUps(): void {
    this.say(pick(DIAMOND_LINES.writeUps));
    sfx.grumble();
    const n = this.cfg.writeUpsPerBatch;
    const r = this.germ.def.radius + 16;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = this.cfg.writeUpsThrowSpeed;
      this.host.spawnMinion('writeUp', this.germ.x + Math.cos(a) * r, this.germ.y + Math.sin(a) * r, Math.cos(a) * v, Math.sin(a) * v);
    }
  }

  private startTantrum(time: number): void {
    this.mode = 'tantrumWindup';
    this.modeUntil = time + this.cfg.tantrumWindupMs;
    this.say(pick(DIAMOND_LINES.tantrum));
    // Puffs up, shaking with rage
    this.host.scene.tweens.add({ targets: this.germ, scale: 1.18, duration: 110, yoyo: true, repeat: Math.floor(this.cfg.tantrumWindupMs / 220) - 1 });
  }

  private stomp(time: number): void {
    const { scene, player } = this.host;
    this.mode = 'chase';
    this.nextTantrumAt = time + this.cfg.tantrumCooldownMs;
    sfx.tantrum();
    scene.cameras.main.shake(200, 0.006);
    const ring = scene.add.circle(this.germ.x, this.germ.y, this.cfg.tantrumRadius)
      .setStrokeStyle(10, 0xff6b35, 0.9).setFillStyle(0xff6b35, 0.12).setDepth(7).setScale(0.15);
    scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => ring.destroy() });

    if (Phaser.Math.Distance.Between(this.germ.x, this.germ.y, player.x, player.y) <= this.cfg.tantrumRadius + 22) {
      const away = Phaser.Math.Angle.Between(this.germ.x, this.germ.y, player.x, player.y);
      player.shove(Math.cos(away) * this.cfg.tantrumShove, Math.sin(away) * this.cfg.tantrumShove, this.cfg.tantrumShoveMs);
      this.host.damagePlayer(this.cfg.tantrumDamage);
    }
  }

  /** A wobbly strip of red tape from her to Eugene. */
  private drawRedTape(time: number, alpha: number): void {
    const { player } = this.host;
    const g = this.tape.clear();
    const x0 = this.germ.x, y0 = this.germ.y, x1 = player.x, y1 = player.y;
    const len = Phaser.Math.Distance.Between(x0, y0, x1, y1);
    const nx = -(y1 - y0) / (len || 1), ny = (x1 - x0) / (len || 1);
    g.lineStyle(5, 0xd7263d, alpha).beginPath().moveTo(x0, y0);
    const segs = 12;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const wave = Math.sin(t * Math.PI * 3 + time / 90) * 6 * Math.sin(t * Math.PI);
      g.lineTo(x0 + (x1 - x0) * t + nx * wave, y0 + (y1 - y0) * t + ny * wave);
    }
    g.strokePath();

    if (this.mode === 'meeting') {
      // BREAK FREE meter over Eugene's head
      const p = Math.min(1, this.meetingDamage / this.cfg.meetingBreakDamage);
      const w = 90, bx = player.x - w / 2, by = player.y - 64;
      g.fillStyle(0x000000, 0.55).fillRoundedRect(bx - 3, by - 3, w + 6, 16, 6);
      g.fillStyle(0x7fd3ff).fillRoundedRect(bx, by, Math.max(4, w * p), 10, 4);
      this.hint.setPosition(player.x, by - 6).setVisible(true);
    }
  }
}
