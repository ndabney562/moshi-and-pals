import Phaser from 'phaser';
import { settings } from '../core/settings';
import { MENU } from './menuTheme';

/**
 * Tactile arcade on-screen button with layered depth, beveled rim,
 * physical press offset, and optional progress ring (cooldowns, refills).
 */
export class HudButton extends Phaser.GameObjects.Container {
  /** 3D drop-shadow / bottom lip providing physical elevation. */
  private readonly shadowDisc: Phaser.GameObjects.Arc;
  /** Beveled outer rim / casing. */
  private readonly casing: Phaser.GameObjects.Arc;
  /** Tactile inner face disc that depresses on touch. */
  private readonly disc: Phaser.GameObjects.Arc;
  /** Specular highlight arc along the top rim. */
  private readonly highlight: Phaser.GameObjects.Graphics;
  /** Progress ring for cooldowns and hold-to-confirm sweeps. */
  private readonly ring: Phaser.GameObjects.Graphics;
  /** Public label so HUD and automated test harnesses can inspect button text. */
  public readonly label: Phaser.GameObjects.Text;

  private pulse?: Phaser.Tweens.Tween;
  /** Pointer currently holding this button down, if any. */
  private holdPointerId: number | null = null;
  /** Hold-to-confirm: when > 0, the action fires only after the button is held this long (a ring fills). */
  private holdMs = 0;
  private holdStartedAt = 0;
  private holdFired = false;

  constructor(
    scene: Phaser.Scene,
    readonly radius: number,
    text: string,
    private readonly color: number,
    onPress: () => void,
  ) {
    super(scene, 0, 0);

    // 1. Bottom elevation shadow (gives 3D physical height)
    const shadowOffset = Math.max(3, Math.round(radius * 0.08));
    this.shadowDisc = scene.add.circle(0, shadowOffset, radius, 0x051314, 0.78);

    // 2. Beveled outer casing / rim with rich dark-slate teal base
    this.casing = scene.add.circle(0, 0, radius, 0x0c2528, 0.92)
      .setStrokeStyle(3.5, color, 0.95);

    // 3. Tactile button face (inset disc with rich color tone)
    const innerRadius = radius - 3.5;
    this.disc = scene.add.circle(0, 0, innerRadius, color, 0.24);

    // 4. Subtle top-edge gloss / highlight reflection
    this.highlight = scene.add.graphics();
    this.highlight.lineStyle(2, 0xffffff, 0.35);
    this.highlight.beginPath();
    this.highlight.arc(0, 0, innerRadius - 2, -Math.PI * 0.8, -Math.PI * 0.2);
    this.highlight.strokePath();

    // 5. Progress ring overlay
    this.ring = scene.add.graphics();

    // 6. Crisp arcade typography matching menu tokens
    this.label = scene.add.text(0, 0, text, {
      fontFamily: MENU.font,
      fontSize: `${Math.round(radius * 0.42)}px`,
      fontStyle: '900',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setShadow(0, 2, '#051314', 4);

    this.fitLabel();

    this.add([this.shadowDisc, this.casing, this.disc, this.highlight, this.ring, this.label]);
    scene.add.existing(this);

    this.setSize(radius * 2, radius * 2);
    this.setInteractive(new Phaser.Geom.Circle(radius, radius, radius * 1.18), Phaser.Geom.Circle.Contains);
    this.onPress = onPress;

    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.holdPointerId = pointer.id;
      // Tactile press: compress scale and shift face down towards shadow
      this.disc.setFillStyle(this.color, 0.65);
      this.disc.setPosition(0, 2);
      this.label.setPosition(0, 2);
      this.setScale(0.94);
      if (this.holdMs > 0) {
        this.holdStartedAt = scene.time.now;
        this.holdFired = false;
      } else {
        onPress();
      }
    });

    // Release when that finger lifts anywhere, so a thumb that slides off still lets go
    const release = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.holdPointerId) return;
      this.release();
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    this.once('destroy', () => {
      scene.input.off('pointerup', release);
      scene.input.off('pointerupoutside', release);
    });
  }

  private readonly onPress: () => void;

  private fitLabel(): void {
    const maxW = this.radius * 1.72;
    if (this.label.width > maxW) {
      this.label.setScale(maxW / this.label.width);
    } else {
      this.label.setScale(1);
    }
  }

  /** Lets go as if the finger lifted (used when the game pauses mid-hold). */
  release(): void {
    if (this.holdMs > 0 && this.holdPointerId !== null) this.setProgress(-1);
    this.holdPointerId = null;
    this.disc.setFillStyle(this.color, 0.24);
    this.disc.setPosition(0, 0);
    this.label.setPosition(0, 0);
    this.setScale(1);
  }

  setLabel(text: string): this {
    this.label.setText(text);
    this.fitLabel();
    return this;
  }

  /** True while a finger (or mouse) is holding the button down. */
  get held(): boolean {
    return this.holdPointerId !== null;
  }

  /** Id of the pointer holding the button, or null. */
  get holdPointer(): number | null {
    return this.holdPointerId;
  }

  /** Makes the button fire only after being held for `ms` (0 = fire on touch). Used for purchases. */
  setHoldToConfirm(ms: number): this {
    if (ms === this.holdMs) return this;
    this.holdMs = ms;
    this.holdFired = false;
    this.setProgress(-1);
    return this;
  }

  /** Call every frame: advances the hold-to-confirm ring and fires once it fills. */
  tick(now: number): void {
    if (this.holdMs <= 0 || this.holdPointerId === null || this.holdFired) return;
    const p = (now - this.holdStartedAt) / this.holdMs;
    if (p >= 1) {
      this.holdFired = true;
      this.setProgress(-1);
      this.onPress();
    } else {
      this.setProgress(p);
    }
  }

  /** A highlighted arc on the progress ring (Perfect Pour's sweet spot), as fractions 0..1. */
  private window?: [number, number];

  setWindow(window?: [number, number]): this {
    this.window = window;
    return this;
  }

  /** Draws a ring showing 0..1 progress; pass a negative number to hide it. */
  setProgress(p: number): this {
    this.ring.clear();
    if (p < 0) return this;
    const strokeR = this.radius - 2;
    if (this.window) {
      const [a, b] = this.window;
      const inside = p >= a && p <= b;
      this.ring.lineStyle(inside ? 14 : 10, 0xffe66d, inside ? 1 : 0.65).beginPath()
        .arc(0, 0, strokeR, -Math.PI / 2 + Math.PI * 2 * a, -Math.PI / 2 + Math.PI * 2 * b).strokePath();
    }
    // High-visibility progress sweep with soft outer glow
    this.ring.lineStyle(8, 0xffffff, 0.95).beginPath()
      .arc(0, 0, strokeR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p).strokePath();
    return this;
  }

  /** Throbs to get attention (e.g. "your bottle is empty"). */
  setUrgent(urgent: boolean): void {
    if (urgent && !settings.reducedMotion && !this.pulse) {
      this.pulse = this.scene.tweens.add({
        targets: [this.casing, this.disc],
        scale: 1.14,
        duration: 280,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if ((!urgent || settings.reducedMotion) && this.pulse) {
      this.pulse.stop();
      this.pulse = undefined;
      this.casing.setScale(1);
      this.disc.setScale(1);
    }
  }
}
