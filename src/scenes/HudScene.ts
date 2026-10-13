import Phaser from 'phaser';
import { CONTROLS } from '../config/controls';
import { DISPLAY } from '../config/display';
import { COLORS } from '../config/theme';
import { events, GameEvents, type EquipmentChangedPayload, type GermKilledPayload } from '../core/events';
import { inputState } from '../core/inputState';
import { readSafeArea, type Insets } from '../core/safeArea';
import { BottleMeter } from '../ui/BottleMeter';
import { HudButton } from '../ui/HudButton';
import { VirtualJoystick } from '../ui/VirtualJoystick';

/**
 * Screen-space overlay drawn above the game: touch joysticks, FPS counter,
 * and labels. Also translates keyboard/mouse into the same input state so
 * the game can be tested on a computer.
 */
export class HudScene extends Phaser.Scene {
  private moveStick!: VirtualJoystick;
  /** Only exists in the twin-stick scheme. */
  private aimStick?: VirtualJoystick;
  private sprayButton?: HudButton;
  private fpsText?: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private refillButton!: HudButton;
  private bottle!: BottleMeter;
  private mouseDown = false;
  private spaceDown = false;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'r', Phaser.Input.Keyboard.Key>;
  private safe: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

  constructor() {
    super('Hud');
  }

  create(data: { roomName: string }): void {
    // Two thumbs plus a spare finger for future buttons
    this.input.addPointer(2);

    this.moveStick = new VirtualJoystick(this, 0xffffff);
    if (CONTROLS.scheme === 'twinStick') {
      this.aimStick = new VirtualJoystick(this, 0x7fffd4);
    } else {
      this.sprayButton = new HudButton(this, CONTROLS.buttons.sprayRadius, 'SPRAY', 0x7fffd4, () => {});
    }

    const style = { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '18px', color: COLORS.uiText };
    this.roomText = this.add.text(0, 0, data.roomName.toUpperCase(), { ...style, fontSize: '22px', fontStyle: 'bold' })
      .setOrigin(0.5, 0).setShadow(0, 2, '#000', 4);
    // Small labels get a dark backing so they stay readable over the light floor
    const tag = { ...style, backgroundColor: '#0d2b2ecc', padding: { x: 8, y: 4 } };
    this.versionText = this.add.text(0, 0, __APP_VERSION__, { ...tag, fontSize: '14px' }).setOrigin(1, 0);
    if (DISPLAY.showFps) this.fpsText = this.add.text(0, 0, '', { ...tag, fontSize: '16px' });
    this.killText = this.add.text(0, 0, 'GERMS DISINFECTED: 0', { ...tag, fontSize: '16px' }).setOrigin(0.5, 0);

    this.bottle = new BottleMeter(this);
    this.refillButton = new HudButton(this, CONTROLS.buttons.refillRadius, 'REFILL', 0x2a9df4, () => {
      inputState.refillRequested = true;
    });

    const onEquipment = (p: EquipmentChangedPayload) => {
      this.bottle.set(p.ammo, p.capacity, p.refillProgress);
      this.refillButton.setProgress(p.refillProgress);
      this.refillButton.setUrgent(p.refillProgress < 0 && p.ammo / p.capacity < 0.15);
    };
    const onKill = (p: GermKilledPayload) => this.killText.setText(`GERMS DISINFECTED: ${p.totalKills}`);
    events.on(GameEvents.EquipmentChanged, onEquipment);
    events.on(GameEvents.GermKilled, onKill);
    this.events.once('shutdown', () => {
      events.off(GameEvents.EquipmentChanged, onEquipment);
      events.off(GameEvents.GermKilled, onKill);
    });

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.on('gameout', () => (inputState.mouseActive = false));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D', r: 'R',
    }) as HudScene['keys'];
    this.keys.r.on('down', () => (inputState.refillRequested = true));
    this.input.keyboard!.addKey('SPACE').on('down', () => (this.spaceDown = true)).on('up', () => (this.spaceDown = false));

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
    const rightX = Math.min(width * restRight.x, width - this.safe.right - 110);
    const rightY = height * restRight.y - this.safe.bottom;
    this.aimStick?.setHome(rightX, rightY);
    this.sprayButton?.setPosition(rightX, rightY);
    this.roomText.setPosition(width / 2, this.safe.top + m);
    this.versionText.setPosition(width - this.safe.right - m, this.safe.top + m);
    this.fpsText?.setPosition(this.safe.left + m, this.safe.top + m);
    this.killText.setPosition(width / 2, this.safe.top + m + 34);
    const right = width - this.safe.right - m;
    const refillY = rightY - CONTROLS.buttons.sprayRadius - CONTROLS.buttons.refillRadius - 24;
    this.refillButton.setPosition(right - CONTROLS.buttons.refillRadius, refillY);
    this.bottle.setPosition(right - CONTROLS.buttons.refillRadius * 2 - 44, refillY - 10);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (over.length > 0) return; // touched a button, not the floor
    if (!pointer.wasTouch) {
      // Desktop testing: hold the mouse to spray toward the cursor
      this.mouseDown = true;
      return;
    }
    // Left half of the screen moves, right half aims
    const stick = pointer.x < this.scale.width / 2 ? this.moveStick : this.aimStick;
    if (stick && !stick.active) stick.start(pointer);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.moveStick.pointerId) this.moveStick.move(pointer);
    else if (this.aimStick && pointer.id === this.aimStick.pointerId) this.aimStick.move(pointer);
    else if (!pointer.wasTouch) {
      inputState.mouseActive = true;
      inputState.mouseX = pointer.x;
      inputState.mouseY = pointer.y;
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) this.mouseDown = false;
    if (pointer.id === this.moveStick.pointerId) this.moveStick.release();
    if (this.aimStick && pointer.id === this.aimStick.pointerId) this.aimStick.release();
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
    const aim = this.aimStick?.value;
    const aimLen = aim ? aim.length() : 0;
    inputState.aiming = !!this.aimStick?.active && aimLen >= CONTROLS.aimThreshold;
    if (aim && inputState.aiming) {
      inputState.aimX = aim.x / aimLen;
      inputState.aimY = aim.y / aimLen;
      inputState.mouseActive = false;
    }
    // Spray: SPRAY button, or the aim stick in twin-stick mode, or the mouse on desktop
    inputState.firing = !!this.sprayButton?.held || this.spaceDown || inputState.aiming || (this.mouseDown && inputState.mouseActive);

    this.fpsText?.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
  }
}
