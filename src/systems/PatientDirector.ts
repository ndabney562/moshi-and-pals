import Phaser from 'phaser';
import { reactionLines } from '../core/dialogue';
import { BALANCE } from '../config/balance';
import { runRng } from '../core/rng';
import { CHECKED_IN_LINES, CLEANED_LINES, VIOLATIONS, WAIT_COMPLAINTS } from '../data/patients';
import type { RoomArea, RoomLayout } from '../data/rooms';
import type { CharacterId } from '../data/characters';
import { Patient } from '../entities/Patient';
import type { Player } from '../entities/Player';
import { SpeechBubble } from '../ui/SpeechBubble';

/** What the director needs from the game scene. */
export interface PatientHost {
  readonly scene: Phaser.Scene;
  readonly player: Player;
  readonly room: RoomLayout;
  /** The room patients wait in (they never wander past its walls). */
  readonly area: RoomArea;
  /** Who's on shift (picks whose reaction lines are said). */
  readonly doctor?: CharacterId;
  /** Full Moon: patients walk backwards (facing where they came from). */
  readonly backwards?: boolean;
  /** Lets a germ loose at (x, y). */
  spawnGermAt(id: string, x: number, y: number): void;
  /** A patient was sprayed into compliance. */
  onCleaned(patient: Patient): void;
}

/**
 * Brings patients into the waiting room, makes them commit health code
 * violations (which let germs in), and sends them home once sprayed clean.
 */
export class PatientDirector {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly cfg = BALANCE.patients;
  private readonly eugeneBubble: SpeechBubble;
  private nextSpawnAt: number;
  private leftAt = new Map<Patient, number>();
  /** The front desk line (Selina and Elaine): spots from the head of the line back, while a PSR is at the desk. */
  private line?: { x: number; y: number }[];
  /** Who's in line, first come first served. */
  private inLine: Patient[] = [];
  private nextComplaintAt = 0;

  constructor(private readonly host: PatientHost) {
    this.group = host.scene.physics.add.group({ classType: Patient, maxSize: 3 });
    this.eugeneBubble = new SpeechBubble(host.scene);
    this.nextSpawnAt = host.scene.time.now + runRng.patients.between(this.cfg.spawnEveryMs) / 2;
  }

  /**
   * `round` comes from the wave director; `bossRound` keeps the room clear for the boss.
   * `violating`: whether violations can happen now. The game passes "the round still has germs to spawn", so
   * once the last germs are in, patients stop adding more and the round can end (no farming, no endless rounds).
   */
  update(time: number, dtMs: number, round: number, violating: boolean, bossRound: boolean): void {
    this.eugeneBubble.follow();
    const patients = this.group.getChildren() as Patient[];
    const active = patients.filter((p) => p.active);

    if (round >= this.cfg.firstRound && !bossRound && time >= this.nextSpawnAt && active.length < this.cfg.maxActive(round)) {
      this.spawn(time);
    }
    if (bossRound) for (const p of active) if (p.state === 'wander') this.sendHome(p, time);

    const spot = (out: Phaser.Math.Vector2) => this.openSpot(out);
    const line = this.line;
    if (line) {
      this.inLine = this.inLine.filter((p) => p.active && p.state === 'wander');
      for (const p of active) if (p.state === 'wander' && !this.inLine.includes(p)) { this.inLine.push(p); p.repick(); }
      if (this.inLine.length && time >= this.nextComplaintAt) {
        this.nextComplaintAt = time + runRng.patients.between(BALANCE.frontDesk.complainEveryMs);
        const p = runRng.patients.pick(this.inLine);
        p.bubble.say(runRng.patients.pick(WAIT_COMPLAINTS), p, 34, 1700);
      }
    }
    for (const p of active) {
      const place = line ? this.inLine.indexOf(p) : -1;
      if (line && place >= 0) {
        // In line: walk to their place and wait (complaining). Nobody leaves the line, nobody misbehaves.
        const at = line[Math.min(place, line.length - 1)];
        p.walk(time, dtMs, (out) => out.set(at.x, at.y), !!this.host.backwards);
        p.leaveAt = Math.max(p.leaveAt, time + 1000);
        continue;
      }
      p.walk(time, dtMs, spot, !!this.host.backwards);
      if (p.state === 'wander') {
        if (time >= p.leaveAt) this.sendHome(p, time);
        else if (violating && time >= p.nextViolationAt) this.violate(p, time);
      } else if (p.home || time - (this.leftAt.get(p) ?? time) > 8000) {
        // Home, or stuck behind a chair: slip out quietly
        this.leftAt.delete(p);
        p.retire();
      }
    }
  }

