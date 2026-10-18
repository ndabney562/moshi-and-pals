import type { Germ } from '../entities/Germ';

/** What every boss behavior (DiamondBrain, PatientZeroBrain) offers the game scene. */
export interface BossBrain {
  readonly germ: Germ;
  update(time: number): void;
  /** How the boss wants to move this frame, or undefined to chase Eugene like any germ. */
  movement(): { target: { x: number; y: number }; speed: number } | undefined;
  onHurt(amount: number, time: number): void;
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
}
