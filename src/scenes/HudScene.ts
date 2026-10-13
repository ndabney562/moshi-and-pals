import Phaser from 'phaser';
import { CONTROLS } from '../config/controls';
import { DISPLAY } from '../config/display';
import { COLORS } from '../config/theme';
import { inputState } from '../core/inputState';
import { readSafeArea, type Insets } from '../core/safeArea';
import { VirtualJoystick } from '../ui/VirtualJoystick';

/**
 * Screen-space overlay drawn above the game: touch joysticks, FPS counter,
 * and labels. Also translates keyboard/mouse into the same input state so
 * the game can be tested on a computer.
 */
export class HudScene extends Phaser.Scene {
  private moveStick!: VirtualJoystick;
  private aimStick!: VirtualJoystick;
  private fpsText?: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private safe: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

  constructor() {
    super('Hud');
  }

  create(data: { roomName: string }): void {
    // Two thumbs plus a spare finger for future buttons
    this.input.addPointer(2);

    this.moveStick = new VirtualJoystick(this, 0xffffff);
    this.aimStick = new VirtualJoystick(this, 0x7fffd4);

    const style = { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '18px', color: COLORS.uiText };
    this.roomText = this.add.text(0, 0, data.roomName.toUpperCase(), { ...style, fontSize: '22px', fontStyle: 'bold' })
      .setOrigin(0.5, 0).setShadow(0, 2, '#000', 4);
    // Small labels get a dark backing so they stay readable over the light floor
    const tag = { ...style, backgroundColor: '#0d2b2ecc', padding: { x: 8, y: 4 } };
    this.versionText = this.add.text(0, 0, __APP_VERSION__, { ...tag, fontSize: '14px' }).setOrigin(1, 0);
    if (DISPLAY.showFps) this.fpsText = this.add.text(0, 0, '', { ...tag, fontSize: '16px' });

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.on('gameout', () => (inputState.mouseActive = false));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D',
    }) as HudScene['keys'];

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  /** Positions everything relative to the current screen size and iPhone safe areas. */
  private layout(): void {
    this.safe = readSafeArea();
    const { width, height } = this.scale;
    const m = CONTROLS.hudMargin;
    const { restLeft, restRight } = CONTROLS.joystick;
    this.moveStick.setHome(Math.max(width * restLeft.x, this.safe.left + 110), height * restLeft.y - this.safe.bottom);
    this.aimStick.setHome(Math.min(width * restRight.x, width - this.safe.right - 110), height * restRight.y - this.safe.bottom);
    this.roomText.setPosition(width / 2, this.safe.top + m);
    this.versionText.setPosition(width - this.safe.right - m, this.safe.top + m);
    this.fpsText?.setPosition(this.safe.left + m, this.safe.top + m);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // Left half of the screen moves, right half aims
    const stick = pointer.x < this.scale.width / 2 ? this.moveStick : this.aimStick;
    if (!stick.active) stick.start(pointer);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.moveStick.pointerId) this.moveStick.move(pointer);
    else if (pointer.id === this.aimStick.pointerId) this.aimStick.move(pointer);
    else if (!pointer.wasTouch) {
      inputState.mouseActive = true;
      inputState.mouseX = pointer.x;
      inputState.mouseY = pointer.y;
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.moveStick.pointerId) this.moveStick.release();
    if (pointer.id === this.aimStick.pointerId) this.aimStick.release();
  }

  update(): void {
    // Movement: touch stick, or keyboard when the stick is idle
    let mx = this.moveStick.value.x;
    let my = this.moveStick.value.y;
    if (!this.moveStick.active) {
      const k = this.keys;
      mx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
      my = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
      const len = Math.hypot(mx, my);
      if (len > 1) { mx /= len; my /= len; }
    }
    inputState.moveX = mx;
    inputState.moveY = my;

    // Aim: only counts once the thumb is pushed past the threshold
    const aim = this.aimStick.value;
    const aimLen = aim.length();
    inputState.aiming = this.aimStick.active && aimLen >= CONTROLS.aimThreshold;
    if (inputState.aiming) {
      inputState.aimX = aim.x / aimLen;
      inputState.aimY = aim.y / aimLen;
      inputState.mouseActive = false;
    }

    this.fpsText?.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
  }
}
