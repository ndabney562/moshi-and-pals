import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { staffBoost } from '../core/progress';
import { sfx } from '../core/sfx';
import { SCRIBES, type ScribeDef, type ScribeId } from '../data/scribes';
import type { Germ } from '../entities/Germ';
import type { Patient } from '../entities/Patient';
import type { Player } from '../entities/Player';
import { SpeechBubble } from '../ui/SpeechBubble';
import type { FlowField } from './FlowField';
import type { Fx } from './Fx';
import type { PatientDirector } from './PatientDirector';

/** What the scribes need from the game scene. */
export interface ScribeHost {
  readonly scene: Phaser.Scene;
  readonly player: Player;
  readonly flow: FlowField;
  readonly fx: Fx;
  readonly patients: PatientDirector;
  germs(): Germ[];
  /** Hurts a germ through the normal damage path (numbers, kills, Copays). */
  hit(germ: Germ, damage: number, angle: number, knockback: number): void;
  /** Whether two points are on the same floor of the clinic. */
  sameFloor(x0: number, y0: number, x1: number, y1: number): boolean;
  /** Whether two points are in the same room (no walls between, only furniture). */
  sameRoom(x0: number, y0: number, x1: number, y1: number): boolean;
  /** A scribe got a patient to clean up (the reward itself goes through the patient director). */
  onClean(id: ScribeId): void;
}

const pick = (lines: string[]): string => Phaser.Utils.Array.GetRandom(lines);

/** One scribe on the floor. No physics body: they walk around (or through) everything and never block Eugene. */
class Scribe {
  readonly img: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  readonly bubble: SpeechBubble;
  until = 0;
  nextAttackAt = 0;
  nextCleanAt = 0;
  nextChatterAt = 0;
  /** For "stuck" detection: the best distance to Eugene lately, and when it last improved. */
  bestDist = Infinity;
  bestAt = 0;
  step = 0;
  kills = 0;
  cleaned = 0;
  /** Their staff upgrades (read when they're summoned). */
  boost = { power: 1, speed: 1, duration: 1 };

  constructor(scene: Phaser.Scene, readonly def: ScribeDef, readonly side: number) {
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(9).setVisible(false);
    this.img = scene.add.image(0, 0, `scribe-${def.id}`).setDepth(9.8).setVisible(false);
    this.bubble = new SpeechBubble(scene);
  }

  get here(): boolean {
    return this.img.visible;
  }
}

/**
 * THE SCRIBES (and Donald, the X-ray tech): Omar and Alan follow Eugene around for a while (a power-up), attack germs near him and
 * shame violating patients into cleaning up. Cheap on purpose: simple steering toward a spot behind Eugene,
 * the germs' flow field when a wall is in the way, and a teleport when they're left behind or stuck.
 */
export class Scribes {
  private readonly cfg = BALANCE.scribes;
  readonly list: Scribe[];
  private readonly v = new Phaser.Math.Vector2();

  constructor(private readonly host: ScribeHost) {
    // Omar off one shoulder, Alan off the other, Donald right behind
    // (The front desk PSRs work the desk instead: systems/FrontDesk.ts)
    this.list = SCRIBES.filter((d) => !d.desk).map((def, i) => new Scribe(host.scene, def, [-1, 1, 0][i % 3]));
  }

  /** Brings a scribe in for `ms` (or keeps one already here for longer). */
  summon(id: ScribeId, time: number, ms: number): void {
    const s = this.list.find((x) => x.def.id === id);
    if (!s) return;
    s.boost = staffBoost(id);
    s.until = Math.max(s.until, time + ms);
    if (s.here) return;
    const { player, flow } = this.host;
    // Walks in from just behind Eugene (or right next to him if that's inside a wall)
    const ba = player.rotation + Math.PI + s.side * 0.9;
    const bx = player.x + Math.cos(ba) * 100;
    const by = player.y + Math.sin(ba) * 100;
    if (flow.lineClear(player.x, player.y, bx, by)) this.place(s, bx, by);
    else this.place(s, player.x, player.y);
    s.img.setAlpha(0).setVisible(true);
    s.shadow.setVisible(true);
    this.host.scene.tweens.add({ targets: s.img, alpha: 1, duration: 300 });
    s.nextAttackAt = time + 400;
    s.nextChatterAt = time + 4000;
    s.bestDist = Infinity;
    s.bestAt = time;
    s.bubble.say(pick(s.def.lines.arrive), s.img, 44, 2000);
  }

