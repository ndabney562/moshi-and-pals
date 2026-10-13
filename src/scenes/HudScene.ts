import Phaser from 'phaser';
import { CONTROLS } from '../config/controls';
import { DISPLAY } from '../config/display';
import { COLORS } from '../config/theme';
import { BALANCE } from '../config/balance';
import {
  events, GameEvents, type BossPayload, type EquipmentChangedPayload, type HealthPayload, type RoundPayload,
} from '../core/events';
import { inputState } from '../core/inputState';
import { readSafeArea, type Insets } from '../core/safeArea';
import { saveSettings, settings } from '../core/settings';
import { Bar } from '../ui/Bar';
import { BottleMeter } from '../ui/BottleMeter';
import type { GameScene } from './GameScene';
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
  private roundText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private health!: Bar;
  private bossBar!: Bar;
  private banner!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;
  /** Red screen-edge flash on damage; pulses when health is low. */
  private vignette!: Phaser.GameObjects.Graphics;
  private lowHealthPulse?: Phaser.Tweens.Tween;
  private autoAimToggle?: Phaser.GameObjects.Text;
  private refillButton!: HudButton;
  private bottle!: BottleMeter;
  private mouseDown = false;
  private spaceDown = false;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'r', Phaser.Input.Keyboard.Key>;
  private safe: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

  constructor() {
    super('Hud');
  }

  create(): void {
    // Two thumbs plus a spare finger for future buttons
    this.input.addPointer(2);

    this.moveStick = new VirtualJoystick(this, 0xffffff);
    if (CONTROLS.scheme === 'twinStick') {
      this.aimStick = new VirtualJoystick(this, 0x7fffd4);
    } else {
      this.sprayButton = new HudButton(this, CONTROLS.buttons.sprayRadius, 'SPRAY', 0x7fffd4, () => {});
    }

    const style = { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '18px', color: COLORS.uiText };
    this.vignette = this.add.graphics().setAlpha(0).setDepth(-1);
    this.roundText = this.add.text(0, 0, '', { ...style, fontSize: '26px', fontStyle: '900' })
      .setOrigin(0.5, 0).setShadow(0, 2, '#000', 4);
    // Small labels get a dark backing so they stay readable over the light floor
    const tag = { ...style, backgroundColor: '#0d2b2ecc', padding: { x: 8, y: 4 } };
    this.versionText = this.add.text(0, 0, __APP_VERSION__, { ...tag, fontSize: '14px' }).setOrigin(1, 0);
    if (DISPLAY.showFps) this.fpsText = this.add.text(0, 0, '', { ...tag, fontSize: '16px' });
    this.scoreText = this.add.text(0, 0, 'SCORE 0', { ...tag, fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.health = new Bar(this, 240, 22, 0x4cd964, 'EUGENE');
    this.bossBar = new Bar(this, 420, 20, 0xd64545, '').setVisible(false);

    this.banner = this.add.text(0, 0, '', { ...style, fontSize: '72px', fontStyle: '900' })
      .setOrigin(0.5).setShadow(0, 6, '#000', 10).setAlpha(0);
    this.bannerSub = this.add.text(0, 0, '', { ...style, fontSize: '26px', fontStyle: 'italic', color: COLORS.uiAccent })
      .setOrigin(0.5).setShadow(0, 3, '#000', 6).setAlpha(0);

    // Auto-aim on/off, remembered on this device (only meaningful with the SPRAY button)
    if (this.sprayButton) {
      this.autoAimToggle = this.add.text(0, 0, '', { ...tag, fontSize: '16px', padding: { x: 10, y: 8 } })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          settings.autoAim = !settings.autoAim;
          saveSettings();
          this.refreshAutoAimToggle();
        });
      this.refreshAutoAimToggle();
    }

    this.bottle = new BottleMeter(this);
    this.refillButton = new HudButton(this, CONTROLS.buttons.refillRadius, 'REFILL', 0x2a9df4, () => {
      inputState.refillRequested = true;
    });

    const onEquipment = (p: EquipmentChangedPayload) => {
      this.bottle.set(p.ammo, p.capacity, p.refillProgress);
      this.refillButton.setProgress(p.refillProgress);
      this.refillButton.setUrgent(p.refillProgress < 0 && p.ammo / p.capacity < 0.15);
    };
    const onHealth = (p: HealthPayload) => this.showHealth(p);
    const onHurt = () => this.flashDamage();
    const onScore = (p: { score: number }) => this.scoreText.setText(`SCORE ${p.score.toLocaleString()}`);
    const onRound = (p: RoundPayload) => {
      this.roundText.setText(`ROUND ${p.round}`);
      this.showBanner(`ROUND ${p.round}`, p.title);
    };
    const onCleared = (p: { round: number }) => this.showBanner('CLEARED!', `Round ${p.round} sanitized. Refill while you can.`, 1800);
    const onBoss = (p: BossPayload) => {
      this.bossBar.setVisible(true).setValue(p.hp, p.maxHp, p.name.toUpperCase());
    };
    const onBossHealth = (p: BossPayload) => this.bossBar.setValue(p.hp, p.maxHp);
    const onBossDown = () => this.time.delayedCall(600, () => this.bossBar.setVisible(false));

    const listeners: [string, (...args: never[]) => void][] = [
      [GameEvents.EquipmentChanged, onEquipment],
      [GameEvents.PlayerHealthChanged, onHealth],
      [GameEvents.PlayerBumped, onHurt],
      [GameEvents.ScoreChanged, onScore],
      [GameEvents.RoundStarted, onRound],
      [GameEvents.RoundCompleted, onCleared],
      [GameEvents.BossSpawned, onBoss],
      [GameEvents.BossHealth, onBossHealth],
      [GameEvents.BossDefeated, onBossDown],
    ];
    for (const [name, fn] of listeners) events.on(name, fn);
    this.events.once('shutdown', () => {
      for (const [name, fn] of listeners) events.off(name, fn);
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

    // Ask the game for current health/score/bottle so the HUD starts correct
    (this.scene.get('Game') as GameScene).broadcastState();
  }

  private showHealth(p: HealthPayload): void {
    this.health.setValue(p.hp, p.maxHp, `EUGENE ${Math.ceil(p.hp)}`);
    const low = p.hp / p.maxHp < BALANCE.player.lowHealth;
    this.health.setColor(low ? 0xff5a5a : p.hp / p.maxHp < 0.6 ? 0xffc145 : 0x4cd964);
    if (low && p.hp > 0 && !this.lowHealthPulse) {
      this.lowHealthPulse = this.tweens.add({ targets: this.vignette, alpha: { from: 0.15, to: 0.55 }, duration: 520, yoyo: true, repeat: -1 });
    } else if ((!low || p.hp <= 0) && this.lowHealthPulse) {
      this.lowHealthPulse.stop();
      this.lowHealthPulse = undefined;
      this.vignette.setAlpha(0);
    }
  }

  private flashDamage(): void {
    if (this.lowHealthPulse) return; // already pulsing
    this.tweens.killTweensOf(this.vignette);
    this.vignette.setAlpha(0.8);
    this.tweens.add({ targets: this.vignette, alpha: 0, duration: 400 });
  }

  private showBanner(title: string, subtitle: string, holdMs = 2200): void {
    for (const t of [this.banner, this.bannerSub]) this.tweens.killTweensOf(t);
    this.banner.setText(title).setAlpha(0).setScale(1.6);
    this.bannerSub.setText(subtitle).setAlpha(0);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 350, ease: 'Back.out' });
    this.tweens.add({ targets: this.bannerSub, alpha: 1, duration: 350, delay: 150 });
    this.tweens.add({ targets: [this.banner, this.bannerSub], alpha: 0, duration: 450, delay: holdMs });
  }

  /** Thick red border drawn once per resize; its alpha is what animates. */
  private drawVignette(width: number, height: number): void {
    const g = this.vignette.clear();
    for (let i = 0; i < 6; i++) {
      g.lineStyle(14, 0xff2020, 0.35 - i * 0.05).strokeRect(i * 12, i * 12, width - i * 24, height - i * 24);
    }
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
    this.drawVignette(width, height);
    this.roundText.setPosition(width / 2, this.safe.top + m - 4);
    this.scoreText.setPosition(width / 2, this.safe.top + m + 30);
    this.bossBar.setPosition(width / 2 - this.bossBar.barWidth / 2, this.safe.top + m + 68);
    this.banner.setPosition(width / 2, height * 0.38);
    this.bannerSub.setPosition(width / 2, height * 0.38 + 60);
    this.health.setPosition(this.safe.left + m, this.safe.top + m);
    this.autoAimToggle?.setPosition(this.safe.left + m, this.safe.top + m + this.health.outerHeight + 10);
    this.versionText.setPosition(width - this.safe.right - m, this.safe.top + m);
    this.fpsText?.setOrigin(1, 0).setPosition(width - this.safe.right - m, this.safe.top + m + 30);
    const right = width - this.safe.right - m;
    const refillY = rightY - CONTROLS.buttons.sprayRadius - CONTROLS.buttons.refillRadius - 24;
    this.refillButton.setPosition(right - CONTROLS.buttons.refillRadius, refillY);
    this.bottle.setPosition(right - CONTROLS.buttons.refillRadius * 2 - 44, refillY - 10);
  }

  private refreshAutoAimToggle(): void {
    this.autoAimToggle?.setText(`AUTO-AIM: ${settings.autoAim ? 'ON' : 'OFF'}`)
      .setColor(settings.autoAim ? COLORS.uiAccent : '#ffb3b3');
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
