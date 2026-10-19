import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { sfx } from '../core/sfx';
import { INFLUENZA_LINES as LINES } from '../data/influenza';
import type { Germ } from '../entities/Germ';
import type { BossBrain } from './BossBrain';
import type { BossHost } from './DiamondBrain';
import { SpeechBubble } from '../ui/SpeechBubble';

/** What the twins need from the game on top of the usual boss host. */
export interface InfluenzaHost extends BossHost {
  /** One mucus glob from (x, y) heading at `angle`. */
  spit(x: number, y: number, angle: number): void;
  /** Whether nothing solid stands between two points. */
  lineClear(ax: number, ay: number, bx: number, by: number): boolean;
  /** Finishes off a germ the normal kill didn't reach (the twin already down): score, splat, gone. */
  finish(g: Germ): void;
  /** Updates the boss health bar (after a twin gets back up). */
  emitBar?(bar: { name: string; hp: number; maxHp: number }): void;
}

interface Twin {
  germ: Germ;
  bubble: SpeechBubble;
  /** Knocked out and waiting on its twin (0 = up). */
  downAt: number;
  countdown: Phaser.GameObjects.Text;
}

const pick = (lines: string[]): string => Phaser.Utils.Array.GetRandom(lines);

/**
 * BOSS #4: THE INFLUENZA TWINS, H & N (round 20, 40...). Two germs, one boss.
 * - They circle Eugene from opposite sides, joined by a strand that hurts if he touches it.
 * - Lure them around a wall: a wall between them snaps the strand and stuns both for a moment.
 * - Spiral Spit: one of them spins and spits a ring of globs.
 * - Knock one out and it goes down for 6 s: finish the other in time or the first gets back up.
 * - P2 ANTIGENIC SHIFT (half health): only one twin can really be hurt at a time, and they swap.
 */
export class InfluenzaBrain implements BossBrain {
  private readonly cfg = BALANCE.influenza;
  private readonly twins: [Twin, Twin];
  private readonly fx: Phaser.GameObjects.Graphics;
  /** The strand grows back then (0 = intact). */
  private snappedUntil = 0;
  private orbit = 0;
  private nextSpitAt: number;
  private spitter = 0;
  private nextChatterAt: number;
  /** Antigenic shift: started, which twin is vulnerable, and when they swap. */
  shifted = false;
  private vulnerable = 0;
  private nextShiftAt = 0;
  private done = false;

  constructor(private readonly host: InfluenzaHost, readonly germ: Germ, partner: Germ) {
    const now = host.scene.time.now;
    const twin = (g: Germ): Twin => ({
      germ: g,
      bubble: new SpeechBubble(host.scene),
      downAt: 0,
      countdown: host.scene.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: '900', color: '#ffffff', stroke: '#7b1f45', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(31).setVisible(false),
    });
    this.twins = [twin(germ), twin(partner)];
    this.fx = host.scene.add.graphics().setDepth(7.8);
    this.orbit = Phaser.Math.Angle.Between(host.player.x, host.player.y, germ.x, germ.y);
    this.nextSpitAt = now + Phaser.Math.Between(...this.cfg.spitEveryMs);
    this.nextChatterAt = now + 4000;
    host.scene.time.delayedCall(700, () => this.say(0, pick(LINES.arrive)));
  }

  get partner(): Germ {
    return this.twins[1].germ;
  }

  owns(g: Germ): boolean {
    return g === this.twins[0].germ || g === this.twins[1].germ;
  }

  private get active(): boolean {
    return !this.done && this.twins.some((t) => t.germ.active);
  }

  private twinOf(g: Germ): Twin | undefined {
    return this.twins.find((t) => t.germ === g);
  }

  private other(t: Twin): Twin {
    return t === this.twins[0] ? this.twins[1] : this.twins[0];
  }

  isDown(g: Germ): boolean {
    return (this.twinOf(g)?.downAt ?? 0) > 0;
  }

  /** The strand is there (both up, not snapped). */
  get tethered(): boolean {
    return this.snappedUntil === 0 && this.twins.every((t) => t.germ.active && !t.downAt);
  }

  /** While one is down, the other is the one to spray. */
  get priorityTarget(): Germ | undefined {
    if (!this.active) return undefined;
    const down = this.twins.find((t) => t.downAt);
    return down ? this.other(down).germ : undefined;
  }

  get ignoresContact(): boolean {
    return false;
  }

  contactDamage(g: Germ): number | undefined {
    return this.isDown(g) ? 0 : undefined;
  }

  bar(): { name: string; hp: number; maxHp: number } {
    const [a, b] = this.twins.map((t) => t.germ);
    return { name: a.def.bossTitle ?? a.def.name, hp: Math.max(0, a.hp) + Math.max(0, b.hp), maxHp: a.maxHp + b.maxHp };
  }

