import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { damp } from '../core/math';
import { runRng } from '../core/rng';
import { ELITE_AFFIXES, type EliteAffix } from '../data/powerups';
import type { GermDef } from '../data/germs';

/** Per-round multipliers applied when a germ spawns. */
export interface GermScaling { hpMult: number; speedMult: number; }

/**
 * One germ. Pooled: the game reuses dead germs instead of creating new ones,
 * so call `spawn` to bring one to life and `kill` to return it to the pool.
 */
export class Germ extends Phaser.Physics.Arcade.Sprite {
  def!: GermDef;
  hp = 0;
  maxHp = 0;
  private speed = 0;
  /** While stunned (knocked back), the germ stops steering toward Eugene. */
  private stunnedUntil = 0;
  /** Foam slow: speed multiplier until `slowUntil`. */
  private slowUntil = 0;
  private slowFactor = 1;
  private flashUntil = 0;
  private wobble = Math.random() * 10;
  /** Damage gathered since the last floating number was shown. */
  pendingDamage = 0;
  lastNumberAt = 0;
  /** A STAT! crit landed since the last floating number (shows it in yellow). */
  pendingCrit = false;
  /** 1 right after a hit, easing to 0: the jelly squash. */
  private squash = 0;
  /** Sneezer: when it may sneeze next, and the end of its "AH... AH..." wind-up (0 = not winding up). */
  nextSpitAt = 0;
  windupUntil = 0;
  /** Sneezer: which way it circles Eugene (+1 / -1). */
  strafe = 1;
  /** Spore Pod: on its back (no armor, can't move) until then. */
  flippedUntil = 0;
  /** Last "TINK" when spray bounced off armor (throttles the feedback). */
  lastBlockAt = 0;
  /** RESISTANT elite trait, if this germ is one. */
  elite?: EliteAffix;
  /** Shielded elites: damage the bubble soaks before health. */
  shield = 0;
  /** Prior Authorization: frozen solid until then. */
  frozenUntil = 0;
  /** Bacillus Bulldozer: aiming, charging, or dazed after hitting a wall. */
  chargeState: 'none' | 'windup' | 'charging' | 'dazed' = 'none';
  chargeUntil = 0;
  chargeAngle = 0;
  nextChargeAt = 0;
  /** Mold Spot: when it lets out its next spore. */
  nextSpawnAt = 0;
  /** Elite aura (created the first time this pooled germ becomes an elite). */
  private ring?: Phaser.GameObjects.Image;
  /** Elite trait label (so traits don't rely on color alone). */
  private tag?: Phaser.GameObjects.Text;
  private sizeMul = 1;
  /** Full Moon: looks bigger or smaller than it is (the hitbox stays the same). */
  private moonSize = 1;

  spawn(def: GermDef, x: number, y: number, scaling: GermScaling = { hpMult: 1, speedMult: 1 }): void {
    this.def = def;
    this.maxHp = this.hp = def.hp * scaling.hpMult;
    this.speed = def.speed * scaling.speedMult;
    this.pendingDamage = 0;
    this.pendingCrit = false;
    this.squash = 0;
    const now = this.scene.time.now;
    this.nextSpitAt = now + runRng.ai.int(1200, 2200);
    this.windupUntil = 0;
    this.strafe = runRng.ai.chance(0.5) ? -1 : 1;
    this.flippedUntil = 0;
    this.lastBlockAt = 0;
    this.elite = undefined;
    this.shield = 0;
    this.frozenUntil = 0;
    this.chargeState = 'none';
    this.chargeUntil = 0;
    this.nextChargeAt = now + runRng.ai.int(1500, 2500);
    this.nextSpawnAt = now + (def.spawner?.everyMs ?? 0) / 2;
    this.sizeMul = 1;
    this.moonSize = 1;
    this.ring?.setVisible(false);
    this.tag?.setVisible(false);
    this.slowUntil = 0;
    this.setTexture(`germ-${def.id}`);
    this.enableBody(true, x, y, true, true);
    const r = def.radius;
    this.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.setDepth(def.boss ? 9 : 8).clearTint().setAlpha(1);
    this.setBounce(0.2);
    // Bosses and unshovable germs (Chonk, Mold Spot) can't be pushed around by other germs
    this.setPushable(!def.boss && def.knockbackResist < 1);
    // Squeeze out of the doorway
    this.setScale(0.1);
    this.scene.tweens.add({ targets: this, scale: 1, duration: def.boss ? 900 : 350, ease: 'Back.out' });
    this.stunnedUntil = this.scene.time.now + 350;
  }