  /** A droplet (or a scribe) hit a patient. Returns true if that hit cleaned them up. */
  sprayed(p: Patient): boolean {
    if (!p.active || p.state !== 'wander') return false;
    p.hits++;
    p.setTintFill(0xffffff);
    p.scene.time.delayedCall(60, () => p.clearTint());
    if (p.hits >= this.cfg.hitsToClean) {
      p.bubble.say(Phaser.Utils.Array.GetRandom(CLEANED_LINES), p, 34, 2000);
      p.setTint(0xbff7ff);
      this.sendHome(p, p.scene.time.now);
      this.host.onCleaned(p);
      return true;
    }
    return false;
  }

  /** The front desk opens: everyone lines up at these spots (head of the line first) until `closeLine`. */
  openLine(spots: { x: number; y: number }[], time: number): void {
    if (this.line || !spots.length) return;
    this.line = spots;
    this.inLine = [];
    this.nextComplaintAt = time + 600;
  }

  /** The front desk closes: the line breaks up and, after a short grace, patients go back to misbehaving. */
  closeLine(time: number): void {
    if (!this.line) return;
    this.line = undefined;
    for (const p of this.inLine) {
      if (!p.active || p.state !== 'wander') continue;
      p.repick();
      p.nextViolationAt = Math.max(p.nextViolationAt, time + BALANCE.frontDesk.graceMs);
    }
    this.inLine = [];
  }

  /** Patients in line, first come first served (the front desk checks them in in this order). */
  get queue(): readonly Patient[] {
    return this.line ? this.inLine : [];
  }

  /** The front desk checks a patient in: they go home and it counts as cleaned up. */
  checkIn(p: Patient): boolean {
    if (!p.active || p.state !== 'wander') return false;
    p.bubble.say(Phaser.Utils.Array.GetRandom(CHECKED_IN_LINES), p, 34, 1800);
    p.setTint(0xffd6e7);
    this.inLine = this.inLine.filter((q) => q !== p);
    for (const q of this.inLine) q.repick(); // everyone shuffles up
    this.sendHome(p, p.scene.time.now);
    this.host.onCleaned(p);
    return true;
  }

  /** The closest wandering patient within `range`, for auto-aim when no germ is near. */
  nearestViolator(x: number, y: number, range: number, visible: (p: Patient) => boolean = () => true): Patient | undefined {
    let best: Patient | undefined;
    let bestDist = range * range;
    for (const p of this.group.getChildren() as Patient[]) {
      if (!p.active || p.state !== 'wander') continue;
      const d = Phaser.Math.Distance.Squared(p.x, p.y, x, y);
      if (d < bestDist && visible(p)) { bestDist = d; best = p; }
    }
    return best;
  }

  private spawn(time: number): void {
    this.nextSpawnAt = time + runRng.patients.between(this.cfg.spawnEveryMs);
    const { area, player } = this.host;
    const p = this.group.get() as Patient | null;
    if (!p) return;
    const far = area.germSpawns.filter((s) => Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y) > 300);
    const door = runRng.patients.pick(far.length ? far : area.germSpawns);
    p.enter(runRng.patients.pick(VIOLATIONS), door.x, door.y, time);
  }

  private violate(p: Patient, time: number): void {
    p.nextViolationAt = time + runRng.patients.between(this.cfg.violationEveryMs);
    p.violations++;
    p.bubble.say(p.def.action, p, 34, 1800);
    for (let i = 0; i < p.def.germs; i++) {
      const a = runRng.patients.float(0, Math.PI * 2);
      this.host.spawnGermAt(p.def.germId, p.x + Math.cos(a) * 44, p.y + Math.sin(a) * 44);
    }
    const { player } = this.host;
    if (!player.dead && Phaser.Math.Distance.BetweenPoints(player, p) < this.cfg.grumbleRange) {
      const lines = reactionLines(p.def, this.host.doctor);
      this.eugeneBubble.say(runRng.dialogue.pick(lines), player, 52, 2000);
    }
  }

  private sendHome(p: Patient, time: number): void {
    p.leave();
    this.leftAt.set(p, time);
  }

  /** A random spot on the waiting room's open floor, away from walls and furniture. */
  private openSpot(out: Phaser.Math.Vector2): void {
    const { room, area } = this.host;
    const m = 50;
    for (let tries = 0; tries < 20; tries++) {
      const x = runRng.patients.int(area.x + 80, area.x + area.w - 80);
      const y = runRng.patients.int(area.y + 80, area.y + area.h - 80);
      if (!room.obstacles.some((o) => x > o.x - m && x < o.x + o.w + m && y > o.y - m && y < o.y + o.h + m)) {
        out.set(x, y);
        return;
      }
    }
    out.set(room.playerSpawn.x, room.playerSpawn.y);
  }
}
