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

  /** Called every frame by the game scene with this frame's input. */
  drive(input: InputState, dtMs: number, aimTarget?: Phaser.Math.Vector2): void {
    const speed = BALANCE.player.moveSpeed;
    this.setVelocity(input.moveX * speed, input.moveY * speed);

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
