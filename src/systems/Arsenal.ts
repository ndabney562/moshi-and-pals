import Phaser from 'phaser';
import { sfx } from '../core/sfx';
import type { EquipmentDef, ToolAttack } from '../data/equipment';
import type { Germ } from '../entities/Germ';
import type { Puddles } from './Puddles';

/** What the non-spray tools need from the game scene. */
export interface ArsenalHost {
  readonly scene: Phaser.Scene;
  /** Living germs. */
  germs(): Germ[];
  /** No wall between the two points. */
  lineClear(x1: number, y1: number, x2: number, y2: number): boolean;
  /** One hit from a tool: effectiveness, crits, armor and the damage itself. */
  hit(g: Germ, def: EquipmentDef, damage: number, angle: number, knockback: number, pierces: boolean): void;
  /** Sticky gel on the floor that slows germs. */
  readonly gel: Puddles;
  /** Where auto-aim is pointing, if anywhere (the Gel Launcher lands its glob there). */
  aimTarget(): { x: number; y: number } | undefined;
  /** Floating text. */
  say(x: number, y: number, text: string, color: string, size: number): void;
}

const TAU = Math.PI * 2;
const wrap = (a: number) => Phaser.Math.Angle.Wrap(a);

/**
 * The tools that don't spray: DISINFECTANT WIPES (a melee sweep), the GEL LAUNCHER (a lobbed glob that
 * bursts and leaves sticky gel) and DEFIB PADDLES (a zap that jumps from germ to germ). The Sprayer runs
 * their supply and timing like any other tool, then hands each shot to `fire` here.
 */
export class Arsenal {
  constructor(private readonly host: ArsenalHost) {}

  /** One use of `def` from (x, y) toward `angle`. `shot` counts this tool's uses (for every-Nth tricks). */
  fire(def: EquipmentDef, x: number, y: number, angle: number, time: number, shot: number, damageMult: number): void {
    const a = def.attack!;
    switch (a.kind) {
      case 'swipe': return this.swipe(def, a, x, y, angle, shot, damageMult);
      case 'lob': return this.lob(def, a, x, y, angle, damageMult);
      case 'chain': return this.chain(def, a, x, y, angle, time, damageMult);
    }
  }

  /** WIPES: everything in the arc in front of Eugene gets wiped down. Every few swipes is a big one. */
  private swipe(def: EquipmentDef, a: Extract<ToolAttack, { kind: 'swipe' }>, x: number, y: number, angle: number, shot: number, mult: number): void {
    const big = shot % a.bigEvery === 0;
    const reach = big ? a.bigReach : a.reach;
    const half = Phaser.Math.DegToRad(a.arcDeg) / 2;
    for (const g of this.host.germs()) {
      const d = Phaser.Math.Distance.Between(x, y, g.x, g.y);
      if (d - g.def.radius > reach) continue;
      const to = Phaser.Math.Angle.Between(x, y, g.x, g.y);
      // Point-blank germs count even if they're a little off to the side
      if (Math.abs(wrap(to - angle)) > half && d > g.def.radius + 12) continue;
      if (!this.host.lineClear(x, y, g.x, g.y)) continue;
      this.host.hit(g, def, def.damage * mult * (big ? a.bigMult : 1), to, def.knockback * (big ? 1.8 : 1), false);
    }
    // A white arc sweeping across
    const s = this.host.scene;
    const gfx = s.add.graphics().setDepth(12).setPosition(x, y);
    const from = angle - half;
    const to = angle + half;
    gfx.fillStyle(0xffffff, big ? 0.4 : 0.25).slice(0, 0, reach, from, to, false).fillPath();
    gfx.lineStyle(big ? 8 : 5, 0xe8fff9, 0.9).beginPath().arc(0, 0, reach, from, to, false).strokePath();
    gfx.setScale(0.6);
    s.tweens.add({ targets: gfx, scale: 1, alpha: 0, duration: big ? 220 : 150, ease: 'Cubic.out', onComplete: () => gfx.destroy() });
    sfx.swipe(big);
    if (big) this.host.say(x, y - 64, 'DEEP CLEAN!', '#ffe66d', 22);
  }

