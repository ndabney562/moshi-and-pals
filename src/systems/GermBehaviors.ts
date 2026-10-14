import Phaser from 'phaser';
import type { Germ } from '../entities/Germ';
import type { Player } from '../entities/Player';
import type { FlowField } from './FlowField';

/** What special germ behaviors need from the game scene. */
export interface BehaviorHost {
  readonly player: Player;
  readonly flow: FlowField;
  /** A Sneezer's "AH... AH..." begins (sound, text). */
  telegraphSneeze(g: Germ): void;
  /** The sneeze: launch a mucus glob from `g` toward `angle`. */
  fireGlob(g: Germ, angle: number): void;
  /** Warning shapes drawn this frame (charge lanes, heal auras). Cleared every frame. */
  readonly telegraphs: Phaser.GameObjects.Graphics;
  /** A charging Bulldozer slammed into a wall. */
  chargeHitWall(g: Germ): void;
  /** Living germs (for healers). */
  germs(): Germ[];
}

const target = new Phaser.Math.Vector2();

/** PRIOR AUTHORIZATION: a frozen germ can't aim, sneeze, charge or heal. Any wind-up is cancelled. */
function pendingApproval(g: Germ, host: BehaviorHost, time: number, dtMs: number): boolean {
  if (time >= g.frozenUntil) return false;
  g.windupUntil = 0;
  if (g.chargeState === 'windup' || g.chargeState === 'charging') g.chargeState = 'none';
  g.chase(host.player, time, dtMs, 0);
  return true;
}

/**
 * SNEEZER: hangs back at `keepAway` px. Outside that band (or without a clear view) it closes in along
 * the flow field; too close, it backs off; in the band it circles Eugene. When it can see him and its
 * cooldown is up it plants its feet, winds up (flashing red), then sneezes a glob where he stands.
 */
export function steerSpitter(g: Germ, host: BehaviorHost, time: number, dtMs: number, step: Phaser.Math.Vector2): void {
  const s = g.def.spit!;
  const p = host.player;
  if (pendingApproval(g, host, time, dtMs)) return;
  if (g.windupUntil > 0) {
    g.chase(p, time, dtMs, 0); // stands still, turning to face Eugene
    if (time >= g.windupUntil) {
      g.windupUntil = 0;
      g.clearTint();
      g.nextSpitAt = time + Phaser.Math.Between(...s.cooldownMs);
      host.fireGlob(g, Phaser.Math.Angle.Between(g.x, g.y, p.x, p.y));
    }
    return;
  }
  const dx = g.x - p.x;
  const dy = g.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const visible = host.flow.lineClear(g.x, g.y, p.x, p.y);
  if (visible && d < s.keepAway + s.band + 80 && time >= g.nextSpitAt && !p.dead) {
    g.windupUntil = time + s.windupMs;
    host.telegraphSneeze(g);
    g.chase(p, time, dtMs, 0);
    return;
  }
  if (!visible || d > s.keepAway + s.band) {
    g.chase(host.flow.nextStep(g.x, g.y, step) ? step : p, time, dtMs);
  } else if (d < s.keepAway - s.band) {
    target.set(g.x + (dx / d) * 120, g.y + (dy / d) * 120);
    g.chase(target, time, dtMs);
  } else {
    // Circle around Eugene; switch direction now and then so it doesn't grind into a wall
    if (Math.random() < dtMs / 3000) g.strafe = -g.strafe;
    target.set(g.x + (-dy / d) * g.strafe * 120, g.y + (dx / d) * g.strafe * 120);
    g.chase(target, time, dtMs, g.def.speed * 0.6);
  }
}

/**
 * BACILLUS BULLDOZER: closes in like any germ; with Eugene in sight and in range it plants itself and
 * aims (a red lane shows its path), then charges dead straight. A wall stops it cold and dazes it.
 */
