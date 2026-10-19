import type { Germ } from '../entities/Germ';

/**
 * What every boss behavior (DiamondBrain, PatientZeroBrain, MethicillinBrain, InfluenzaBrain) offers the
 * game scene. Most bosses are one germ (`germ`); the Influenza Twins are two, so the per-germ calls take
 * the germ they're about, and `owns` says which germs belong to the boss.
 */
export interface BossBrain {
  /** The boss germ (for a pair, the first one). */
  readonly germ: Germ;
  /** Whether `g` is part of this boss. Defaults to `g === germ`. */
  owns?(g: Germ): boolean;
  update(time: number): void;
  /** How the boss (or this part of it) wants to move this frame, or undefined to chase Eugene like any germ. */
  movement(g: Germ): { target: { x: number; y: number }; speed: number } | undefined;
  /** `source` names what hurt it: a tool id, 'signature', 'autoclave', 'dryer', 'xray', 'scribe', 'powerup'. */
  onHurt(amount: number, time: number, g: Germ, source?: string): void;
  onDefeated(): void;
  onPlayerDown(): void;
  destroy(): void;
  /** Auto-aim should pick this germ right now (e.g. during a move you must break). */
  readonly priorityTarget: Germ | undefined;
  /** Touching Eugene doesn't hurt right now. */
  readonly ignoresContact: boolean;
  /** Ken's FILE A GRIEVANCE: called away to HR for `ms` (bosses without an HR department ignore it). */
  summonToHr?(time: number, ms: number): void;
  /** Extra damage multiplier the boss takes right now (e.g. a masked Patient Zero). */
  readonly damageTaken?: number;
  /** Damage multiplier for one hit on `g` from `source` (Methicillin's resistance, a shielded twin). */
  damageFactor?(g: Germ, source: string | undefined, time: number): number;
  /** Contact damage `g` deals right now instead of its usual (Methicillin's Roll). */
  contactDamage?(g: Germ): number | undefined;
  /** `g` just took a fatal hit. Return true if the boss handles it (a twin goes down instead of dying). */
  interceptKill?(g: Germ, time: number): boolean;
  /** One health bar for the whole boss (the twins share one), instead of `g`'s own. */
  bar?(): { name: string; hp: number; maxHp: number };
}

/** Whether `g` belongs to `boss`. */
export const bossOwns = (boss: BossBrain | undefined, g: Germ): boss is BossBrain =>
  !!boss && (boss.owns ? boss.owns(g) : boss.germ === g);
