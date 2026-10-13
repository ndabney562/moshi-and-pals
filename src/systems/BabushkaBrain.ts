import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { sfx } from '../core/sfx';
import { BABUSHKA_LINES } from '../data/babushka';
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

type Mode = 'chase' | 'haulWindup' | 'haul' | 'guiltWindup';

const pick = (lines: string[]): string => Phaser.Utils.Array.GetRandom(lines);

/**
 * Babushka Bacillus's behavior: whining, the Homesick Haul, Little Cousins and
 * the Guilt Trip. The germ itself is a normal pooled Germ; this class steers it.
 */
export class BabushkaBrain {
  private readonly cfg = BALANCE.babushka;
  private readonly bubble: SpeechBubble;
  private readonly yarn: Phaser.GameObjects.Graphics;
  private readonly hint: Phaser.GameObjects.Text;
  private mode: Mode = 'chase';
  private modeUntil = 0;
  private nextHaulAt: number;
  private nextGuiltAt = 0;
  private nextChatterAt: number;
  private haulStartedAt = 0;
  private haulDamage = 0;
  private sobs = 0;
  private done = false;

  constructor(private readonly host: BossHost, readonly germ: Germ) {
    const now = host.scene.time.now;
    this.bubble = new SpeechBubble(host.scene);
    this.yarn = host.scene.add.graphics().setDepth(11);
    this.hint = host.scene.add.text(0, 0, 'SPRAY HER TO BREAK FREE!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#3a1030', strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(31).setVisible(false);
    this.nextHaulAt = now + this.cfg.haulFirstMs;
    this.nextChatterAt = now + Phaser.Math.Between(...this.cfg.chatterMs);
    // Let her finish squeezing through the door before the first complaint
    host.scene.time.delayedCall(700, () => this.say(pick(BABUSHKA_LINES.arrive)));
  }

  get active(): boolean {
    return !this.done && this.germ.active;
  }

  /** While hauling, her yarn is the thing to spray, so auto-aim should pick her. */
  get priorityTarget(): Germ | undefined {
    return this.active && this.mode === 'haul' ? this.germ : undefined;
  }

  /** She doesn't body-slam Eugene while she has him on a string. */
  get ignoresContact(): boolean {
    return this.active && this.mode === 'haul';
  }

  /** How she wants to move this frame, or undefined to chase Eugene like any germ. */
  movement(): { target: { x: number; y: number }; speed: number } | undefined {
    // Once she is gone, her pooled germ may come back as someone else
    if (!this.active) return undefined;
    const { exit, player } = this.host;
    switch (this.mode) {
      case 'haul': {
        const atDoor = Phaser.Math.Distance.Between(this.germ.x, this.germ.y, exit.x, exit.y) < 150;
        return { target: exit, speed: atDoor ? 0 : this.cfg.haulWalkSpeed };
      }
      case 'haulWindup':
      case 'guiltWindup':
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
        if (this.hpFraction < this.cfg.guiltBelow && time >= this.nextGuiltAt) {
          this.startGuilt(time);
        } else if (
          time >= this.nextHaulAt && toPlayer < this.cfg.haulRange &&
          Phaser.Math.Distance.Between(player.x, player.y, exit.x, exit.y) > this.cfg.haulDoorDistance + 100
        ) {
          this.mode = 'haulWindup';
          this.modeUntil = time + this.cfg.haulWindupMs;
          this.say(pick(BABUSHKA_LINES.haulWindup));
          sfx.whine();
        } else if (time >= this.nextChatterAt) {
          this.say(pick(BABUSHKA_LINES.chatter));
          sfx.whine();
        }
        break;
      }
      case 'haulWindup':
        // The yarn flickers toward Eugene as a warning
        this.drawYarn(time, 0.35 + 0.3 * Math.sin(time / 40));
        if (time >= this.modeUntil) this.startHaul(time);
        break;
      case 'haul': {
        const dir = Phaser.Math.Angle.Between(player.x, player.y, exit.x, exit.y);
        player.pull.set(Math.cos(dir) * this.cfg.haulPullSpeed, Math.sin(dir) * this.cfg.haulPullSpeed);
        this.drawYarn(time, 1);
        if (Phaser.Math.Distance.Between(player.x, player.y, exit.x, exit.y) < this.cfg.haulDoorDistance) {
          this.reachDoor(time);
        } else if (time - this.haulStartedAt > this.cfg.haulMaxMs) {
          this.endHaul(time);
        }
        break;
      }
      case 'guiltWindup':
        if (time >= this.modeUntil) this.wail(time);
        break;
    }
  }