export function steerCharger(g: Germ, host: BehaviorHost, time: number, dtMs: number, step: Phaser.Math.Vector2): void {
  const c = g.def.charge!;
  const p = host.player;
  const body = g.body as Phaser.Physics.Arcade.Body;
  if (pendingApproval(g, host, time, dtMs)) return;
  switch (g.chargeState) {
    case 'windup': {
      g.setVelocity(0, 0);
      g.rotation = g.chargeAngle;
      const t = 1 - (g.chargeUntil - time) / c.windupMs;
      const len = c.speed * (c.ms / 1000);
      host.telegraphs.lineStyle(g.def.radius * 1.6, 0xd7263d, 0.12 + 0.25 * t)
        .lineBetween(g.x, g.y, g.x + Math.cos(g.chargeAngle) * len, g.y + Math.sin(g.chargeAngle) * len);
      if (time >= g.chargeUntil) {
        g.chargeState = 'charging';
        g.chargeUntil = time + c.ms;
      }
      return;
    }
    case 'charging': {
      // A wall (or the clinic's edge) stops it: dazed, and it takes extra damage
      if (time > g.chargeUntil - c.ms + 80 && !body.blocked.none) {
        g.chargeState = 'dazed';
        g.chargeUntil = time + c.stunMs;
        g.stun(time, c.stunMs);
        g.setVelocity(0, 0);
        host.chargeHitWall(g);
        return;
      }
      if (time >= g.chargeUntil) {
        g.chargeState = 'none';
        g.nextChargeAt = time + Phaser.Math.Between(...c.cooldownMs);
        return;
      }
      g.setVelocity(Math.cos(g.chargeAngle) * c.speed, Math.sin(g.chargeAngle) * c.speed);
      g.rotation = g.chargeAngle;
      return;
    }
    case 'dazed':
      g.rotation += dtMs * 0.01;
      if (time >= g.chargeUntil) {
        g.chargeState = 'none';
        g.nextChargeAt = time + Phaser.Math.Between(...c.cooldownMs);
      }
      return;
    default: {
      const d = Phaser.Math.Distance.Between(g.x, g.y, p.x, p.y);
      if (!p.dead && time >= g.nextChargeAt && d < c.range && d > 90 && host.flow.lineClear(g.x, g.y, p.x, p.y)) {
        g.chargeState = 'windup';
        g.chargeAngle = Phaser.Math.Angle.Between(g.x, g.y, p.x, p.y);
        g.chargeUntil = time + c.windupMs;
        return;
      }
      g.chase(host.flow.nextStep(g.x, g.y, step) && d > 90 ? step : p, time, dtMs);
    }
  }
}

/**
 * MOTHER CULTURE: hangs back at `keepAway` like a Sneezer and heals every germ in its aura.
 * The aura pulses green so you can see who it's keeping alive.
 */
export function steerHealer(g: Germ, host: BehaviorHost, time: number, dtMs: number, step: Phaser.Math.Vector2): void {
  const h = g.def.heal!;
  const p = host.player;
  if (pendingApproval(g, host, time, dtMs)) return;
  const dx = g.x - p.x;
  const dy = g.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  if (d > h.keepAway + 80 || !host.flow.lineClear(g.x, g.y, p.x, p.y)) {
    g.chase(host.flow.nextStep(g.x, g.y, step) ? step : p, time, dtMs);
  } else if (d < h.keepAway - 60) {
    target.set(g.x + (dx / d) * 120, g.y + (dy / d) * 120);
    g.chase(target, time, dtMs);
  } else {
    if (Math.random() < dtMs / 3000) g.strafe = -g.strafe;
    target.set(g.x + (-dy / d) * g.strafe * 120, g.y + (dx / d) * g.strafe * 120);
    g.chase(target, time, dtMs, g.def.speed * 0.5);
  }
  const pulse = 0.5 + 0.5 * Math.sin(time / 180);
  host.telegraphs.lineStyle(4, 0x66bb6a, 0.25 + 0.35 * pulse).strokeCircle(g.x, g.y, h.radius * (0.9 + 0.1 * pulse));
  const amount = h.perSec * (dtMs / 1000);
  for (const other of host.germs()) {
    if (other === g || other.def.boss || other.hp >= other.maxHp) continue;
    if ((other.x - g.x) ** 2 + (other.y - g.y) ** 2 > h.radius * h.radius) continue;
    other.hp = Math.min(other.maxHp, other.hp + amount);
  }
}