  /** FULL MOON: drawn at `k` × its size from now on (looks only). */
  setMoonSize(k: number): void {
    this.moonSize = k;
    // Re-aim the squeeze-out-of-the-doorway tween at the new size
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: k * this.sizeMul, duration: 350, ease: 'Back.out' });
  }

  /** Turns this germ into a RESISTANT elite: much tougher, bigger, with an aura showing its trait. */
  makeElite(affix: EliteAffix, hpMult: number, extra: { shield: number; speed: number }): void {
    this.elite = affix;
    this.maxHp = this.hp = this.hp * hpMult;
    this.sizeMul = 1.25;
    if (affix === 'shielded') this.shield = this.maxHp * extra.shield;
    if (affix === 'hasty') this.speed *= extra.speed;
    if (!this.ring) this.ring = this.scene.add.image(this.x, this.y, 'elite-ring').setDepth(7.5);
    this.ring.setVisible(true).setTint(ELITE_AFFIXES[affix].ring).setScale(((this.def.radius * 1.25 + 18) * 2) / 64);
    if (!this.tag) {
      this.tag = this.scene.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '12px', fontStyle: '900', color: '#ffffff', stroke: '#1b2b30', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(19);
    }
    this.tag.setText(`RESISTANT · ${ELITE_AFFIXES[affix].label}`).setVisible(true);
  }

  /** PRIOR AUTHORIZATION: frozen in place (pending approval) for `ms`. */
  freezeFor(time: number, ms: number): void {
    this.frozenUntil = Math.max(this.frozenUntil, time + ms);
    this.stun(time, ms);
    this.setVelocity(0, 0);
  }

  /** Stops moving (used when the run ends). */
  freeze(): void {
    this.setVelocity(0, 0);
    this.stunnedUntil = Number.MAX_SAFE_INTEGER;
  }

  /** Steers toward `target` at its normal speed, or at `speed` when a boss brain says so. */
  chase(target: { x: number; y: number }, time: number, dtMs: number, speed = this.speed): void {
    if (!this.active) return;
    if (time < this.slowUntil) speed *= this.slowFactor;
    if (time < this.frozenUntil) {
      // Pending approval: not going anywhere
      this.setVelocity(0, 0);
    } else if (time < this.flippedUntil) {
      // On its back: spins helplessly
      this.rotation += dtMs * 0.012;
    } else if (time >= this.stunnedUntil) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      const body = this.body as Phaser.Physics.Arcade.Body;
      // Ease toward full chase speed so knockback recovers smoothly
      const steer = damp(0.1, dtMs);
      body.velocity.x = Phaser.Math.Linear(body.velocity.x, Math.cos(angle) * speed, steer);
      body.velocity.y = Phaser.Math.Linear(body.velocity.y, Math.sin(angle) * speed, steer);
      // RotateTo's step is radians per call: scale it by frame time. Armored germs turn slowly (circle them!)
      const turn = this.def.armor
        ? Phaser.Math.DegToRad(this.def.armor.turnDegPerSec) * (dtMs / 1000)
        : 0.08 * (dtMs / (1000 / 60));
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle, turn);
    }
    // Wind-up telegraph: flashes red before a sneeze; a flipped Spore Pod blushes
    if (this.windupUntil > time) this.setTint(Math.sin(time / 45) > 0 ? 0xff6b6b : 0xffd0d0);
    else if (this.flippedUntil > time) this.setTint(0xffc9a8);
    // Regenerating elites heal over time
    if (this.elite === 'regenerating' && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * BALANCE.elites.regenPerSec * (dtMs / 1000));
    // Jelly wobble, plus a squash right after each hit (no tweens: cheap with many germs)
    this.wobble += dtMs / 140;
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dtMs / BALANCE.feedback.squashMs);
    if (!this.scene.tweens.isTweening(this)) {
      const s = Math.sin(this.wobble) * 0.07;
      const q = this.squash;
      const k = this.sizeMul * this.moonSize;
      this.setScale(k * (1 + s + 0.22 * q), k * (1 - s - 0.18 * q));
    }
    if (this.ring?.visible) {
      this.ring.setPosition(this.x, this.y).setRotation(this.wobble * 0.3).setAlpha(this.shield > 0 ? 1 : 0.8);
      this.tag?.setPosition(this.x, this.y - this.def.radius * 1.25 - 16);
    }
    if (this.frozenUntil > time) this.setTint(0xbfe9ff);
    else if (this.frozenUntil > 0) {
      this.frozenUntil = 0;
      this.clearTint();
    }
    if (this.flashUntil && time >= this.flashUntil) {
      this.flashUntil = 0;
      this.clearTint();
    }
    if (this.flippedUntil > 0 && time >= this.flippedUntil) {
      this.flippedUntil = 0;
      this.clearTint();
    }
  }

  /** Applies damage and a push away from `fromAngle`. Returns true if this killed it. */
  hurt(amount: number, fromAngle: number, knockback: number, time: number): boolean {
    // A shielded elite's bubble soaks damage first
    if (this.shield > 0) {
      const soaked = Math.min(this.shield, amount);
      this.shield -= soaked;
      amount -= soaked;
    }
    this.hp -= amount;
    this.pendingDamage += amount;
    this.squash = 1;
    this.setTintFill(0xffffff);
    this.flashUntil = time + BALANCE.feedback.hitFlashMs;
    const push = knockback * (1 - this.def.knockbackResist);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x += Math.cos(fromAngle) * push;
    body.velocity.y += Math.sin(fromAngle) * push;
    return this.hp <= 0;
  }

  /** Slows the germ (peroxide foam). */
  slow(time: number, factor: number, ms: number): void {
    this.slowFactor = Math.min(time < this.slowUntil ? this.slowFactor : 1, factor);
    this.slowUntil = Math.max(this.slowUntil, time + ms);
  }

  /** Spore Pod knocked onto its back (Sinus Purge): no armor and no moving for `ms`. */
  flip(time: number, ms: number): void {
    this.flippedUntil = Math.max(this.flippedUntil, time + ms);
    this.stun(time, ms);
  }

  isFlipped(time: number): boolean {
    return time < this.flippedUntil;
  }

  /** Stops steering for `ms` (it keeps sliding from whatever hit it). */
  stun(time: number, ms: number): void {
    this.stunnedUntil = Math.max(this.stunnedUntil, time + ms);
  }

  /** Shoves the germ away from a point and stuns it briefly (used when it bumps Eugene). */
  bounceFrom(x: number, y: number, time: number): void {
    const angle = Phaser.Math.Angle.Between(x, y, this.x, this.y);
    this.setVelocity(Math.cos(angle) * this.def.contactBounce, Math.sin(angle) * this.def.contactBounce);
    this.stunnedUntil = time + 450;
  }

  kill(): void {
    this.disableBody(true, true);
    this.ring?.setVisible(false);
    this.tag?.setVisible(false);
  }
}
