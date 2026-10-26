import Phaser from 'phaser';
import { joystickAmount } from '../core/mechanics';
import { CONTROLS } from '../config/controls';

/**
 * A floating thumbstick. It rests faintly at a home position and jumps to
 * wherever the thumb lands, so players don't have to hit an exact spot.
 */
export class VirtualJoystick {
  /** Output vector, length 0..1, with the dead zone removed. */
  readonly value = new Phaser.Math.Vector2();
  pointerId: number | null = null;

  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  /** Where it rests when untouched (screen coordinates). */
  readonly home = new Phaser.Math.Vector2();
  private center = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, color: number) {
    const { radius, baseAlpha, thumbAlpha } = CONTROLS.joystick;
    this.base = scene.add.circle(0, 0, radius, 0x0d2b2e, 0.4).setStrokeStyle(4, color, baseAlpha);
    this.thumb = scene.add.circle(0, 0, radius * 0.45, color, thumbAlpha).setStrokeStyle(2, 0xffffff, 0.65);
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
    this.base.setAlpha(1);
    this.thumb.setAlpha(1);
  }

  move(pointer: Phaser.Input.Pointer): void {
    const { radius, deadZone } = CONTROLS.joystick;
    const dx = pointer.x - this.center.x;
    const dy = pointer.y - this.center.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, radius);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    this.thumb.setPosition(this.center.x + nx * clamped, this.center.y + ny * clamped);

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
    this.base.setAlpha(0.6);
    this.thumb.setAlpha(0.5);
  }

  private moveTo(x: number, y: number): void {
    this.center.set(x, y);
    this.base.setPosition(x, y);
    this.thumb.setPosition(x, y);
  }
}
