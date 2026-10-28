import Phaser from 'phaser';
import { joystickAmount } from '../core/mechanics';
import { CONTROLS } from '../config/controls';

/**
 * A floating tactile arcade thumbstick. It rests faintly at a home position
 * and jumps to wherever the thumb lands, featuring an embossed analog knob
 * with concave center grip and smooth spring-back.
 */
export class VirtualJoystick {
  /** Output vector, length 0..1, with the dead zone removed. */
  readonly value = new Phaser.Math.Vector2();
  pointerId: number | null = null;

  private readonly baseShadow: Phaser.GameObjects.Arc;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly baseTrack: Phaser.GameObjects.Arc;
  private readonly thumbShadow: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  private readonly thumbCap: Phaser.GameObjects.Arc;
  private readonly thumbGrip: Phaser.GameObjects.Arc;

  /** Where it rests when untouched (screen coordinates). */
  readonly home = new Phaser.Math.Vector2();
  private center = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, color: number) {
    const { radius, baseAlpha, thumbAlpha } = CONTROLS.joystick;

    // Base: outer elevation shadow, primary housing, and inner guide track ring
    this.baseShadow = scene.add.circle(0, 4, radius, 0x051314, 0.45);
    this.base = scene.add.circle(0, 0, radius, 0x0c2528, 0.45)
      .setStrokeStyle(3.5, color, baseAlpha);
    this.baseTrack = scene.add.circle(0, 0, radius * 0.52, 0x000000, 0)
      .setStrokeStyle(1.5, color, baseAlpha * 0.6);

    // Thumb: elevation shadow, tactile outer rim, concave surface cap, and center grip dimple
    const thumbRadius = radius * 0.46;
    this.thumbShadow = scene.add.circle(0, 3, thumbRadius, 0x051314, 0.5);
    this.thumb = scene.add.circle(0, 0, thumbRadius, 0x0e2e33, thumbAlpha)
      .setStrokeStyle(3, color, Math.min(1, thumbAlpha + 0.2));
    this.thumbCap = scene.add.circle(0, 0, thumbRadius * 0.76, color, 0.22);
    this.thumbGrip = scene.add.circle(0, 0, thumbRadius * 0.35, 0x071b1e, 0.65)
      .setStrokeStyle(1.5, 0xffffff, 0.4);

    this.setIdle();
  }

  get active(): boolean {
    return this.pointerId !== null;
  }

  /** Where the joystick rests when not touched (screen coordinates). */
  setHome(x: number, y: number): void {
    this.home.set(x, y);
    if (!this.active) this.moveTo(x, y);
  }

  start(pointer: Phaser.Input.Pointer): void {
    this.pointerId = pointer.id;
    this.center.set(pointer.x, pointer.y);
    this.moveTo(pointer.x, pointer.y);

    this.baseShadow.setAlpha(0.65);
    this.base.setAlpha(0.95);
    this.baseTrack.setAlpha(0.7);
    this.thumbShadow.setAlpha(0.7);
    this.thumb.setAlpha(1).setScale(1.06);
    this.thumbCap.setAlpha(1).setScale(1.06);
    this.thumbGrip.setAlpha(1).setScale(1.06);
  }

  move(pointer: Phaser.Input.Pointer): void {
    const { radius, deadZone } = CONTROLS.joystick;
    const dx = pointer.x - this.center.x;
    const dy = pointer.y - this.center.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, radius);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;

    const tx = this.center.x + nx * clamped;
    const ty = this.center.y + ny * clamped;
    this.thumbShadow.setPosition(tx, ty + 3);
    this.thumb.setPosition(tx, ty);
    this.thumbCap.setPosition(tx, ty);
    this.thumbGrip.setPosition(tx, ty);

    // Rescale so output starts at 0 just outside the dead zone and reaches 1 at the rim
    const amount = joystickAmount(dist, radius, deadZone);
    this.value.set(nx * amount, ny * amount);
  }

  release(): void {
    this.pointerId = null;
    this.value.set(0, 0);
    this.setIdle();
    this.moveTo(this.home.x, this.home.y);
  }

  private setIdle(): void {
    this.baseShadow.setAlpha(0.35);
    this.base.setAlpha(0.55);
    this.baseTrack.setAlpha(0.35);
    this.thumbShadow.setAlpha(0.4);
    this.thumb.setAlpha(0.65).setScale(1);
    this.thumbCap.setAlpha(0.65).setScale(1);
    this.thumbGrip.setAlpha(0.65).setScale(1);
  }

  private moveTo(x: number, y: number): void {
    this.center.set(x, y);
    this.baseShadow.setPosition(x, y + 4);
    this.base.setPosition(x, y);
    this.baseTrack.setPosition(x, y);
    this.thumbShadow.setPosition(x, y + 3);
    this.thumb.setPosition(x, y);
    this.thumbCap.setPosition(x, y);
    this.thumbGrip.setPosition(x, y);
  }
}