  /** The scribe here now (tests, debug). */
  get(id: ScribeId): Scribe | undefined {
    return this.list.find((s) => s.def.id === id && s.here);
  }

  update(time: number, dtMs: number): void {
    for (const s of this.list) {
      s.bubble.follow();
      if (!s.here) continue;
      if (time >= s.until) {
        this.dismiss(s);
        continue;
      }
      if (this.host.player.dead) continue;
      this.think(s, time, dtMs);
    }
  }

  private think(s: Scribe, time: number, dtMs: number): void {
    const { player, flow } = this.host;
    const img = s.img;
    const cfg = this.cfg;

    // Germs first; with none in reach, the nearest patient with a violation on record. In the same room
    // they step over the seats to get to one (furniture, no walls); otherwise they need a clear line.
    const xray = s.def.id === 'donald';
    const germ = this.nearestGerm(img.x, img.y, xray ? cfg.donald.range : cfg.range, xray);
    const patient = germ ? undefined : this.host.patients.nearestViolator(img.x, img.y, cfg.cleanRange * 1.8,
      (p) => p.violations > 0 && (this.host.sameRoom(img.x, img.y, p.x, p.y) || flow.lineClear(img.x, img.y, p.x, p.y)));

    // Left behind, on another floor, or stuck behind something: catch up
    const toPlayer = Phaser.Math.Distance.Between(img.x, img.y, player.x, player.y);
    if (toPlayer < s.bestDist - 10 || patient) {
      s.bestDist = toPlayer;
      s.bestAt = time;
    }
    const stuck = toPlayer > cfg.followDistance * 2.5 && time - s.bestAt > cfg.stuckMs;
    if (toPlayer > cfg.teleportDistance || stuck || !this.host.sameFloor(img.x, img.y, player.x, player.y)) {
      this.teleport(s, time);
      return;
    }

    if (germ && time >= s.nextAttackAt) this.attack(s, germ, time);
    if (patient && time >= s.nextCleanAt && Phaser.Math.Distance.Between(img.x, img.y, patient.x, patient.y) < cfg.cleanRange) {
      this.clean(s, patient, time);
    }

    // Where to stand: near the patient being shamed, or a step behind Eugene off to one side
    let tx: number, ty: number;
    if (patient) {
      const a = Phaser.Math.Angle.Between(patient.x, patient.y, img.x, img.y);
      tx = patient.x + Math.cos(a) * cfg.cleanRange * 0.55;
      ty = patient.y + Math.sin(a) * cfg.cleanRange * 0.55;
    } else {
      const a = player.rotation + Math.PI + s.side * 0.9;
      tx = player.x + Math.cos(a) * cfg.followDistance;
      ty = player.y + Math.sin(a) * cfg.followDistance;
    }
    const d = Phaser.Math.Distance.Between(img.x, img.y, tx, ty);
    let moving = false;
    if (d > 10) {
      let gx = tx, gy = ty;
      const overSeats = !!patient && this.host.sameRoom(img.x, img.y, tx, ty);
      if (!overSeats && !flow.lineClear(img.x, img.y, tx, ty)) {
        // A wall in the way: take the germs' route toward Eugene
        if (flow.nextStep(img.x, img.y, this.v)) {
          gx = this.v.x;
          gy = this.v.y;
        } else {
          gx = player.x;
          gy = player.y;
        }
      }
      const a = Phaser.Math.Angle.Between(img.x, img.y, gx, gy);
      const speed = cfg.speed * (d > 220 ? 1.5 : 1) * (dtMs / 1000);
      const stepLen = Math.min(speed, d);
      this.place(s, img.x + Math.cos(a) * stepLen, img.y + Math.sin(a) * stepLen);
      if (!germ && !patient) img.rotation = Phaser.Math.Angle.RotateTo(img.rotation, a, 0.15);
      moving = true;
    }
    if (germ) img.rotation = Phaser.Math.Angle.RotateTo(img.rotation, Phaser.Math.Angle.Between(img.x, img.y, germ.x, germ.y), 0.3);
    else if (patient) img.rotation = Phaser.Math.Angle.RotateTo(img.rotation, Phaser.Math.Angle.Between(img.x, img.y, patient.x, patient.y), 0.3);
    // Little walk bob, like Eugene's
    s.step += moving ? dtMs / 110 : 0;
    const bob = moving ? Math.sin(s.step) * 0.05 : 0;
    img.setScale(1 + bob, 1 - bob);
  }

