import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { sfx } from '../core/sfx';
import { EQUIPMENT } from '../data/equipment';
import { METHICILLIN_LINES as LINES, METHICILLIN_SOURCE_NAMES } from '../data/methicillin';
import type { Germ } from '../entities/Germ';
import type { BossBrain } from './BossBrain';
import type { BossHost } from './DiamondBrain';
import { SpeechBubble } from '../ui/SpeechBubble';

type Mode = 'chase' | 'shotWindup' | 'rollWindup' | 'rolling';

const pick = (lines: string[]): string => Phaser.Utils.Array.GetRandom(lines);

/**
 * BOSS #3: METHICILLIN THE UNKILLABLE, a bunch of armored staph grapes (round 15, 35...).
 * - Adaptive resistance: once one source (a tool, the signature move, a trap) has hurt him enough, he
 *   resists it (a label says which) until he forgets, or until another source catches up. Switch tools.
 * - The Lab autoclave is never resisted, and cooks him extra.
 * - Cluster Shot: fires grapes at Eugene that hatch into Basic Germs.
 * - Roll: curls up (a red line shows the lane), then bowls down it. Step aside.
 * - Three layers: the outer two peel off (shedding grapes), and his attacks come quicker each time.
 */
export class MethicillinBrain implements BossBrain {
  private readonly cfg = BALANCE.methicillin;
  private readonly bubble: SpeechBubble;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private mode: Mode = 'chase';
  private modeUntil = 0;
  private nextShotAt: number;
  private nextRollAt: number;
  private nextChatterAt: number;
  private aimAngle = 0;
  private rollTarget = { x: 0, y: 0 };
  /** Damage dealt by each source since he last adapted. */
  private readonly dealt = new Map<string, number>();
  /** The source he resists right now, and until when. */
  resisting?: string;
  private resistUntil = 0;
  /** Outer layers peeled off so far (0..2). */
  peeled = 0;
  private lastSteamLineAt = 0;
  private done = false;

  constructor(private readonly host: BossHost, readonly germ: Germ) {
    const now = host.scene.time.now;
    this.bubble = new SpeechBubble(host.scene);
    this.fx = host.scene.add.graphics().setDepth(11);
    this.label = host.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: '900', color: '#ffd166',
      stroke: '#3a2a00', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(31).setVisible(false);
    this.nextShotAt = now + this.cfg.firstShotMs;
    this.nextRollAt = now + Phaser.Math.Between(...this.cfg.rollEveryMs);
    this.nextChatterAt = now + 3000;
    host.scene.time.delayedCall(700, () => this.say(pick(LINES.arrive)));
  }

  private get active(): boolean {
    return !this.done && this.germ.active;
  }

  /** Attacks come quicker with every layer he's lost. */
  private get pace(): number {
    return this.cfg.peelPaceMult ** this.peeled;
  }

  get currentMode(): Mode {
    return this.mode;
  }

  get priorityTarget(): Germ | undefined {
    return undefined;
  }

  get ignoresContact(): boolean {
    return false;
  }

  contactDamage(): number | undefined {
    return this.mode === 'rolling' ? this.cfg.rollDamage : undefined;
  }

  /** What one hit from `source` does to him: resisted, normal, or (the autoclave) extra. */
  damageFactor(_g: Germ, source: string | undefined, time: number): number {
    const key = source ?? 'other';
    if (key === 'autoclave') return this.cfg.autoclaveMult;
    return key === this.resisting && time < this.resistUntil ? this.cfg.resisted : 1;
  }

  movement(): { target: { x: number; y: number }; speed: number } | undefined {
    if (!this.active) return undefined;
    switch (this.mode) {
      case 'shotWindup':
      case 'rollWindup':
        return { target: this.germ, speed: 0 };
      case 'rolling':
        return { target: this.rollTarget, speed: this.cfg.rollSpeed };
      default:
        return undefined;
    }
  }

