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
}

const target = new Phaser.Math.Vector2();

/**
 * SNEEZER: hangs back at `keepAway` px. Outside that band (or without a clear view) it closes in along
 * the flow field; too close, it backs off; in the band it circles Eugene. When it can see him and its
 * cooldown is up it plants its feet, winds up (flashing red), then sneezes a glob where he stands.
 */
export function steerSpitter(g: Germ, host: BehaviorHost, time: number, dtMs: number, step: Phaser.Math.Vector2): void {
  const s = g.def.spit!;
  const p = host.player;
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