  /** A twin that's down can't be hurt; during the shift the protected one barely can. */
  damageFactor(g: Germ): number {
    const t = this.twinOf(g);
    if (!t) return 1;
    if (t.downAt) return 0;
    if (this.shifted && !this.other(t).downAt && this.twins[this.vulnerable] !== t) return this.cfg.shieldedDamageTaken;
    return 1;
  }

  /** A fatal hit on a twin: it goes down and waits for the other, unless the other is already down. */
  interceptKill(g: Germ, time: number): boolean {
    const t = this.twinOf(g);
    if (!t) return false;
    if (t.downAt) return true;
    if (this.other(t).downAt) return false; // both down: that's the win
    t.downAt = time;
    g.hp = 0;
    g.setVelocity(0, 0);
    g.setAlpha(0.55);
    sfx.splat();
    this.say(this.twins.indexOf(this.other(t)), pick(LINES.down).replace('{SECONDS}', String(Math.round(this.cfg.reviveMs / 1000))), 2200);
    return true;
  }

  movement(g: Germ): { target: { x: number; y: number }; speed: number } | undefined {
    const t = this.twinOf(g);
    if (!this.active || !t) return undefined;
    if (t.downAt) return { target: g, speed: 0 };
    // Opposite sides of a circle round Eugene, so the strand sweeps across him
    const { player } = this.host;
    const a = this.orbit + (t === this.twins[0] ? 0 : Math.PI);
    const target = { x: player.x + Math.cos(a) * this.cfg.orbitRadius, y: player.y + Math.sin(a) * this.cfg.orbitRadius };
    // A wall in the way: path round it like any germ
    if (!this.host.lineClear(g.x, g.y, target.x, target.y)) return undefined;
    return { target, speed: g.def.speed };
  }

  update(time: number): void {
    for (const t of this.twins) t.bubble.follow();
    this.fx.clear();
    if (!this.active) return;
    const { player } = this.host;
    const [h, n] = this.twins.map((t) => t.germ);
    this.orbit += Phaser.Math.DegToRad(this.cfg.orbitDegPerSec) * (this.host.scene.game.loop.delta / 1000);

    // Down and counting: finish the other one in time, or this one gets back up
    for (const t of this.twins) {
      const g = t.germ;
      if (!t.downAt) {
        t.countdown.setVisible(false);
        continue;
      }
      const left = this.cfg.reviveMs - (time - t.downAt);
      g.rotation += 0.05;
      t.countdown.setText(`💤 ${Math.ceil(left / 1000)}`).setPosition(g.x, g.y).setVisible(true);
      this.fx.lineStyle(5, 0xffffff, 0.7).beginPath()
        .arc(g.x, g.y, g.def.radius + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, left / this.cfg.reviveMs), false).strokePath();
      if (left <= 0) {
        t.downAt = 0;
        g.hp = g.maxHp * this.cfg.reviveHp;
        g.setAlpha(1);
        this.snappedUntil = 0;
        this.say(this.twins.indexOf(t), pick(LINES.revived), 2000);
        sfx.bossArrives();
        this.emitBar();
      }
    }

    // P2: antigenic shift
    const bar = this.bar();
    if (!this.shifted && bar.hp / bar.maxHp < this.cfg.shiftBelow) {
      this.shifted = true;
      this.nextShiftAt = time + this.cfg.shiftEveryMs;
      this.say(0, pick(LINES.shift), 1600);
    } else if (this.shifted && time >= this.nextShiftAt) {
      this.vulnerable = 1 - this.vulnerable;
      this.nextShiftAt = time + this.cfg.shiftEveryMs;
      if (this.twins.every((t) => !t.downAt)) this.say(this.vulnerable, pick(LINES.shift), 1400);
    }
    if (this.shifted && this.twins.every((t) => !t.downAt)) {
      // The protected twin wears a bubble; the open one gets a target ring
      const shielded = this.twins[1 - this.vulnerable].germ;
      const open = this.twins[this.vulnerable].germ;
      this.fx.lineStyle(6, 0x9ad7ff, 0.8).strokeCircle(shielded.x, shielded.y, shielded.def.radius + 12);
      this.fx.fillStyle(0x9ad7ff, 0.18).fillCircle(shielded.x, shielded.y, shielded.def.radius + 12);
      this.fx.lineStyle(3, 0xffe66d, 0.6 + 0.4 * Math.sin(time / 90)).strokeCircle(open.x, open.y, open.def.radius + 14);
    }