  update(time: number): void {
    this.bubble.follow();
    this.fx.clear();
    this.label.setVisible(false);
    if (!this.active) return;
    const g = this.germ;
    const { player } = this.host;
    if (this.resisting && time >= this.resistUntil) {
      this.resisting = undefined;
      this.dealt.clear();
      this.say(pick(LINES.forgot), 1600);
    }
    if (this.resisting) {
      this.label.setText(`RESISTANT: ${this.sourceName(this.resisting).toUpperCase()}`)
        .setPosition(g.x, g.y + g.def.radius + 14).setVisible(true);
      this.fx.lineStyle(5, 0xffd166, 0.5 + 0.3 * Math.sin(time / 120)).strokeCircle(g.x, g.y, g.def.radius + 10);
    }
    if (player.dead) return;
    const toPlayer = Phaser.Math.Distance.Between(g.x, g.y, player.x, player.y);
    switch (this.mode) {
      case 'chase':
        if (time >= this.nextRollAt && toPlayer < this.cfg.rollRange) {
          this.mode = 'rollWindup';
          this.modeUntil = time + this.cfg.rollWindupMs;
          this.aimAngle = Phaser.Math.Angle.Between(g.x, g.y, player.x, player.y);
          this.say(pick(LINES.rollWindup), 1200);
          sfx.grumble();
        } else if (time >= this.nextShotAt && toPlayer < this.cfg.rollRange) {
          this.mode = 'shotWindup';
          this.modeUntil = time + this.cfg.shotWindupMs;
          this.host.scene.tweens.add({ targets: g, scale: 1.12, duration: this.cfg.shotWindupMs / 2, yoyo: true });
        } else if (time >= this.nextChatterAt) {
          this.say(pick(LINES.chatter));
        }
        break;
      case 'shotWindup':
        if (time >= this.modeUntil) this.clusterShot(time);
        break;
      case 'rollWindup': {
        // The red lane: where he'll bowl (aimed when he curled up, so you can step aside)
        const len = this.cfg.rollSpeed * (this.cfg.rollMs / 1000);
        g.rotation += 0.25;
        this.fx.lineStyle(g.def.radius * 1.6, 0xd7263d, 0.12 + 0.12 * Math.sin(time / 40))
          .lineBetween(g.x, g.y, g.x + Math.cos(this.aimAngle) * len, g.y + Math.sin(this.aimAngle) * len);
        if (time >= this.modeUntil) {
          this.mode = 'rolling';
          this.modeUntil = time + this.cfg.rollMs;
          this.rollTarget = { x: g.x + Math.cos(this.aimAngle) * 5000, y: g.y + Math.sin(this.aimAngle) * 5000 };
          this.say(pick(LINES.roll), 900);
          sfx.dash();
          this.host.scene.cameras.main.shake(160, 0.004);
        }
        break;
      }
      case 'rolling': {
        const body = g.body as Phaser.Physics.Arcade.Body;
        // Stops when the time's up or a wall stops him
        const stalled = time > this.modeUntil - this.cfg.rollMs + 300 && body.velocity.length() < this.cfg.rollSpeed * 0.25;
        if (time >= this.modeUntil || stalled) {
          this.mode = 'chase';
          this.nextRollAt = time + Phaser.Math.Between(...this.cfg.rollEveryMs) * this.pace;
          if (stalled) this.host.scene.cameras.main.shake(140, 0.006);
        }
        break;
      }
    }
  }

  /** CLUSTER SHOT: grapes fly at Eugene and hatch into germs. */
  private clusterShot(time: number): void {
    const g = this.germ;
    const { player } = this.host;
    this.mode = 'chase';
    this.nextShotAt = time + Phaser.Math.Between(...this.cfg.shotEveryMs) * this.pace;
    this.say(pick(LINES.shot), 1200);
    sfx.lob();
    const n = this.cfg.shotGrapes;
    const aim = Phaser.Math.Angle.Between(g.x, g.y, player.x, player.y);
    for (let i = 0; i < n; i++) {
      const a = aim + (i - (n - 1) / 2) * 0.3;
      const r = g.def.radius + 18;
      this.host.spawnMinion('basic', g.x + Math.cos(a) * r, g.y + Math.sin(a) * r, Math.cos(a) * this.cfg.shotSpeed, Math.sin(a) * this.cfg.shotSpeed);
    }
  }

  onHurt(amount: number, time: number, _g: Germ, source?: string): void {
    if (!this.active) return;
    const key = source ?? 'other';
    if (key === 'autoclave') {
      if (time - this.lastSteamLineAt > 3000) {
        this.lastSteamLineAt = time;
        this.say(pick(LINES.steamed), 1600);
      }
    } else if (key !== this.resisting || time >= this.resistUntil) {
      // Adapts to whatever has hurt him most since he last adapted
      const total = (this.dealt.get(key) ?? 0) + amount;
      this.dealt.set(key, total);
      if (total >= this.cfg.adaptAfter) {
        this.resisting = key;
        this.resistUntil = time + this.cfg.resistMs;
        this.dealt.clear();
        this.say(pick(LINES.adapted).replace('{TOOL}', this.sourceName(key)), 2400);
        sfx.tink();
      }
    }
    this.checkLayers();
  }

  /** The outer layers peel off at 2/3 and 1/3 health, shedding grapes. */
  private checkLayers(): void {
    const g = this.germ;
    const layers = this.cfg.layers;
    while (this.peeled < layers.length && g.hp / g.maxHp < layers[this.peeled]) {
      this.peeled++;
      g.setTexture(`germ-methicillin-${3 - this.peeled}`);
      this.say(pick(LINES.peel), 2000);
      sfx.splat();
      this.host.scene.cameras.main.shake(200, 0.008);
      const n = this.cfg.peelGerms;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const r = g.def.radius + 16;
        this.host.spawnMinion('basic', g.x + Math.cos(a) * r, g.y + Math.sin(a) * r, Math.cos(a) * 240, Math.sin(a) * 240);
      }
    }
  }

  /** What he calls a source of damage ("Squirt Bottle", "the hand dryer"...). */
  private sourceName(key: string): string {
    return METHICILLIN_SOURCE_NAMES[key] ?? EQUIPMENT[key]?.name ?? METHICILLIN_SOURCE_NAMES.other;
  }

  onDefeated(): void {
    this.bubble.say(pick(LINES.defeat), { x: this.germ.x, y: this.germ.y }, this.germ.def.radius + 18, 3200);
    this.done = true;
    this.fx.clear();
    this.label.setVisible(false);
  }

  onPlayerDown(): void {
    if (!this.active) return;
    this.say(pick(LINES.victory), 3000);
    this.done = true;
  }

  destroy(): void {
    this.fx.destroy();
    this.label.destroy();
    this.bubble.destroy();
  }

  private say(line: string, ms = 2400): void {
    if (!this.bubble.scene) return; // replaced by a newer boss before a delayed line came due
    this.bubble.say(line, this.germ, this.germ.def.radius + 18, ms);
    this.nextChatterAt = this.host.scene.time.now + ms + Phaser.Math.Between(4000, 7000);
  }
}