  /** The nearest germ in reach: in sight, or with `throughWalls` (X-rays) anywhere on the same floor. */
  private nearestGerm(x: number, y: number, range: number, throughWalls = false): Germ | undefined {
    let best: Germ | undefined;
    let bestD = range * range;
    for (const g of this.host.germs()) {
      if (!g.active) continue;
      const d = (g.x - x) ** 2 + (g.y - y) ** 2;
      if (d >= bestD) continue;
      const seen = throughWalls ? this.host.sameFloor(x, y, g.x, g.y) : this.host.flow.lineClear(x, y, g.x, g.y);
      if (seen) { bestD = d; best = g; }
    }
    return best;
  }

  /** Omar sprays the nearest germ; Alan zaps it and jumps to the next ones; Donald X-rays everything in a line. */
  private attack(s: Scribe, germ: Germ, time: number): void {
    const { fx } = this.host;
    const img = s.img;
    const a = Phaser.Math.Angle.Between(img.x, img.y, germ.x, germ.y);
    if (s.def.id === 'omar') {
      const c = this.cfg.omar;
      s.nextAttackAt = time + c.everyMs * s.boost.speed;
      fx.nozzleMist(img.x + Math.cos(a) * 26, img.y + Math.sin(a) * 26, a, 18, s.def.color, 4);
      sfx.spray();
      this.strike(s, germ, c.damage, a, c.knockback);
    } else if (s.def.id === 'donald') {
      const c = this.cfg.donald;
      s.nextAttackAt = time + c.everyMs * s.boost.speed;
      const ux = Math.cos(a), uy = Math.sin(a);
      this.beam(img.x + ux * 24, img.y + uy * 24, a, c.range, c.width, s.def.color);
      sfx.zap();
      for (const g of this.host.germs()) {
        if (!g.active || !this.host.sameFloor(img.x, img.y, g.x, g.y)) continue;
        // Along the beam and close enough to its line
        const along = (g.x - img.x) * ux + (g.y - img.y) * uy;
        const off = Math.abs((g.x - img.x) * uy - (g.y - img.y) * ux);
        if (along < 0 || along > c.range || off > c.width + g.displayWidth / 2) continue;
        this.strike(s, g, c.damage, a, c.knockback);
        if (g.active) g.stun(time, c.stunMs);
      }
    } else {
      const c = this.cfg.alan;
      s.nextAttackAt = time + c.everyMs * s.boost.speed;
      const chain: Germ[] = [germ];
      let from = germ;
      for (let i = 0; i < c.chain; i++) {
        let next: Germ | undefined;
        let bestD = c.chainRange * c.chainRange;
        for (const g of this.host.germs()) {
          if (!g.active || chain.includes(g)) continue;
          const d = (g.x - from.x) ** 2 + (g.y - from.y) ** 2;
          if (d < bestD) { bestD = d; next = g; }
        }
        if (!next) break;
        chain.push(next);
        from = next;
      }
      this.zapLine(img.x + Math.cos(a) * 24, img.y + Math.sin(a) * 24, chain, s.def.color);
      sfx.zap();
      let px = img.x, py = img.y;
      for (const g of chain) {
        const ga = Phaser.Math.Angle.Between(px, py, g.x, g.y);
        px = g.x;
        py = g.y;
        this.strike(s, g, c.damage, ga, c.knockback);
        if (g.active) g.stun(time, c.stunMs);
      }
    }
    if (time >= s.nextChatterAt && Math.random() < 0.35) {
      s.nextChatterAt = time + 5000;
      s.bubble.say(pick(s.def.lines.attack), s.img, 44, 1500);
    }
  }

