import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { events, GameEvents } from '../core/events';
import { staffBoost } from '../core/progress';
import { sfx } from '../core/sfx';
import { SCRIBES, type ScribeDef, type ScribeId } from '../data/scribes';
import type { Obstacle } from '../data/rooms';
import type { Patient } from '../entities/Patient';
import { SpeechBubble } from '../ui/SpeechBubble';
import type { Fx } from './Fx';
import type { PatientDirector } from './PatientDirector';

/** What the front desk needs from the game scene. */
export interface FrontDeskHost {
  readonly scene: Phaser.Scene;
  readonly fx: Fx;
  readonly patients: PatientDirector;
  /** Provider affinity scales the PSR bonus copay, without adding combat or changing patient rewards. */
  readonly helperPower?: number;
  readonly obstacles: readonly Obstacle[];
  /** Where to put the desk if the clinic has no RECEPTION desk (it always does; tests and odd layouts). */
  readonly fallback: { x: number; y: number };
  /** A PSR checked a patient in (the clean-up reward already went through the patient director): pay `copays` more. */
  onCheckIn(p: Patient, copays: number): void;
}

const pick = (lines: string[]): string => Phaser.Utils.Array.GetRandom(lines);

/** One PSR behind the desk. */
class Psr {
  readonly img: Phaser.GameObjects.Image;
  readonly bubble: SpeechBubble;
  until = 0;
  nextCheckInAt = 0;
  checkedIn = 0;
  /** Trainee orientation countdown in game time (ms). */
  traineeUntil = 0;
  boost = { power: 1, speed: 1, duration: 1 };

  constructor(scene: Phaser.Scene, readonly def: ScribeDef) {
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
}

/**
 * THE FRONT DESK: Selina and Elaine, the PSRs. Their pill puts them behind the RECEPTION desk for a while; as long
 * as one is there, every patient lines up in front of the desk and complains about the wait instead of committing
 * health code violations, and the PSRs check them in (and send them home) one at a time.
 */
export class FrontDesk {
  private rallyUntil = 0;
  private rallyPower = 1;
  /** Team rallies improve PSR bonus output without adding combat or changing permanent upgrades. */
  rally(time: number, ms: number, power: number): void { this.rallyUntil=time+ms; this.rallyPower=power; }

  private readonly psrs: Psr[];
  /** The line's spots, head first (in front of the desk, toward the waiting room). */
  readonly line: { x: number; y: number }[];
  /** Where the PSRs sit (behind the desk). */
  private readonly seat: { x: number; y: number };

  constructor(private readonly host: FrontDeskHost) {
    this.psrs = SCRIBES.filter((d) => d.desk).map((d) => new Psr(host.scene, d));
    const desk = host.obstacles.find((o) => o.kind === 'desk' && o.label === 'RECEPTION');
    if (desk) {
      const cy = desk.y + desk.h / 2;
      this.seat = { x: desk.x + desk.w + 34, y: cy };
      this.line = this.spots(desk.x - 40, cy, -1);
    } else {
      this.seat = { x: host.fallback.x + 60, y: host.fallback.y };
      this.line = this.spots(host.fallback.x - 20, host.fallback.y, -1);
    }
    if (!this.line.length) this.line = [{ x: this.seat.x - 80, y: this.seat.y }];
  }

  /** Up to six places in line, `spacing` apart going `dir` along x, skipping anything blocked by furniture. */
  private spots(x0: number, y: number, dir: number): { x: number; y: number }[] {
    const { spacing } = BALANCE.frontDesk;
    const m = 24;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < 10 && out.length < 6; i++) {
      const x = x0 + dir * i * spacing;
      if (this.host.obstacles.some((o) => x > o.x - m && x < o.x + o.w + m && y > o.y - m && y < o.y + o.h + m)) continue;
      out.push({ x, y });
    }
    return out;
  }

  /** Puts a PSR at the desk for `ms` (or keeps one already there for longer). */
  summon(id: ScribeId, time: number, ms: number): void {
    const s = this.psrs.find((p) => p.def.id === id);
    if (!s) return;
    s.until = Math.max(s.until, time + ms);
    if (s.here) return;
    s.boost = staffBoost(id);
    const i = this.psrs.indexOf(s);
    s.img.setPosition(this.seat.x, this.seat.y + (i === 0 ? -56 : 56)).setRotation(Math.PI).setAlpha(0).setVisible(true);
    if (s.hasTrainee(time)) s.img.setTint(0xffd54f);
    this.host.scene.tweens.add({ targets: s.img, alpha: 1, duration: 300 });
    this.host.fx.nozzleMist(s.img.x, s.img.y, 0, 360, 0xffffff, 6);
    s.nextCheckInAt = time + this.checkInMs(s, time);
    s.bubble.say(pick(s.def.lines.arrive), s.img, 44, 2200);
    this.host.patients.openLine(this.line, time);
  }