    // The strand between them
    if (this.snappedUntil && time >= this.snappedUntil) this.snappedUntil = 0;
    if (this.tethered) {
      if (!this.host.lineClear(h.x, h.y, n.x, n.y)) {
        this.snap(time);
      } else {
        const d = Phaser.Math.Distance.Between(h.x, h.y, n.x, n.y);
        const taut = Math.min(1, d / this.cfg.tetherMaxLength);
        this.fx.lineStyle(10, 0xd7263d, 0.25).lineBetween(h.x, h.y, n.x, n.y);
        this.fx.lineStyle(4, 0xf8bbd0, 0.6 + 0.4 * taut).lineBetween(h.x, h.y, n.x, n.y);
        if (!player.dead && this.touchesStrand(player.x, player.y, h, n)) this.host.damagePlayer(this.cfg.tetherDamage);
      }
    }

    if (player.dead) return;
    // Spiral spit, taking turns
    if (time >= this.nextSpitAt) {
      this.nextSpitAt = time + Phaser.Math.Between(...this.cfg.spitEveryMs);
      const t = this.twins[this.spitter];
      this.spitter = 1 - this.spitter;
      if (!t.downAt && t.germ.active) this.spiral(t);
    } else if (time >= this.nextChatterAt) {
      this.say(Phaser.Math.Between(0, 1), pick(LINES.chatter));
    }
  }

  /** Eugene is on the strand (not just next to one of the twins). */
  private touchesStrand(x: number, y: number, a: Germ, b: Germ): boolean {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return false;
    const k = Phaser.Math.Clamp(((x - a.x) * dx + (y - a.y) * dy) / len2, 0, 1);
    const px = a.x + dx * k, py = a.y + dy * k;
    if (Phaser.Math.Distance.Between(px, py, a.x, a.y) < a.def.radius || Phaser.Math.Distance.Between(px, py, b.x, b.y) < b.def.radius) return false;
    return Phaser.Math.Distance.Between(x, y, px, py) < this.cfg.tetherWidth + 20;
  }

  /** A wall came between them: the strand snaps and both reel. */
  snap(time: number): void {
    this.snappedUntil = time + this.cfg.regrowMs;
    for (const t of this.twins) t.germ.stun(time, this.cfg.snapStunMs);
    const [h, n] = this.twins.map((t) => t.germ);
    const flash = this.host.scene.add.line(0, 0, h.x, h.y, n.x, n.y, 0xffffff).setOrigin(0).setLineWidth(6).setDepth(12);
    this.host.scene.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
    this.say(0, pick(LINES.snapped), 1600);
    sfx.tapeRip();
  }

  /** SPIRAL SPIT: a turning ring of globs. */
  private spiral(t: Twin): void {
    const cfg = this.cfg;
    const g = t.germ;
    this.say(this.twins.indexOf(t), pick(LINES.spit), 1200);
    const start = Phaser.Math.Angle.Between(g.x, g.y, this.host.player.x, this.host.player.y);
    for (let i = 0; i < cfg.spitGlobs; i++) {
      this.host.scene.time.delayedCall(i * cfg.spitIntervalMs, () => {
        if (this.done || !g.active || t.downAt) return;
        const a = start + Phaser.Math.DegToRad(cfg.spitStepDeg * i);
        this.host.spit(g.x + Math.cos(a) * (g.def.radius + 10), g.y + Math.sin(a) * (g.def.radius + 10), a);
        if (i % 2 === 0) sfx.sneeze();
      });
    }
  }

  onHurt(): void {
    // Everything happens in damageFactor / interceptKill / update
  }

  /** The second twin fell while the first was down: both are done. */
  onDefeated(): void {
    const last = this.twins.find((t) => t.germ.active && !t.downAt) ?? this.twins[0];
    last.bubble.say(pick(LINES.defeat), { x: last.germ.x, y: last.germ.y }, last.germ.def.radius + 18, 3200);
    for (const t of this.twins) {
      t.countdown.setVisible(false);
      if (t.downAt && t.germ.active) {
        t.germ.setAlpha(1);
        this.host.finish(t.germ);
      }
    }
    this.done = true;
    this.fx.clear();
  }

  onPlayerDown(): void {
    if (!this.active) return;
    this.say(0, pick(LINES.victory), 3000);
    this.done = true;
  }

  destroy(): void {
    this.fx.destroy();
    for (const t of this.twins) {
      t.bubble.destroy();
      t.countdown.destroy();
    }
  }

  private emitBar(): void {
    this.host.emitBar?.(this.bar());
  }

  private say(i: number, line: string, ms = 2400): void {
    const t = this.twins[i];
    if (!t?.bubble.scene) return; // replaced by a newer boss before a delayed line came due
    if (!t.germ.active || t.downAt) return;
    t.bubble.say(line, t.germ, t.germ.def.radius + 18, ms);
    this.nextChatterAt = this.host.scene.time.now + ms + Phaser.Math.Between(4000, 7000);
  }
}