  /** GEL LAUNCHER: a glob arcs to where Eugene's aiming (or as far as it goes), bursts, and leaves sticky gel. */
  private lob(def: EquipmentDef, a: Extract<ToolAttack, { kind: 'lob' }>, x: number, y: number, angle: number, mult: number): void {
    const target = this.host.aimTarget();
    let dist = def.range;
    if (target) dist = Math.min(def.range, Phaser.Math.Distance.Between(x, y, target.x, target.y));
    // Stop short of the first wall
    let lo = 0;
    let hi = dist;
    if (!this.host.lineClear(x, y, x + Math.cos(angle) * dist, y + Math.sin(angle) * dist)) {
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        if (this.host.lineClear(x, y, x + Math.cos(angle) * mid, y + Math.sin(angle) * mid)) lo = mid;
        else hi = mid;
      }
      dist = Math.max(0, lo - 12);
    }
    const lx = x + Math.cos(angle) * dist;
    const ly = y + Math.sin(angle) * dist;
    const s = this.host.scene;
    sfx.lob();
    const glob = s.add.image(x, y, 'glob').setTint(def.color).setDepth(14).setScale(0.8);
    const shadow = s.add.ellipse(x, y, 22, 12, 0x000000, 0.25).setDepth(2);
    const flight = { t: 0 };
    s.tweens.add({
      targets: flight, t: 1, duration: a.flightMs,
      onUpdate: () => {
        const t = flight.t;
        const px = Phaser.Math.Linear(x, lx, t);
        const py = Phaser.Math.Linear(y, ly, t);
        const lift = Math.sin(t * Math.PI) * Math.min(90, 30 + dist * 0.25);
        glob.setPosition(px, py - lift).setScale(0.8 + 0.5 * Math.sin(t * Math.PI)).setRotation(t * TAU);
        shadow.setPosition(px, py);
      },
      onComplete: () => {
        glob.destroy();
        shadow.destroy();
        this.burst(def, a, lx, ly, mult);
      },
    });
  }

  private burst(def: EquipmentDef, a: Extract<ToolAttack, { kind: 'lob' }>, x: number, y: number, mult: number): void {
    const s = this.host.scene;
    for (const g of this.host.germs()) {
      if (Phaser.Math.Distance.Between(x, y, g.x, g.y) > a.blastRadius + g.def.radius) continue;
      if (!this.host.lineClear(x, y, g.x, g.y)) continue;
      this.host.hit(g, def, def.damage * mult, Phaser.Math.Angle.Between(x, y, g.x, g.y), def.knockback, true);
    }
    sfx.splat();
    this.host.gel.add(x, y, a.puddleRadius, a.puddleMs, a.puddleSlow, s.time.now, a.puddleDps);
    const ring = s.add.circle(x, y, a.blastRadius).setStrokeStyle(8, def.color, 0.9).setFillStyle(def.color, 0.25).setDepth(13).setScale(0.2);
    s.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 260, ease: 'Cubic.out', onComplete: () => ring.destroy() });
  }

  /** DEFIB PADDLES: "CLEAR!" Zaps the germ in front of Eugene, then jumps to the next nearest, and the next. */
  private chain(def: EquipmentDef, a: Extract<ToolAttack, { kind: 'chain' }>, x: number, y: number, angle: number, time: number, mult: number): void {
    const germs = this.host.germs();
    // First target: the closest one in front, within reach
    let first: Germ | undefined;
    let best = Infinity;
    for (const g of germs) {
      const d = Phaser.Math.Distance.Between(x, y, g.x, g.y) - g.def.radius;
      if (d > a.reach || d >= best) continue;
      if (Math.abs(wrap(Phaser.Math.Angle.Between(x, y, g.x, g.y) - angle)) > Math.PI / 2.5 && d > 20) continue;
      if (!this.host.lineClear(x, y, g.x, g.y)) continue;
      best = d;
      first = g;
    }
    const points: { x: number; y: number }[] = [{ x, y }];
    const hit = new Set<Germ>();
    let at = first;
    let damage = def.damage * mult;
    for (let i = 0; at && i <= a.jumps; i++) {
      hit.add(at);
      points.push({ x: at.x, y: at.y });
      const from = at;
      this.host.hit(from, def, damage, Phaser.Math.Angle.Between(x, y, from.x, from.y), def.knockback, true);
      if (from.active) from.stun(time, a.stunMs);
      damage *= a.falloff;
      at = undefined;
      let near = a.jumpRange;
      for (const g of germs) {
        if (hit.has(g) || !g.active) continue;
        const d = Phaser.Math.Distance.Between(from.x, from.y, g.x, g.y);
        if (d < near && this.host.lineClear(from.x, from.y, g.x, g.y)) { near = d; at = g; }
      }
    }
    // A jagged bolt along the chain (or a little spark at the paddles if there was no one to zap)
    const s = this.host.scene;
    const gfx = s.add.graphics().setDepth(14);
    if (points.length === 1) points.push({ x: x + Math.cos(angle) * 40, y: y + Math.sin(angle) * 40 });
    for (const [w, color, alpha] of [[9, 0x7fd3ff, 0.45], [3, 0xffffff, 1]] as const) {
      gfx.lineStyle(w, color, alpha).beginPath().moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        for (let k = 1; k <= 4; k++) {
          const t = k / 4;
          const jitter = k === 4 ? 0 : Phaser.Math.Between(-12, 12);
          gfx.lineTo(Phaser.Math.Linear(p0.x, p1.x, t) + jitter, Phaser.Math.Linear(p0.y, p1.y, t) + jitter);
        }
      }
      gfx.strokePath();
    }
    s.tweens.add({ targets: gfx, alpha: 0, duration: 200, onComplete: () => gfx.destroy() });
    sfx.zap();
    this.host.say(x, y - 64, hit.size > 1 ? `CLEAR! ×${hit.size}` : 'CLEAR!', '#7fd3ff', 22);
  }
}
