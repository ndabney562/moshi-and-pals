import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import type { ViolationDef } from '../data/patients';
import { SpeechBubble } from '../ui/SpeechBubble';

/**
 * A patient wandering the waiting room. Solid to Eugene and germs. Pooled by
 * the PatientDirector: `enter` brings one in, `leave` sends it home.
 */
export class Patient extends Phaser.Physics.Arcade.Sprite {
  def!: ViolationDef;
  hits = 0;
  /** Health code violations committed this visit (scribes only go after patients with one on record). */
  violations = 0;
  /** 'wander' while in the room, 'leaving' once cleaned up or done. */
  state: 'wander' | 'leaving' = 'wander';
  readonly bubble: SpeechBubble;
  private goal = new Phaser.Math.Vector2();
  private exit = new Phaser.Math.Vector2();
  private goalSetAt = 0;
  leaveAt = 0;
  nextViolationAt = 0;
  private step = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'patient-cougher');
    this.bubble = new SpeechBubble(scene);
  }

  enter(def: ViolationDef, x: number, y: number, time: number): void {
    const cfg = BALANCE.patients;
    this.def = def;
    this.hits = 0;
    this.violations = 0;
    this.state = 'wander';
    this.setTexture(`patient-${def.id}`);
    this.enableBody(true, x, y, true, true);
    this.setCircle(cfg.radius, this.width / 2 - cfg.radius, this.height / 2 - cfg.radius);
    this.setPushable(false).setDepth(8).clearTint().setAlpha(1).setScale(1);
    this.exit.set(x, y);
    this.leaveAt = time + cfg.stayMs;
    this.nextViolationAt = time + Phaser.Math.Between(...cfg.violationEveryMs) / 2;
    this.goalSetAt = -Infinity;
  }

  /** Walk toward the goal; pick a new spot to loiter now and then. */
  walk(time: number, dtMs: number, pickSpot: (out: Phaser.Math.Vector2) => void): void {
    if (!this.active) return;
    const target = this.state === 'leaving' ? this.exit : this.goal;
    if (this.state === 'wander' && (time - this.goalSetAt > 6000 || Phaser.Math.Distance.BetweenPoints(this, this.goal) < 12)) {
      pickSpot(this.goal);
      this.goalSetAt = time;
    }
    const d = Phaser.Math.Distance.BetweenPoints(this, target);
    const speed = BALANCE.patients.speed * (this.state === 'leaving' ? 1.6 : 1);
    if (d < 10) {
      this.setVelocity(0, 0);
    } else {
      const a = Phaser.Math.Angle.BetweenPoints(this, target);
      this.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, a, 0.1 * (dtMs / (1000 / 60)));
      // Shuffle
      this.step += dtMs / 120;
      const s = Math.sin(this.step) * 0.04;
      this.setScale(1 + s, 1 - s);
    }
    this.bubble.follow();
  }

  get home(): boolean {
    return this.state === 'leaving' && Phaser.Math.Distance.BetweenPoints(this, this.exit) < 20;
  }

  leave(): void {
    this.state = 'leaving';
  }

  /** Back to the pool. */
  retire(): void {
    this.disableBody(true, true);
    this.bubble.setVisible(false);
  }
}
