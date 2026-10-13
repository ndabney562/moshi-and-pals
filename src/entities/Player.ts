import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import type { InputState } from '../core/inputState';

/**
 * Dr. Eugene "Moshi" Moshkovich. Moves with the left stick, faces the right
 * stick's aim (or his walking direction when not aiming).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly shadow: Phaser.GameObjects.Image;
  /** Distance walked, used to drive the waddle animation. */
  private stride = 0;
  readonly maxHp = BALANCE.player.maxHp;
  hp = BALANCE.player.maxHp;
  dead = false;
  private invulnerableUntil = 0;
  private lastHurtAt = -Infinity;
  /** Outside forces, e.g. a boss dragging him: extra velocity, and a cap on his own walking speed. */
  readonly pull = new Phaser.Math.Vector2();
  moveScale = 1;
  /** While shoved, Eugene slides and can't steer. */
  private shovedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'eugene');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const r = BALANCE.player.bodyRadius;
    // Circle body centered on the 96x96 texture, offset toward his torso
    this.setCircle(r, 44 - r, 46 - r);
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    this.shadow = scene.add.image(x, y + 18, 'shadow').setDepth(9);
  }

  /** World position of the squirt bottle's nozzle, for spawning spray. */
  nozzle(out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    // Nozzle sits ahead and to Eugene's right in the 96x96 texture
    const fx = 46 * this.scaleX;
    const fy = 15 * this.scaleY;
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    return out.set(this.x + fx * c - fy * s, this.y + fx * s + fy * c);
  }

  get invulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  /** Takes damage unless recently hit. Returns true if this hit landed. */
  takeDamage(amount: number, time: number): boolean {
    if (this.dead || time < this.invulnerableUntil) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.lastHurtAt = time;
    this.invulnerableUntil = time + BALANCE.player.invulnerableMs;
    // Red flash, then blink while invulnerable
    this.setTint(0xff6060);
    this.scene.time.delayedCall(120, () => this.clearTint());
    this.scene.tweens.add({ targets: this, alpha: 0.45, duration: 90, yoyo: true, repeat: 3, onComplete: () => this.setAlpha(1) });
    if (this.hp <= 0) this.dead = true;
    return true;
  }

  /** Slowly heals after a while without being hit. Returns true if health changed. */
  regen(time: number, dtMs: number): boolean {
    if (this.dead || this.hp >= this.maxHp || time - this.lastHurtAt < BALANCE.player.regenDelayMs) return false;
    this.hp = Math.min(this.maxHp, this.hp + (BALANCE.player.regenPerSecond * dtMs) / 1000);
    return true;
  }

  /** Knocks Eugene away at velocity (vx, vy) for `ms`; he can't steer until it wears off. */
  shove(vx: number, vy: number, ms: number): void {
    if (this.dead) return;
    this.setVelocity(vx, vy);
    this.shovedUntil = this.scene.time.now + ms;
  }

  /** Dramatic collapse. */
  collapse(): void {
    this.setVelocity(0, 0);
    this.setTint(0xb0c4b0);
    this.scene.tweens.add({ targets: this, angle: this.angle + 540, scale: 0.6, duration: 900, ease: 'Cubic.out' });
  }

  /** Called every frame by the game scene with this frame's input. */
  drive(input: InputState, dtMs: number, aimTarget?: { x: number; y: number }): void {
    if (this.dead) return;
    const speed = BALANCE.player.moveSpeed;
    if (this.scene.time.now < this.shovedUntil) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.velocity.scale(Math.pow(0.9, dtMs / 16.67));
    } else {
      const walk = speed * this.moveScale;
      this.setVelocity(input.moveX * walk + this.pull.x, input.moveY * walk + this.pull.y);
    }

    // Decide facing: active aim wins, then mouse (desktop), then walking direction
    let face: number | undefined;
    if (input.aiming) face = Math.atan2(input.aimY, input.aimX);
    else if (aimTarget) face = Phaser.Math.Angle.Between(this.x, this.y, aimTarget.x, aimTarget.y);
    else if (input.moveX !== 0 || input.moveY !== 0) face = Math.atan2(input.moveY, input.moveX);

    if (face !== undefined) {
      const t = 1 - Math.pow(1 - BALANCE.player.turnSmoothing, dtMs / 16.67);
      this.rotation = Phaser.Math.Angle.Wrap(this.rotation + Phaser.Math.Angle.Wrap(face - this.rotation) * t);
    }

    // Waddle: a little squash-and-stretch while walking, settle when standing still
    const moving = Math.hypot(input.moveX, input.moveY);
    if (moving > 0) {
      this.stride += (speed * moving * dtMs) / 1000;
      const bob = Math.sin(this.stride / 18) * 0.06 * moving;
      this.setScale(1 + bob, 1 - bob);
    } else {
      this.setScale(Phaser.Math.Linear(this.scaleX, 1, 0.2), Phaser.Math.Linear(this.scaleY, 1, 0.2));
    }

    this.shadow.setPosition(this.x, this.y + 18);
  }
}
