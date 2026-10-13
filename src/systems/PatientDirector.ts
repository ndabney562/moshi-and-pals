import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { VIOLATIONS } from '../data/patients';
import type { RoomLayout } from '../data/rooms';
import { Patient } from '../entities/Patient';
import type { Player } from '../entities/Player';
import { SpeechBubble } from '../ui/SpeechBubble';

/** What the director needs from the game scene. */
export interface PatientHost {
  readonly scene: Phaser.Scene;
  readonly player: Player;
  readonly room: RoomLayout;
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

  constructor(private readonly host: PatientHost) {
    this.group = host.scene.physics.add.group({ classType: Patient, maxSize: 3 });
    this.eugeneBubble = new SpeechBubble(host.scene);
    this.nextSpawnAt = host.scene.time.now + Phaser.Math.Between(...this.cfg.spawnEveryMs) / 2;
  }

  /** `round` and `roundActive` come from the wave director; `bossRound` keeps the room clear for the boss. */
  update(time: number, dtMs: number, round: number, roundActive: boolean, bossRound: boolean): void {
    this.eugeneBubble.follow();
    const patients = this.group.getChildren() as Patient[];
    const active = patients.filter((p) => p.active);

    if (round >= this.cfg.firstRound && !bossRound && time >= this.nextSpawnAt && active.length < this.cfg.maxActive(round)) {
      this.spawn(time);
    }
    if (bossRound) for (const p of active) if (p.state === 'wander') this.sendHome(p, time);

    const spot = (out: Phaser.Math.Vector2) => this.openSpot(out);
    for (const p of active) {
      p.walk(time, dtMs, spot);
      if (p.state === 'wander') {
        if (time >= p.leaveAt) this.sendHome(p, time);
        else if (roundActive && time >= p.nextViolationAt) this.violate(p, time);
      } else if (p.home || time - (this.leftAt.get(p) ?? time) > 8000) {
        // Home, or stuck behind a chair: slip out quietly
        this.leftAt.delete(p);
        p.retire();
      }
    }
  }

  /** A droplet hit a patient. */
  sprayed(p: Patient): void {
    if (!p.active || p.state !== 'wander') return;
    p.hits++;
    p.setTintFill(0xffffff);
    p.scene.time.delayedCall(60, () => p.clearTint());
    if (p.hits >= this.cfg.hitsToClean) {
      p.bubble.say(Phaser.Utils.Array.GetRandom(['Okay, okay! Sorry, doc!', 'Fine! I\'ll wash my hands!', 'I get it! I\'m going!']), p, 34, 2000);
      p.setTint(0xbff7ff);
      this.sendHome(p, p.scene.time.now);
      this.host.onCleaned(p);
    }
  }

  /** The closest wandering patient within `range`, for auto-aim when no germ is near. */
  nearestViolator(x: number, y: number, range: number): Patient | undefined {
    let best: Patient | undefined;
    let bestDist = range * range;
    for (const p of this.group.getChildren() as Patient[]) {
      if (!p.active || p.state !== 'wander') continue;
      const d = Phaser.Math.Distance.Squared(p.x, p.y, x, y);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best;
  }

  private spawn(time: number): void {
    this.nextSpawnAt = time + Phaser.Math.Between(...this.cfg.spawnEveryMs);
    const { room, player } = this.host;
    const p = this.group.get() as Patient | null;
    if (!p) return;
    const far = room.germSpawns.filter((s) => Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y) > 300);
    const door = Phaser.Utils.Array.GetRandom(far.length ? far : room.germSpawns);
    p.enter(Phaser.Utils.Array.GetRandom(VIOLATIONS), door.x, door.y, time);
  }

  private violate(p: Patient, time: number): void {
    p.nextViolationAt = time + Phaser.Math.Between(...this.cfg.violationEveryMs);
    p.bubble.say(p.def.action, p, 34, 1800);
    for (let i = 0; i < p.def.germs; i++) {
      const a = Math.random() * Math.PI * 2;
      this.host.spawnGermAt(p.def.germId, p.x + Math.cos(a) * 44, p.y + Math.sin(a) * 44);
    }
    const { player } = this.host;
    if (!player.dead && Phaser.Math.Distance.BetweenPoints(player, p) < this.cfg.grumbleRange) {
      this.eugeneBubble.say(Phaser.Utils.Array.GetRandom(p.def.eugene), player, 52, 2000);
    }
  }

  private sendHome(p: Patient, time: number): void {
    p.leave();
    this.leftAt.set(p, time);
  }

  /** A random spot on open floor, away from walls and furniture. */
  private openSpot(out: Phaser.Math.Vector2): void {
    const { room } = this.host;
    const m = 50;
    for (let tries = 0; tries < 20; tries++) {
      const x = Phaser.Math.Between(80, room.width - 80);
      const y = Phaser.Math.Between(80, room.height - 80);
      if (!room.obstacles.some((o) => x > o.x - m && x < o.x + o.w + m && y > o.y - m && y < o.y + o.h + m)) {
        out.set(x, y);
        return;
      }
    }
    out.set(room.playerSpawn.x, room.playerSpawn.y);
  }
}
