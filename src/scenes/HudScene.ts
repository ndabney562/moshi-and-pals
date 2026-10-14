import Phaser from 'phaser';
import { CONTROLS } from '../config/controls';
import { DISPLAY } from '../config/display';
import { COLORS } from '../config/theme';
import { BALANCE } from '../config/balance';
import {
  events, GameEvents, type BossPayload, type EquipmentChangedPayload, type HealthPayload, type RoomPayload, type RoundPayload, type StationPayload, type StreakPayload,
} from '../core/events';
import { DEBUG } from '../core/debug';
import { inputState } from '../core/inputState';
import { resumeAudio, setSfxMuted } from '../core/sfx';
import { TIPS } from '../data/tips';
import { HINTS, type HintDef } from '../data/tutorial';
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
  /** Where SPRAY rests; it floats to wherever a spray-zone touch lands. */
  private readonly sprayHome = new Phaser.Math.Vector2();
  /** A touch on the right half (not on a button) that is spraying, if any. */
  private sprayTouchId: number | null = null;
  /** Small warning above USE (e.g. "Replaces your UV Wand"). */
  private interactNote!: Phaser.GameObjects.Text;
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
  /** AUTO-AIM ON/OFF, in the pause menu (SPRAY-button scheme only). */
  private autoAimToggle?: Phaser.GameObjects.Text;
  private pauseButton!: HudButton;
  private pauseMenu!: Phaser.GameObjects.Container;
  private pauseDim!: Phaser.GameObjects.Rectangle;
  private pauseTitle!: Phaser.GameObjects.Text;
  private pauseTip!: Phaser.GameObjects.Text;
  private pauseVersion!: Phaser.GameObjects.Text;
  private resumeItem!: Phaser.GameObjects.Text;
  private soundToggle!: Phaser.GameObjects.Text;
  private autoRefillToggle!: Phaser.GameObjects.Text;
  private motionToggle!: Phaser.GameObjects.Text;
  /** Teach-as-you-play hint currently shown (one at a time), with an arrow toward its control. */
  private hintText!: Phaser.GameObjects.Text;
  private hint?: HintDef;
  private nextHintCheckAt = 0;
  /** How long the current "doing it" condition has held (to mark a hint learned). */
  private hintProgressMs = 0;
  /** Gold-ring pour hint: shown at most a few refills even if never nailed. */
  private pourHintsShown = 0;
  private wasRefilling = false;
  private quitItem!: Phaser.GameObjects.Text;
  private quitArmedUntil = 0;
  private paused = false;
  private refillButton!: HudButton;
  private purgeButton!: HudButton;
  private interactButton!: HudButton;
  private swapButton!: HudButton;
  private toolText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private copaysText!: Phaser.GameObjects.Text;
  /** SANITATION STREAK ×N under the Copays, with a bar for the time left to keep it going. */
  private streakText!: Phaser.GameObjects.Text;
  private streakBar!: Phaser.GameObjects.Graphics;
  /** Round that just finished without a scratch (the CLEARED banner becomes SPOTLESS). */
  private spotless?: { round: number; copays: number };
  private streakShown = 0;
  /** Power-ups running now: an icon, a name and a draining bar each, under the health bar. */
  private readonly powerRows: { icon: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }[] = [];
  private powerBars!: Phaser.GameObjects.Graphics;
  /** Pooled edge arrows pointing at off-screen germs. */
  private readonly arrows: Phaser.GameObjects.Image[] = [];
  private readonly threatPicks: { dx: number; dy: number; d: number; color: number; boss: boolean }[] = [];
  private bottle!: BottleMeter;
  private mouseDown = false;
  private spaceDown = false;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'r' | 'q' | 'e' | 'x', Phaser.Input.Keyboard.Key>;
  private safe: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  /** Debug overlay: recent frame times (ms), sampled every frame. */
  private readonly frameTimes: number[] = [];
  private nextStatsAt = 0;

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
    this.versionText = this.add.text(0, 0, __APP_VERSION__, { ...tag, fontSize: '14px' }).setOrigin(1, 0).setVisible(DEBUG.overlay);
    if (DISPLAY.showFps || DEBUG.overlay) this.fpsText = this.add.text(0, 0, '', { ...tag, fontSize: '16px', align: 'right' });
    this.scoreText = this.add.text(0, 0, 'SCORE 0', { ...tag, fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.roomText = this.add.text(0, 0, '', { ...tag, fontSize: '15px' }).setOrigin(1, 0);
    this.copaysText = this.add.text(0, 0, '$0 COPAYS', { ...tag, fontSize: '17px', fontStyle: 'bold', color: COLORS.uiAccent }).setOrigin(0.5, 0);
    this.streakText = this.add.text(0, 0, '', { ...style, fontSize: '18px', fontStyle: '900', color: '#ffe66d' })
      .setOrigin(0.5, 0).setShadow(0, 2, '#000', 4).setVisible(false);
    this.streakBar = this.add.graphics();
    this.arrows.length = 0;
    for (let i = 0; i < CONTROLS.maxThreatArrows; i++) {
      this.arrows.push(this.add.image(0, 0, 'threat-arrow').setVisible(false).setDepth(-0.5));
    }
    this.health = new Bar(this, 240, 22, 0x4cd964, 'EUGENE');
    this.powerRows.length = 0;
    for (let i = 0; i < 4; i++) {
      this.powerRows.push({
        icon: this.add.image(0, 0, 'pill').setScale(0.6).setVisible(false),
        text: this.add.text(0, 0, '', { ...tag, fontSize: '14px', fontStyle: 'bold' }).setOrigin(0, 0.5).setVisible(false),
      });
    }
    this.powerBars = this.add.graphics();
    this.bossBar = new Bar(this, 420, 20, 0xd64545, '').setVisible(false);

    this.banner = this.add.text(0, 0, '', { ...style, fontSize: '72px', fontStyle: '900' })
      .setOrigin(0.5).setShadow(0, 6, '#000', 10).setAlpha(0);
    this.bannerSub = this.add.text(0, 0, '', { ...style, fontSize: '26px', fontStyle: 'italic', color: COLORS.uiAccent })
      .setOrigin(0.5).setShadow(0, 3, '#000', 6).setAlpha(0);

    // Pause: top-right corner, away from both thumbs. Settings live in the pause menu.
    this.pauseButton = new HudButton(this, CONTROLS.buttons.pauseRadius, 'II', 0xe8fff9, () => this.pause());
    this.buildPauseMenu(style);

    this.hintText = this.add.text(0, 0, '', {
      ...style, fontSize: '22px', fontStyle: '900', color: '#0d2b2e', backgroundColor: '#ffe66d', padding: { x: 14, y: 8 }, align: 'center',
    }).setOrigin(0.5).setDepth(50).setVisible(false);
    this.tweens.add({ targets: this.hintText, scale: 1.06, duration: 420, yoyo: true, repeat: -1 });
    this.hint = undefined;
    this.bottle = new BottleMeter(this);
    this.refillButton = new HudButton(this, CONTROLS.buttons.refillRadius, 'REFILL', 0x2a9df4, () => {
      inputState.refillRequested = true;
    });

    this.purgeButton = new HudButton(this, CONTROLS.buttons.purgeRadius, 'SINUS\nPURGE', 0xc8ff6b, () => {
      inputState.purgeRequested = true;
    });
    // SWAP appears once a crate has given Eugene a second tool
    this.swapButton = new HudButton(this, CONTROLS.buttons.swapRadius, 'SWAP', 0xffe66d, () => {
      inputState.swapRequested = true;
    }).setVisible(false);
    this.toolText = this.add.text(0, 0, '', { ...tag, fontSize: '14px', fontStyle: 'bold' }).setOrigin(1, 1);

    // USE pops up at supply carts (restock) and locked doors (buy them open)
    this.interactButton = new HudButton(this, CONTROLS.buttons.interactRadius, 'USE', 0x7fffd4, () => {
      inputState.interactRequested = true;
    }).setVisible(false);
    this.interactNote = this.add.text(0, 0, '', { ...tag, fontSize: '13px', fontStyle: 'bold', align: 'center', color: '#ffe66d' })
      .setOrigin(0.5, 1).setVisible(false);

    const onEquipment = (p: EquipmentChangedPayload) => {
      this.bottle.set(p);
      this.swapButton.setVisible(p.slots > 1);
      this.refillButton.setVisible(!p.selfCharging);
      this.refillButton.setWindow(p.pourWindow).setProgress(p.refillProgress);
      // Mid-pour the button says when to tap; FRESH BOTTLE shows on the tool label
      this.refillButton.setLabel(p.refillProgress >= 0 ? 'TAP IN\nGOLD' : 'REFILL');
      this.toolText.setText(p.fresh ? `${p.name.toUpperCase()} · FRESH!` : p.name.toUpperCase()).setColor(p.fresh ? '#ffe66d' : COLORS.uiText);
      this.refillButton.setUrgent(p.refillProgress < 0 && p.ammo / p.capacity < 0.15);
    };
    const onHealth = (p: HealthPayload) => this.showHealth(p);
    const onHurt = () => this.flashDamage();
    const onScore = (p: { score: number }) => this.scoreText.setText(`SCORE ${p.score.toLocaleString()}`);
    const onRound = (p: RoundPayload) => {
      if (p.special) {
        this.roundText.setText(`ROUND ${p.round}`);
        this.showBanner(p.special, p.title.split(': ').slice(1).join(': '), 2600);
        this.banner.setColor('#ffe66d');
        return;
      }
      this.banner.setColor(COLORS.uiText);
      this.roundText.setText(`ROUND ${p.round}`);
      this.showBanner(`ROUND ${p.round}`, p.title);
    };
    const onCleared = (p: { round: number }) => {
      if (this.spotless?.round === p.round) {
        this.showBanner('SPOTLESS!', `Round ${p.round} without a scratch. +$${this.spotless.copays} Copays`, 2000);
      } else {
        this.showBanner('CLEARED!', `Round ${p.round} sanitized. Refill while you can.`, 1800);
      }
    };
    const onSpotless = (p: { round: number; copays: number }) => { this.spotless = p; };
    const onStreak = (p: StreakPayload) => this.showStreak(p);
    const onPowerups = (p: { active: { name: string; color: number; left: number }[] }) => this.showPowerups(p.active);
    const onPicked = (p: { name: string; blurb: string }) => this.showBanner(p.name, p.blurb, 1300);
    const onPurgeUsed = () => this.learn('purge');
    const onBought = () => this.learn('buy');
    const onPerfect = (p: EquipmentChangedPayload) => { if (p.fresh) this.learn('pour'); };
    const onBoss = (p: BossPayload) => {
      this.bossBar.setVisible(true).setValue(p.hp, p.maxHp, p.name.toUpperCase());
    };
    const onBossHealth = (p: BossPayload) => this.bossBar.setValue(p.hp, p.maxHp);
    const onCopays = (p: { copays: number }) => this.copaysText.setText(`$${p.copays.toLocaleString()} COPAYS`);
    const onPurge = (p: { progress: number }) => {
      const ready = p.progress >= 1;
      this.purgeButton.setProgress(ready ? -1 : p.progress).setAlpha(ready ? 1 : 0.55);
    };
    const onStation = (p: StationPayload) => {
      this.interactButton.setVisible(p.near).setLabel(p.label).setAlpha(p.affordable ? 1 : 0.55)
        .setHoldToConfirm(p.hold && p.affordable ? CONTROLS.holdToBuyMs : 0);
      if (!p.near) this.interactButton.release();
      this.interactNote.setText(p.near ? [p.note, p.hold && p.affordable ? 'HOLD TO BUY' : ''].filter(Boolean).join('\n') : '').setVisible(p.near);
    };
    const onRoomEntered = (p: RoomPayload) => this.roomText.setText(`📍 ${p.name.toUpperCase()}`);
    const onTool = (p: { name: string }) => this.showBanner(p.name.toUpperCase(), 'New tool! Tap SWAP to switch back to the bottle.', 2000);
    const onRoomUnlocked = (p: RoomPayload) => this.showBanner(`${p.name.toUpperCase()} OPEN`, 'More room to run. More places for germs, too.', 1800);
    const onBossDown = () => this.time.delayedCall(600, () => this.bossBar.setVisible(false));

    const listeners: [string, (...args: never[]) => void][] = [
      [GameEvents.EquipmentChanged, onEquipment],
      [GameEvents.PlayerHealthChanged, onHealth],
      [GameEvents.PlayerBumped, onHurt],
      [GameEvents.ScoreChanged, onScore],
      [GameEvents.RoundStarted, onRound],
      [GameEvents.RoundCompleted, onCleared],
      [GameEvents.SpotlessRound, onSpotless],
      [GameEvents.StreakChanged, onStreak],
      [GameEvents.PurgeUsed, onPurgeUsed],
      [GameEvents.PowerupsChanged, onPowerups],
      [GameEvents.PowerupPicked, onPicked],
      [GameEvents.RoomUnlocked, onBought],
      [GameEvents.ToolUnlocked, onBought],
      [GameEvents.EquipmentChanged, onPerfect],
      [GameEvents.BossSpawned, onBoss],
      [GameEvents.BossHealth, onBossHealth],
      [GameEvents.BossDefeated, onBossDown],
      [GameEvents.CopaysChanged, onCopays],
      [GameEvents.PurgeChanged, onPurge],
      [GameEvents.StationNearby, onStation],
      [GameEvents.RoomEntered, onRoomEntered],
      [GameEvents.RoomUnlocked, onRoomUnlocked],
      [GameEvents.ToolUnlocked, onTool],
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

    // Auto-pause when the app is hidden (home screen, app switcher, a call) or loses focus
    const autoPause = () => this.pause();
    this.game.events.on(Phaser.Core.Events.HIDDEN, autoPause);
    this.game.events.on(Phaser.Core.Events.BLUR, autoPause);
    this.events.once('shutdown', () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, autoPause);
      this.game.events.off(Phaser.Core.Events.BLUR, autoPause);
    });

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D', r: 'R', q: 'Q', e: 'E', x: 'X',
    }) as HudScene['keys'];
    this.keys.r.on('down', () => (inputState.refillRequested = true));
    this.keys.q.on('down', () => (inputState.purgeRequested = true));
    this.keys.e.on('down', () => (inputState.interactRequested = true));
    this.keys.x.on('down', () => (inputState.swapRequested = true));
    const togglePause = () => (this.paused ? this.resume() : this.pause());
    kb.addKey('P').on('down', togglePause);
    kb.addKey('ESC').on('down', togglePause);
    this.input.keyboard!.addKey('SPACE').on('down', () => (this.spaceDown = true)).on('up', () => (this.spaceDown = false));

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    // Ask the game for current health/score/bottle so the HUD starts correct
    (this.scene.get('Game') as GameScene).broadcastState();
  }

  private learn(id: string): void {
    if (settings.learned[id]) return;
    settings.learned = { ...settings.learned, [id]: true };
    saveSettings();
    if (this.hint?.id === id) this.hint = undefined;
  }

  /** Marks a hint learned once its action has been held for `ms` (frame deltas accumulate). */
  private practising(doing: boolean, ms: number, id: string): void {
    if (this.hint?.id !== id) return;
    this.hintProgressMs = doing ? this.hintProgressMs + this.game.loop.delta : 0;
    if (this.hintProgressMs >= ms) this.learn(id);
  }

  /**
   * TEACH AS YOU PLAY: picks the first unlearned hint whose moment has come, shows it by its control,
   * and retires it once the player has done the thing. Nothing shows once everything is learned.
   */
  private updateHints(): void {
    const game = this.scene.get('Game') as GameScene;
    if (!game.hintState || game.isRunOver) return;
    const learned = settings.learned;
    // "Doing it" checks run every frame for the hint on screen
    this.practising(this.moveStick.value.length() > 0.4 || inputState.moveX !== 0 || inputState.moveY !== 0, 400, 'move');
    this.practising(inputState.firing, 600, 'spray');
    const now = this.time.now;
    if (now >= this.nextHintCheckAt) {
      this.nextHintCheckAt = now + 200;
      const st = game.hintState();
      // The pour hint: shown for a few refills, learned on the first Perfect Pour
      if (st.refilling && !this.wasRefilling && !learned.pour && !st.selfCharging) this.pourHintsShown++;
      this.wasRefilling = st.refilling;
      if (this.pourHintsShown > 3) this.learn('pour');
      const due = (h: HintDef): boolean => {
        if (learned[h.id]) return false;
        switch (h.id) {
          case 'move': return true;
          case 'spray': return !!learned.move && st.germsNear > 0;
          case 'purge': return st.purgeReady && st.crowd >= 4;
          case 'pour': return st.refilling && !st.selfCharging;
          case 'buy': return this.interactButton.visible && this.interactNote.text.includes('HOLD');
        }
      };
      const next = HINTS.find(due);
      if (next !== this.hint) {
        this.hint = next;
        this.hintProgressMs = 0;
      }
    }
    const h = this.hint;
    this.hintText.setVisible(!!h);
    if (!h) return;
    const anchor = {
      moveStick: this.moveStick.home, spray: this.sprayHome,
      refill: this.refillButton, purge: this.purgeButton, interact: this.interactButton,
    }[h.near];
    const { width } = this.scale;
    this.hintText.setText(`${h.text}  ${h.near === 'moveStick' ? '↓' : h.near === 'interact' ? '↘' : '↓'}`);
    const half = this.hintText.width / 2 + 12;
    this.hintText.setPosition(Phaser.Math.Clamp(anchor.x, half, width - half), Math.max(this.safe.top + 150, anchor.y - 120));
  }

  /**
   * Off-screen threat arrows: for the nearest germs that are off camera but within range,
   * an arrow at the screen edge (inside the safe area) pointing at them, tinted like the germ.
   */
  private updateThreatArrows(): void {
    const game = this.scene.get('Game') as GameScene;
    const cam = game.cameras?.main;
    if (!cam || !game.threatSources) return;
    const { germs, player, floor } = game.threatSources;
    const view = cam.worldView;
    const range2 = CONTROLS.threatArrowRange ** 2;
    const picks = this.threatPicks;
    picks.length = 0;
    for (const g of germs) {
      if (!g.active) continue;
      if (g.x >= view.x && g.x <= view.right && g.y >= view.y && g.y <= view.bottom) continue;
      if (floor && (g.x < floor.x || g.x >= floor.x + floor.w)) continue; // other floor
      const dx = g.x - player.x;
      const dy = g.y - player.y;
      const d = dx * dx + dy * dy;
      if (d > range2) continue;
      picks.push({ dx, dy, d, color: g.def.color, boss: !!g.def.boss });
    }
    picks.sort((a, b) => a.d - b.d);
    // Eugene's spot on screen; arrows sit where the line toward each germ meets the (safe-area) screen edge
    const { width, height } = this.scale;
    const ex = player.x - view.x;
    const ey = player.y - view.y;
    const pad = 26;
    const x0 = this.safe.left + pad, x1 = width - this.safe.right - pad;
    const y0 = this.safe.top + pad, y1 = height - this.safe.bottom - pad;
    for (let i = 0; i < this.arrows.length; i++) {
      const arrow = this.arrows[i];
      const p = picks[i];
      if (!p) {
        arrow.setVisible(false);
        continue;
      }
      const len = Math.sqrt(p.d) || 1;
      const ux = p.dx / len, uy = p.dy / len;
      const tx = ux > 0 ? (x1 - ex) / ux : ux < 0 ? (x0 - ex) / ux : Infinity;
      const ty = uy > 0 ? (y1 - ey) / uy : uy < 0 ? (y0 - ey) / uy : Infinity;
      const t = Math.max(0, Math.min(tx, ty));
      // Closer germs: more opaque
      const near = 1 - Math.sqrt(p.d / range2);
      arrow.setVisible(true).setPosition(ex + ux * t, ey + uy * t).setRotation(Math.atan2(uy, ux))
        .setTint(p.color).setScale(p.boss ? 1.6 : 1).setAlpha(0.45 + 0.55 * near);
    }
  }

  /** Lists running power-ups under the health bar, each with a bar draining as it runs out. */
  private showPowerups(active: { name: string; color: number; left: number }[]): void {
    const m = CONTROLS.hudMargin;
    const x = this.safe.left + m;
    const y0 = this.safe.top + m + this.health.outerHeight + 22;
    const g = this.powerBars.clear();
    this.powerRows.forEach((row, i) => {
      const p = active[i];
      row.icon.setVisible(!!p);
      row.text.setVisible(!!p);
      if (!p) return;
      const y = y0 + i * 30;
      row.icon.setPosition(x + 14, y).setTint(p.color);
      row.text.setPosition(x + 34, y).setText(p.name);
      const w = 120;
      const bx = x + 34, by = y + 12;
      g.fillStyle(0x000000, 0.45).fillRect(bx, by, w, 4);
      g.fillStyle(p.color).fillRect(bx, by, w * Math.max(0, p.left), 4);
    });
  }

  /** Shows the streak from 2 kills up; pops a little each time it grows. */
  private showStreak(p: StreakPayload): void {
    const show = p.count >= 2;
    const grew = show && p.count > this.streakShown;
    this.streakShown = p.count;
    this.streakText.setVisible(show).setText(show ? `STREAK ×${p.count}  ·  $×${p.mult.toFixed(2)}` : '');
    this.streakText.setColor(p.mult > 1 ? '#ffe66d' : COLORS.uiText);
    if (grew) {
      this.tweens.killTweensOf(this.streakText);
      this.streakText.setScale(1.25);
      this.tweens.add({ targets: this.streakText, scale: 1, duration: 140, ease: 'Quad.out' });
    }
    const g = this.streakBar.clear();
    if (!show) return;
    const w = 150;
    const x = this.streakText.x - w / 2;
    const y = this.streakText.y + 26;
    g.fillStyle(0x000000, 0.45).fillRoundedRect(x - 2, y - 2, w + 4, 8, 3);
    g.fillStyle(p.mult > 1 ? 0xffe66d : 0x7fffd4).fillRoundedRect(x, y, Math.max(2, w * p.left), 4, 2);
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
    this.sprayHome.set(rightX, rightY);
    if (this.sprayTouchId === null) this.sprayButton?.setPosition(rightX, rightY);
    this.drawVignette(width, height);
    this.roundText.setPosition(width / 2, this.safe.top + m - 4);
    this.scoreText.setPosition(width / 2, this.safe.top + m + 30);
    this.copaysText.setPosition(width / 2, this.safe.top + m + 62);
    this.streakText.setPosition(width / 2, this.safe.top + m + 94);
    this.bossBar.setPosition(width / 2 - this.bossBar.barWidth / 2, this.safe.top + m + 132);
    this.banner.setPosition(width / 2, height * 0.38);
    this.bannerSub.setPosition(width / 2, height * 0.38 + 60);
    this.health.setPosition(this.safe.left + m, this.safe.top + m);
    const pr = CONTROLS.buttons.pauseRadius;
    this.pauseButton.setPosition(width - this.safe.right - m - pr, this.safe.top + m + pr);
    const infoX = width - this.safe.right - m - pr * 2 - 14;
    this.versionText.setPosition(infoX, this.safe.top + m);
    this.fpsText?.setOrigin(1, 0).setPosition(infoX, this.safe.top + m + 30);
    this.roomText.setPosition(infoX, this.safe.top + m + (DEBUG.overlay ? 110 : 8));
    this.layoutPauseMenu(width, height);
    const right = width - this.safe.right - m;
    const refillY = rightY - CONTROLS.buttons.sprayRadius - CONTROLS.buttons.refillRadius - 24;
    this.refillButton.setPosition(right - CONTROLS.buttons.refillRadius, refillY);
    this.bottle.setPosition(right - CONTROLS.buttons.refillRadius * 2 - 44, refillY - 10);
    this.toolText.setPosition(right, refillY - CONTROLS.buttons.refillRadius - 46);
    // SWAP sits left of the bottle, above SINUS PURGE's thumb zone
    this.swapButton.setPosition(right - CONTROLS.buttons.refillRadius * 2 - 44 - 34 - CONTROLS.buttons.swapRadius - 18, refillY);
    // Sinus Purge sits just left of SPRAY, within the same thumb's reach; USE pops up above it
    const { sprayRadius, purgeRadius, interactRadius } = CONTROLS.buttons;
    const purgeX = rightX - sprayRadius - purgeRadius - 22;
    this.purgeButton.setPosition(purgeX, rightY + sprayRadius - purgeRadius);
    this.interactButton.setPosition(purgeX - 10, rightY - sprayRadius - interactRadius - 10);
    this.interactNote.setPosition(purgeX - 10, rightY - sprayRadius - interactRadius * 2 - 16);
  }

  /** FPS counter; with ?debug, also frame-time p95 and entity counts (text redrawn 4x a second, not every frame). */
  private updateFps(): void {
    if (!this.fpsText) return;
    const loop = this.game.loop;
    if (DEBUG.overlay) {
      this.frameTimes.push(loop.delta);
      if (this.frameTimes.length > 240) this.frameTimes.shift();
    }
    if (loop.now < this.nextStatsAt) return;
    this.nextStatsAt = loop.now + 250;
    if (!DEBUG.overlay) {
      this.fpsText.setText(`${Math.round(loop.actualFps)} FPS`);
      return;
    }
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const worst = sorted[sorted.length - 1] ?? 0;
    const s = (this.scene.get('Game') as GameScene).stats();
    const flags = [DEBUG.god && 'GOD', DEBUG.fpsLimit && `CAP ${DEBUG.fpsLimit}`].filter(Boolean).join(' ');
    this.fpsText.setText([
      `${Math.round(loop.actualFps)} FPS  p95 ${p95.toFixed(1)}ms  max ${worst.toFixed(0)}ms`,
      `germs ${s.germs}  drops ${s.droplets}  fx ${s.particles}  pts ${s.patients}`,
      `DEBUG ${flags}`.trim(),
    ].join('\n'));
  }

  private refreshAutoAimToggle(): void {
    this.autoAimToggle?.setText(`AUTO-AIM: ${settings.autoAim ? 'ON' : 'OFF'}`)
      .setColor(settings.autoAim ? COLORS.uiAccent : '#ffb3b3');
  }

  private refreshSoundToggle(): void {
    this.soundToggle.setText(`SOUND: ${settings.sound ? 'ON' : 'OFF'}`).setColor(settings.sound ? COLORS.uiAccent : '#ffb3b3');
  }

  /** The pause screen: dims the game and offers resume, sound, auto-aim and quit. Hidden until paused. */
  private buildPauseMenu(style: Phaser.Types.GameObjects.Text.TextStyle): void {
    // Swallows touches so nothing underneath (sticks, buttons) reacts while paused
    this.pauseDim = this.add.rectangle(0, 0, 10, 10, 0x0d2b2e, 0.82).setOrigin(0).setInteractive();
    this.pauseTitle = this.add.text(0, 0, 'PAUSED', { ...style, fontSize: '64px', fontStyle: '900' }).setOrigin(0.5).setShadow(0, 5, '#000', 8);
    this.pauseTip = this.add.text(0, 0, '', { ...style, fontSize: '20px', fontStyle: 'italic', color: COLORS.uiAccent, align: 'center', wordWrap: { width: 700 } }).setOrigin(0.5);
    this.pauseVersion = this.add.text(0, 0, `Moshi and Pals ${__APP_VERSION__}`, { ...style, fontSize: '14px', color: '#9fb8b3' }).setOrigin(0.5, 1);
    const item = (label: string, onTap: () => void) => this.add.text(0, 0, label, {
      ...style, fontSize: '26px', fontStyle: 'bold', backgroundColor: '#1f4f55', padding: { x: 22, y: 12 }, align: 'center', fixedWidth: 340,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', onTap);
    this.resumeItem = item('RESUME', () => this.resume());
    this.soundToggle = item('', () => {
      settings.sound = !settings.sound;
      saveSettings();
      setSfxMuted(!settings.sound);
      this.refreshSoundToggle();
    });
    this.autoRefillToggle = item('', () => {
      settings.autoRefill = !settings.autoRefill;
      saveSettings();
      this.refreshAutoRefillToggle();
    });
    this.motionToggle = item('', () => {
      settings.reducedMotion = !settings.reducedMotion;
      saveSettings();
      this.refreshMotionToggle();
    });
    const items: Phaser.GameObjects.Text[] = [this.resumeItem, this.soundToggle, this.autoRefillToggle, this.motionToggle];
    if (this.sprayButton) {
      this.autoAimToggle = item('', () => {
        settings.autoAim = !settings.autoAim;
        saveSettings();
        this.refreshAutoAimToggle();
      });
      items.push(this.autoAimToggle);
    }
    // Quitting throws the run away, so it takes a second tap
    this.quitItem = item('QUIT TO MENU', () => {
      if (this.time.now > this.quitArmedUntil) {
        this.quitArmedUntil = this.time.now + 2500;
        this.quitItem.setText('TAP AGAIN TO QUIT').setColor('#ffb3b3');
        return;
      }
      this.paused = false;
      this.scene.stop('Game');
      this.scene.start('Title');
    });
    items.push(this.quitItem);
    this.pauseMenu = this.add.container(0, 0, [this.pauseDim, this.pauseTitle, this.pauseTip, this.pauseVersion, ...items]).setDepth(100).setVisible(false);
    this.refreshSoundToggle();
    this.refreshAutoAimToggle();
    this.refreshAutoRefillToggle();
    this.refreshMotionToggle();
  }

  private refreshMotionToggle(): void {
    this.motionToggle.setText(`SCREEN SHAKE: ${settings.reducedMotion ? 'OFF' : 'ON'}`).setColor(settings.reducedMotion ? '#ffb3b3' : COLORS.uiAccent);
  }

  private refreshAutoRefillToggle(): void {
    this.autoRefillToggle.setText(`AUTO-REFILL: ${settings.autoRefill ? 'ON' : 'OFF'}`).setColor(settings.autoRefill ? COLORS.uiAccent : '#ffb3b3');
  }

  private layoutPauseMenu(width: number, height: number): void {
    this.pauseDim.setSize(width, height);
    this.pauseDim.input?.hitArea.setSize(width, height);
    this.pauseTitle.setPosition(width / 2, height * 0.15);
    this.pauseTip.setPosition(width / 2, height * 0.15 + 58);
    this.pauseVersion.setPosition(width / 2, height - this.safe.bottom - 10);
    const items = [this.resumeItem, this.soundToggle, this.autoRefillToggle, this.motionToggle, this.autoAimToggle, this.quitItem].filter((t): t is Phaser.GameObjects.Text => !!t);
    const top = height * 0.3;
    const gap = Math.min(66, (height * 0.62) / items.length);
    items.forEach((t, i) => t.setPosition(width / 2, top + i * gap));
  }

  /** Freezes the game and shows the pause menu. Safe to call any time (ignored if already paused or the run is over). */
  pause(): void {
    const game = this.scene.get('Game') as GameScene;
    if (this.paused || !this.scene.isActive('Game') || game.isRunOver) return;
    this.paused = true;
    // Let go of everything, so nothing is stuck "held" when play resumes
    this.moveStick.release();
    this.aimStick?.release();
    this.endSprayTouch();
    for (const b of [this.sprayButton, this.refillButton, this.purgeButton, this.interactButton, this.swapButton]) b?.release();
    this.mouseDown = false;
    this.spaceDown = false;
    Object.assign(inputState, {
      moveX: 0, moveY: 0, aiming: false, firing: false,
      refillRequested: false, purgeRequested: false, interactRequested: false, swapRequested: false,
    });
    this.scene.pause('Game');
    this.quitArmedUntil = 0;
    this.quitItem.setText('QUIT TO MENU').setColor(COLORS.uiText);
    this.pauseTip.setText(`Tip: ${Phaser.Utils.Array.GetRandom(TIPS)}`);
    this.refreshSoundToggle();
    this.refreshAutoAimToggle();
    this.pauseMenu.setVisible(true);
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.pauseMenu.setVisible(false);
    resumeAudio();
    this.scene.resume('Game');
  }

  private onPointerDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    resumeAudio();
    if (this.paused || over.length > 0) return; // paused, or touched a button rather than the floor
    if (!pointer.wasTouch) {
      // Desktop testing: hold the mouse to spray toward the cursor
      this.mouseDown = true;
      return;
    }
    // Left half of the screen moves, right half aims (twin-stick) or sprays (SPRAY-button scheme)
    if (pointer.x < this.scale.width / 2) {
      if (!this.moveStick.active) this.moveStick.start(pointer);
    } else if (this.aimStick) {
      if (!this.aimStick.active) this.aimStick.start(pointer);
    } else if (this.sprayButton && this.sprayTouchId === null && !this.sprayButton.held && pointer.y > this.scale.height * CONTROLS.sprayZoneTop) {
      // Anywhere on the right sprays, not just the button; the SPRAY ring floats to the thumb
      this.sprayTouchId = pointer.id;
      this.sprayButton.setPosition(pointer.x, pointer.y).setScale(0.92);
    }
  }

  private endSprayTouch(): void {
    if (this.sprayTouchId === null) return;
    this.sprayTouchId = null;
    this.sprayButton?.setPosition(this.sprayHome.x, this.sprayHome.y).setScale(1);
  }

  /** The finger spraying right now (on the SPRAY button or anywhere in the spray zone), if any. */
  private sprayPointer(): Phaser.Input.Pointer | undefined {
    const id = this.sprayTouchId ?? this.sprayButton?.holdPointer ?? null;
    if (id === null) return undefined;
    return this.input.manager.pointers.find((p) => p.id === id);
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
    if (pointer.id === this.sprayTouchId) this.endSprayTouch();
    if (pointer.id === this.moveStick.pointerId) this.moveStick.release();
    if (this.aimStick && pointer.id === this.aimStick.pointerId) this.aimStick.release();
  }

  update(): void {
    if (this.paused) {
      this.updateFps();
      return;
    }
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
    // SPRAY-button scheme: drag the spraying thumb to aim by hand; lift it and auto-aim takes over again
    const sprayer = this.sprayPointer();
    if (sprayer && !inputState.aiming) {
      const dx = sprayer.x - sprayer.downX;
      const dy = sprayer.y - sprayer.downY;
      const len = Math.hypot(dx, dy);
      if (len >= CONTROLS.dragAimDistance) {
        inputState.aiming = true;
        inputState.aimX = dx / len;
        inputState.aimY = dy / len;
        inputState.mouseActive = false;
      }
    }
    // Spray: SPRAY button or spray-zone touch, or the aim stick in twin-stick mode, or the mouse on desktop
    inputState.firing = !!sprayer || this.spaceDown || inputState.aiming || (this.mouseDown && inputState.mouseActive);
    this.interactButton.tick(this.time.now);
    this.updateThreatArrows();
    this.updateHints();

    this.updateFps();
  }
}