  /** Called with every hit of spray she takes. */
  onHurt(amount: number, time: number): void {
    if (!this.active || this.germ.hp <= 0) return;
    if (this.mode === 'haul') {
      this.haulDamage += amount;
      if (this.haulDamage >= this.cfg.haulBreakDamage) {
        this.say(pick(BABUSHKA_LINES.breakFree));
        sfx.yarnSnap();
        this.endHaul(time);
      }
    }
    // Little Cousins: one sob per chunk of health lost
    const owed = Math.floor((1 - this.hpFraction) / this.cfg.cousinsEvery);
    if (owed > this.sobs) {
      this.sobs = owed;
      this.sob();
    }
  }

  onDefeated(): void {
    this.release();
    this.mode = 'chase';
    // Pin the bubble where she fell: her pooled germ may be reused right away
    this.bubble.say(pick(BABUSHKA_LINES.defeat), { x: this.germ.x, y: this.germ.y }, this.germ.def.radius + 18, 3200);
    this.done = true;
  }

  onPlayerDown(): void {
    if (!this.active) return;
    this.release();
    this.say(pick(BABUSHKA_LINES.victory), 3000);
    this.done = true;
  }

  destroy(): void {
    this.release();
    this.yarn.destroy();
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

  private startHaul(time: number): void {
    this.mode = 'haul';
    this.haulStartedAt = time;
    this.haulDamage = 0;
    this.host.player.moveScale = this.cfg.haulMoveScale;
    this.say(pick(BABUSHKA_LINES.haul), this.cfg.haulMaxMs);
    sfx.yarnSnap();
  }

  private reachDoor(time: number): void {
    const { player, exit } = this.host;
    this.say(pick(BABUSHKA_LINES.door));
    this.host.damagePlayer(this.cfg.haulDoorDamage);
    this.endHaul(time);
    const away = Phaser.Math.Angle.Between(exit.x, exit.y, player.x, player.y);
    player.shove(Math.cos(away) * this.cfg.haulDoorShove, Math.sin(away) * this.cfg.haulDoorShove, 350);
  }

  private endHaul(time: number): void {
    this.release();
    this.mode = 'chase';
    this.nextHaulAt = time + this.cfg.haulCooldownMs;
  }

  /** Lets go of Eugene. */
  private release(): void {
    this.host.player.pull.set(0, 0);
    this.host.player.moveScale = 1;
    this.yarn.clear();
    this.hint.setVisible(false);
  }

  private sob(): void {
    this.say(pick(BABUSHKA_LINES.sob));
    sfx.whine();
    const n = this.cfg.cousinsPerSob;
    const r = this.germ.def.radius + 16;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = this.cfg.cousinsBurstSpeed;
      this.host.spawnMinion('cousin', this.germ.x + Math.cos(a) * r, this.germ.y + Math.sin(a) * r, Math.cos(a) * v, Math.sin(a) * v);
    }
  }

  private startGuilt(time: number): void {
    this.mode = 'guiltWindup';
    this.modeUntil = time + this.cfg.guiltWindupMs;
    this.say(pick(BABUSHKA_LINES.guilt));
    // Puffs up, trembling with disappointment
    this.host.scene.tweens.add({ targets: this.germ, scale: 1.18, duration: 110, yoyo: true, repeat: Math.floor(this.cfg.guiltWindupMs / 220) - 1 });
  }

  private wail(time: number): void {
    const { scene, player } = this.host;
    this.mode = 'chase';
    this.nextGuiltAt = time + this.cfg.guiltCooldownMs;
    sfx.wail();
    scene.cameras.main.shake(200, 0.006);
    const ring = scene.add.circle(this.germ.x, this.germ.y, this.cfg.guiltRadius)
      .setStrokeStyle(10, 0xff8fc8, 0.9).setFillStyle(0xff8fc8, 0.12).setDepth(7).setScale(0.15);
    scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => ring.destroy() });

    if (Phaser.Math.Distance.Between(this.germ.x, this.germ.y, player.x, player.y) <= this.cfg.guiltRadius + 22) {
      const away = Phaser.Math.Angle.Between(this.germ.x, this.germ.y, player.x, player.y);
      player.shove(Math.cos(away) * this.cfg.guiltShove, Math.sin(away) * this.cfg.guiltShove, this.cfg.guiltShoveMs);
      this.host.damagePlayer(this.cfg.guiltDamage);
    }
  }

  /** A wobbly line of red knitting yarn from her to Eugene. */
  private drawYarn(time: number, alpha: number): void {
    const { player } = this.host;
    const g = this.yarn.clear();
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

    if (this.mode === 'haul') {
      // BREAK FREE meter over Eugene's head
      const p = Math.min(1, this.haulDamage / this.cfg.haulBreakDamage);
      const w = 90, bx = player.x - w / 2, by = player.y - 64;
      g.fillStyle(0x000000, 0.55).fillRoundedRect(bx - 3, by - 3, w + 6, 16, 6);
      g.fillStyle(0x7fd3ff).fillRoundedRect(bx, by, Math.max(4, w * p), 10, 4);
      this.hint.setPosition(player.x, by - 6).setVisible(true);
    }
  }
}