  /** The PSR at the desk now (tests, debug). */
  get(id: ScribeId): Psr | undefined {
    return this.psrs.find((s) => s.def.id === id && s.here);
  }

  /**
   * Assigns a temporary trainee to an eligible helper at the front desk.
   * Returns false if the helper isn't on shift or isn't trainee-eligible.
   */
  assignTrainee(id: ScribeId, time: number, ms: number): boolean {
    const s = this.psrs.find((p) => p.def.id === id);
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
    const s = this.psrs.find((p) => p.def.id === id);
    return !!s && s.here && !!s.hasTrainee?.(time);
  }

  /** Remaining trainee time in ms (0 if none active). */
  traineeRemainingMs(id: ScribeId, time: number): number {
    const s = this.psrs.find((p) => p.def.id === id);
    return s && s.here ? (s.traineeRemainingMs?.(time) ?? 0) : 0;
  }

  /** Whether anyone's working the desk. */
  get open(): boolean {
    return this.psrs.some((s) => s.here);
  }

  private checkInMs(s: Psr, time?: number): number {
    const now = time ?? this.host.scene?.time?.now ?? 0;
    const traineeRateMult = s.hasTrainee?.(now) ? BALANCE.trainees.statMult : 1;
    return (BALANCE.frontDesk[s.def.id as 'selina' | 'elaine'].checkInMs * s.boost.speed) / traineeRateMult;
  }

  update(time: number, dead: boolean): void {
    const { patients } = this.host;
    for (const s of this.psrs) {
      s.bubble.follow();
      if (!s.here) continue;
      if (s.traineeUntil > 0 && time >= s.traineeUntil) {
        s.traineeUntil = 0;
        s.img.clearTint();
        s.bubble.say(pick(s.def.lines.traineeEnd ?? s.def.lines.clean), s.img, 44, 2500);
        events.emit(GameEvents.TraineeCompleted, { id: s.def.id, name: s.def.name });
      }
      if (time >= s.until) {
        this.dismiss(s);
        continue;
      }
      if (dead || time < s.nextCheckInAt) continue;
      s.nextCheckInAt = time + this.checkInMs(s, time);
      // The patient nearest the head of the line, if they've made it to the desk
      const head = this.line[0];
      const reach = BALANCE.frontDesk.reach;
      const p = [...patients.queue].sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, head.x, head.y) - Phaser.Math.Distance.Between(b.x, b.y, head.x, head.y))[0];
      if (!p || Phaser.Math.Distance.Between(p.x, p.y, head.x, head.y) > reach) continue;
      const a = Phaser.Math.Angle.Between(s.img.x, s.img.y, p.x, p.y);
      s.img.setRotation(a);
      this.host.fx.nozzleMist(s.img.x + Math.cos(a) * 24, s.img.y + Math.sin(a) * 24, a, 14, s.def.color, 2);
      if (!patients.checkIn(p)) continue;
      s.checkedIn++;
      sfx.cash();
      const traineeOutputMult = s.hasTrainee?.(time) ? BALANCE.trainees.statMult : 1;
      const copays = Math.round(BALANCE.frontDesk[s.def.id as 'selina' | 'elaine'].copays * s.boost.power * (this.host.helperPower ?? 1) * (time < this.rallyUntil ? this.rallyPower : 1) * traineeOutputMult);
      this.host.onCheckIn(p, copays);
      s.bubble.say(pick(patients.queue.length ? s.def.lines.attack : s.def.lines.clean), s.img, 44, 1600);
    }
    if (!this.open) patients.closeLine(time);
  }

  private dismiss(s: Psr): void {
    s.bubble.say(pick(s.def.lines.leave), { x: s.img.x, y: s.img.y }, 44, 1800);
    s.until = 0;
    s.traineeUntil = 0;
    s.img.clearTint().setVisible(false);
    this.host.fx.nozzleMist(s.img.x, s.img.y, 0, 360, 0xffffff, 6);
  }

  /** Patients the PSRs checked in this shift. */
  get checkedIn(): number {
    return this.psrs.reduce((n, s) => n + s.checkedIn, 0);
  }
}