  private strike(s: Scribe, g: Germ, damage: number, angle: number, knockback: number): void {
    if (!g.active) return;
    this.host.hit(g, damage * s.boost.power, angle, knockback);
    if (!g.active) s.kills++;
  }

  /** Donald's X-ray: a pale glowing band that flashes and fades. */
  private beam(x: number, y: number, angle: number, range: number, width: number, color: number): void {
    const ex = x + Math.cos(angle) * range;
    const ey = y + Math.sin(angle) * range;
    const gfx = this.host.scene.add.graphics().setDepth(12);
    gfx.lineStyle(width * 2, color, 0.25).lineBetween(x, y, ex, ey);
    gfx.lineStyle(width * 0.7, color, 0.55).lineBetween(x, y, ex, ey);
    gfx.lineStyle(3, 0xffffff, 0.9).lineBetween(x, y, ex, ey);
    this.host.scene.tweens.add({ targets: gfx, alpha: 0, duration: 260, onComplete: () => gfx.destroy() });
  }

  /** A jagged blue zap through every germ in the chain. */
  private zapLine(x: number, y: number, chain: Germ[], color: number): void {
    const gfx = this.host.scene.add.graphics().setDepth(12);
    gfx.lineStyle(4, color, 0.95).beginPath().moveTo(x, y);
    let px = x, py = y;
    for (const g of chain) {
      for (let i = 1; i <= 3; i++) {
        const t = i / 3;
        const j = i < 3 ? Phaser.Math.Between(-10, 10) : 0;
        gfx.lineTo(px + (g.x - px) * t + j, py + (g.y - py) * t - j);
      }
      px = g.x;
      py = g.y;
    }
    gfx.strokePath();
    this.host.scene.tweens.add({ targets: gfx, alpha: 0, duration: 180, onComplete: () => gfx.destroy() });
  }

  /** The same thing Eugene's droplets do to a patient: one "spray" of shame. */
  private clean(s: Scribe, p: Patient, time: number): void {
    s.nextCleanAt = time + this.cfg.cleanEveryMs;
    const a = Phaser.Math.Angle.Between(s.img.x, s.img.y, p.x, p.y);
    this.host.fx.nozzleMist(s.img.x + Math.cos(a) * 24, s.img.y + Math.sin(a) * 24, a, 14, s.def.color, 2);
    if (this.host.patients.sprayed(p)) {
      s.cleaned++;
      s.bubble.say(pick(s.def.lines.clean), s.img, 44, 1800);
      this.host.onClean(s.def.id);
    }
  }

  private teleport(s: Scribe, time: number): void {
    const { player, fx } = this.host;
    fx.nozzleMist(s.img.x, s.img.y, 0, 360, 0xffffff, 6);
    const a = player.rotation + Math.PI + s.side * 0.9;
    const x = player.x + Math.cos(a) * this.cfg.followDistance;
    const y = player.y + Math.sin(a) * this.cfg.followDistance;
    // Behind a wall from Eugene? Stand right by him instead
    if (this.host.flow.lineClear(player.x, player.y, x, y)) this.place(s, x, y);
    else this.place(s, player.x, player.y);
    fx.nozzleMist(s.img.x, s.img.y, 0, 360, 0xffffff, 6);
    s.bestDist = Infinity;
    s.bestAt = time;
  }

  private dismiss(s: Scribe): void {
    s.bubble.say(pick(s.def.lines.leave), { x: s.img.x, y: s.img.y }, 44, 1800);
    s.shadow.setVisible(false);
    s.until = 0;
    s.img.setVisible(false);
    this.host.fx.nozzleMist(s.img.x, s.img.y, 0, 360, 0xffffff, 6);
  }

  private place(s: Scribe, x: number, y: number): void {
    s.img.setPosition(x, y);
    s.shadow.setPosition(x, y + 18);
  }

  /** Scribe kills and cleaned-up patients this shift, both of them together. */
  get totals(): { kills: number; cleaned: number } {
    return this.list.reduce((t, s) => ({ kills: t.kills + s.kills, cleaned: t.cleaned + s.cleaned }), { kills: 0, cleaned: 0 });
  }
}
