import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { events, GameEvents } from '../core/events';
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
  /** Provider affinity, separate from permanent staff upgrades and applied once per actual hit. */
  readonly helperDamage?: number;
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

export interface ScribeDistraction {
  kind: 'distraction' | 'imaging';
  label: string;
  x: number;
  y: number;
  assignedAt: number;
  until: number;
  marker?: Phaser.GameObjects.Graphics;
  markerText?: Phaser.GameObjects.Text;
}

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
  rallyUntil = 0;
  rallyPower = 1;
  rallySpeed = 1;
  distracted = false;
  distraction?: ScribeDistraction;
  kills = 0;
  cleaned = 0;
  /** Trainee orientation countdown in game time (ms). */
  traineeUntil = 0;
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

  hasTrainee(time: number): boolean {
    return this.traineeUntil > time;
  }

  traineeRemainingMs(time: number): number {
    return Math.max(0, this.traineeUntil - time);
  }

  hasDistraction(time: number): boolean {
    return !!this.distraction && this.distraction.until > time;
  }

  distractionRemainingMs(time: number): number {
    return this.distraction ? Math.max(0, this.distraction.until - time) : 0;
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

  /** Brings a scribe in for `ms` (or keeps one already here for longer), from `from` or just behind Eugene. */
  summon(id: ScribeId, time: number, ms: number, from?: { x: number; y: number }): void {
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
    if (from) this.place(s, from.x, from.y);
    else if (flow.lineClear(player.x, player.y, bx, by)) this.place(s, bx, by);
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

  /** Every helper on the floor right now, where they stand, and a way to have them say something. */
  onShift(): { id: ScribeId; x: number; y: number; say(lines: string[]): void }[] {
    return this.list.filter((s) => s.here).map((s) => ({
      id: s.def.id, x: s.img.x, y: s.img.y,
      say: (lines: string[]) => s.bubble.say(pick(lines), s.img, 44, 2000),
    }));
  }

  /** The scribe here now (tests, debug). */
  get(id: ScribeId): Scribe | undefined {
    return this.list.find((s) => s.def.id === id && s.here);
  }

  /**
   * Assigns a temporary trainee to an eligible helper.
   * Returns false if the helper isn't on shift or isn't trainee-eligible.
   */
  assignTrainee(id: ScribeId, time: number, ms: number): boolean {
    const s = this.list.find((x) => x.def.id === id);
    if (!s || !s.def.traineeEligible || !s.here) return false;
    s.traineeUntil = Math.max(s.traineeUntil, time + ms);
    s.img.setTint(0xffd54f);
    s.bubble.say(pick(s.def.lines.traineeStart ?? s.def.lines.attack), s.img, 44, 2500);
    const emitAssigned = () => events.emit(GameEvents.TraineeAssigned, { id: s.def.id, name: s.def.name, durationMs: ms });
    if (this.host.scene.scene.isActive('Hud')) emitAssigned();
    else this.host.scene.time.delayedCall(200, emitAssigned);
    return true;
  }

  /** Whether this helper currently has an active trainee slowing them down. */
  hasTrainee(id: ScribeId, time: number): boolean {
    const s = this.list.find((x) => x.def.id === id);
    return !!s && s.here && !!s.hasTrainee?.(time);
  }

  /** Remaining trainee time in ms (0 if none active). */
  traineeRemainingMs(id: ScribeId, time: number): number {
    const s = this.list.find((x) => x.def.id === id);
    return s && s.here ? (s.traineeRemainingMs?.(time) ?? 0) : 0;
  }

  /**
   * Assigns an in-world distraction to a scribe (or Donald).
   * Returns false if the helper isn't on shift or is already distracted.
   */
  assignDistraction(id: ScribeId, target: { x: number; y: number; label: string }, time: number, ms: number): boolean {
    const s = this.list.find((x) => x.def.id === id);
    if (!s || !s.here || s.distraction) return false;
    let marker: Phaser.GameObjects.Graphics | undefined;
    let markerText: Phaser.GameObjects.Text | undefined;
    if (this.host.scene.add?.graphics) {
      marker = this.host.scene.add.graphics().setDepth(9.5);
      marker.lineStyle(2, 0xffb703, 0.85);
      marker.fillStyle(0xffb703, 0.25);
      marker.strokeCircle(target.x, target.y, 22);
      marker.fillCircle(target.x, target.y, 22);
      this.host.scene.tweens?.add?.({
        targets: marker,
        alpha: 0.35,
        yoyo: true,
        repeat: -1,
        duration: 600,
      });
    }
    if (this.host.scene.add?.text) {
      markerText = this.host.scene.add.text(target.x, target.y - 28, target.label, {
        fontSize: '11px',
        color: '#ffd166',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(9.6);
    }
    s.distraction = {
      kind: 'distraction',
      label: target.label,
      x: target.x,
      y: target.y,
      assignedAt: time,
      until: time + ms,
      marker,
      markerText,
    };
    s.bubble.say(pick(s.def.lines.distracted ?? s.def.lines.leave), s.img, 44, 2500);
    const emitDistracted = () => events.emit(GameEvents.HelperDistracted, { id: s.def.id, name: s.def.name, label: target.label, x: target.x, y: target.y });
    if (this.host.scene.scene?.isActive?.('Hud')) emitDistracted();
    else this.host.scene.time?.delayedCall?.(200, emitDistracted) ?? emitDistracted();
    return true;
  }

  /**
   * Assigns patient imaging in the X-ray room to Donald.
   * Halts his combat beam until finished or interrupted.
   */
  assignImaging(time: number, ms: number, target = { x: 940, y: 1400 }): boolean {
    const s = this.list.find((x) => x.def.id === 'donald');
    if (!s || !s.here || s.distraction) return false;
    let marker: Phaser.GameObjects.Graphics | undefined;
    let markerText: Phaser.GameObjects.Text | undefined;
    if (this.host.scene.add?.graphics) {
      marker = this.host.scene.add.graphics().setDepth(9.5);
      marker.lineStyle(2, 0x546e7a, 0.85);
      marker.fillStyle(0x546e7a, 0.25);
      marker.strokeCircle(target.x, target.y, 24);
      marker.fillCircle(target.x, target.y, 24);
      this.host.scene.tweens?.add?.({
        targets: marker,
        alpha: 0.35,
        yoyo: true,
        repeat: -1,
        duration: 600,
      });
    }
    if (this.host.scene.add?.text) {
      markerText = this.host.scene.add.text(target.x, target.y - 28, 'PATIENT IMAGING', {
        fontSize: '11px',
        color: '#c8ffe6',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(9.6);
    }
    s.distraction = {
      kind: 'imaging',
      label: 'PATIENT IMAGING',
      x: target.x,
      y: target.y,
      assignedAt: time,
      until: time + ms,
      marker,
      markerText,
    };
    s.bubble.say(pick(s.def.lines.imaging ?? s.def.lines.leave), s.img, 44, 2500);
    const emitImaging = () => events.emit(GameEvents.ImagingAssigned, { id: s.def.id, name: s.def.name, durationMs: ms });
    if (this.host.scene.scene?.isActive?.('Hud')) emitImaging();
    else this.host.scene.time?.delayedCall?.(200, emitImaging) ?? emitImaging();
    return true;
  }

  /** Clears an active distraction or patient imaging assignment. */
  clearDistraction(s: Scribe, time: number, _playerIntervention?: boolean): void {
    if (!s.distraction) return;
    const kind = s.distraction.kind;
    if (s.distraction.marker) {
      this.host.scene.tweens?.killTweensOf?.(s.distraction.marker);
      s.distraction.marker.destroy();
    }
    if (s.distraction.markerText) {
      s.distraction.markerText.destroy();
    }
    s.distraction = undefined;
    s.bestDist = Infinity;
    s.bestAt = time;
    if (kind === 'imaging') {
      s.bubble.say(pick(s.def.lines.imagingDone ?? s.def.lines.arrive), s.img, 44, 2500);
      events.emit(GameEvents.ImagingCompleted, { id: s.def.id, name: s.def.name });
    } else {
      s.bubble.say(pick(s.def.lines.reactivated ?? s.def.lines.arrive), s.img, 44, 2500);
      events.emit(GameEvents.HelperReactivated, { id: s.def.id, name: s.def.name });
    }
  }

  /** Whether this helper currently has an active distraction or imaging assignment. */
  hasDistraction(id: ScribeId, time: number): boolean {
    const s = this.list.find((x) => x.def.id === id);
    return !!s && s.here && !!s.hasDistraction?.(time);
  }

  /** Remaining distraction or imaging time in ms. */
  distractionRemainingMs(id: ScribeId, time: number): number {
    const s = this.list.find((x) => x.def.id === id);
    return s && s.here ? (s.distractionRemainingMs?.(time) ?? 0) : 0;
  }

  /** Gets active distraction info for save/restore or inspection. */
  getDistraction(id: ScribeId): { kind: 'distraction' | 'imaging'; label: string; x: number; y: number; remainingMs: number } | undefined {
    const s = this.list.find((x) => x.def.id === id);
    if (!s || !s.here || !s.distraction) return undefined;
    const now = this.host.scene?.time?.now ?? 0;
    return {
      kind: s.distraction.kind,
      label: s.distraction.label,
      x: s.distraction.x,
      y: s.distraction.y,
      remainingMs: Math.max(0, s.distraction.until - now),
    };
  }

  update(time: number, dtMs: number): void {
    for (const s of this.list) {
      s.bubble.follow();
      if (!s.here) continue;
      if (s.traineeUntil > 0 && time >= s.traineeUntil) {
        s.traineeUntil = 0;
        s.img.clearTint();
        s.bubble.say(pick(s.def.lines.traineeEnd ?? s.def.lines.clean), s.img, 44, 2500);
        events.emit(GameEvents.TraineeCompleted, { id: s.def.id, name: s.def.name });
      }
      if (s.distraction && time >= s.distraction.until) {
        this.clearDistraction(s, time, false);
      }
      if (time >= s.until) {
        this.dismiss(s);
        continue;
      }
      if (this.host.player.dead) continue;
      this.think(s, time, dtMs);
    }
  }

  /** Recall clears interruption and gathers helpers; permanent upgrade values are never mutated. */
  rally(time: number, ms: number, power: number, speed: number, recall: boolean): void {
    for (const s of this.list.filter(s => s.here)) {
      s.rallyUntil = time + ms; s.rallyPower = power; s.rallySpeed = speed;
      if (recall) {
        if (s.distraction) this.clearDistraction(s, time, true);
        s.distracted = false;
        this.teleport(s, time);
      }
    }
  }

  private think(s: Scribe, time: number, dtMs: number): void {
    if (s.distracted) return;
    const { player, flow } = this.host;
    const img = s.img;
    const cfg = this.cfg;

    // Distracted or imaging: steer toward the in-world target, halt combat/cleaning, check intervention
    if (s.distraction) {
      const distToPlayer = Phaser.Math.Distance.Between(img.x, img.y, player.x, player.y);
      if (s.distraction.kind === 'distraction' && (time >= s.distraction.assignedAt + 1200) && distToPlayer <= BALANCE.distractions.interventionRange) {
        this.clearDistraction(s, time, true);
        return;
      }
      const tx = s.distraction.x;
      const ty = s.distraction.y;
      const d = Phaser.Math.Distance.Between(img.x, img.y, tx, ty);
      let moving = false;
      if (d > 15) {
        let gx = tx, gy = ty;
        if (!flow.lineClear(img.x, img.y, tx, ty)) {
          if (flow.nextStep(img.x, img.y, this.v)) {
            gx = this.v.x;
            gy = this.v.y;
          }
        }
        const a = Phaser.Math.Angle.Between(img.x, img.y, gx, gy);
        const traineeSpeedMult = s.hasTrainee?.(time) ? BALANCE.trainees.statMult : 1;
        const speed = cfg.speed * traineeSpeedMult * 0.9 * (dtMs / 1000);
        const stepLen = Math.min(speed, d);
        this.place(s, img.x + Math.cos(a) * stepLen, img.y + Math.sin(a) * stepLen);
        img.rotation = Phaser.Math.Angle.RotateTo(img.rotation, a, 0.15);
        moving = true;
      }
      s.step += moving ? dtMs / 110 : 0;
      const bob = moving ? Math.sin(s.step) * 0.05 : 0;
      img.setScale(1 + bob, 1 - bob);
      return;
    }

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
      const traineeSpeedMult = s.hasTrainee?.(time) ? BALANCE.trainees.statMult : 1;
      const speed = cfg.speed * (time < s.rallyUntil ? s.rallySpeed : 1) * traineeSpeedMult * (d > 220 ? 1.5 : 1) * (dtMs / 1000);
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
      const traineeRateMult = s.hasTrainee?.(time) ? BALANCE.trainees.statMult : 1;
      s.nextAttackAt = time + (c.everyMs * s.boost.speed) / ((time < s.rallyUntil ? s.rallySpeed : 1) * traineeRateMult);
      fx.nozzleMist(img.x + Math.cos(a) * 26, img.y + Math.sin(a) * 26, a, 18, s.def.color, 4);
      sfx.spray();
      this.strike(s, germ, c.damage, a, c.knockback, time);
    } else if (s.def.id === 'donald') {
      const c = this.cfg.donald;
      s.nextAttackAt = time + c.everyMs * s.boost.speed / (time < s.rallyUntil ? s.rallySpeed : 1);
      const ux = Math.cos(a), uy = Math.sin(a);
      this.beam(img.x + ux * 24, img.y + uy * 24, a, c.range, c.width, s.def.color);
      sfx.zap();
      for (const g of this.host.germs()) {
        if (!g.active || !this.host.sameFloor(img.x, img.y, g.x, g.y)) continue;
        // Along the beam and close enough to its line
        const along = (g.x - img.x) * ux + (g.y - img.y) * uy;
        const off = Math.abs((g.x - img.x) * uy - (g.y - img.y) * ux);
        if (along < 0 || along > c.range || off > c.width + g.displayWidth / 2) continue;
        this.strike(s, g, c.damage, a, c.knockback, time);
        if (g.active) g.stun(time, c.stunMs);
      }
    } else {
      const c = this.cfg.alan;
      s.nextAttackAt = time + c.everyMs * s.boost.speed / (time < s.rallyUntil ? s.rallySpeed : 1);
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
        this.strike(s, g, c.damage, ga, c.knockback, time);
        if (g.active) g.stun(time, c.stunMs);
      }
    }
    if (time >= s.nextChatterAt && Math.random() < 0.35) {
      s.nextChatterAt = time + 5000;
      s.bubble.say(pick(s.def.lines.attack), s.img, 44, 1500);
    }
  }

  private strike(s: Scribe, g: Germ, damage: number, angle: number, knockback: number, time?: number): void {
    if (!g.active) return;
    const now = time ?? this.host.scene?.time?.now ?? 0;
    const traineeDmgMult = s.hasTrainee?.(now) ? BALANCE.trainees.statMult : 1;
    this.host.hit(g, damage * s.boost.power * (this.host.helperDamage ?? 1) * traineeDmgMult, angle, knockback);
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
    const traineeRateMult = s.hasTrainee?.(time) ? BALANCE.trainees.statMult : 1;
    s.nextCleanAt = time + this.cfg.cleanEveryMs / traineeRateMult;
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
    if (s.distraction) {
      if (s.distraction.marker) {
        this.host.scene.tweens?.killTweensOf?.(s.distraction.marker);
        s.distraction.marker.destroy();
      }
      if (s.distraction.markerText) s.distraction.markerText.destroy();
      s.distraction = undefined;
    }
    s.bubble.say(pick(s.def.lines.leave), { x: s.img.x, y: s.img.y }, 44, 1800);
    s.shadow.setVisible(false);
    s.until = 0;
    s.traineeUntil = 0;
    s.img.clearTint().setVisible(false);
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
