/**
 * Teach-as-you-play hints. Each one appears once, at the moment it matters, next to the control it's
 * about, and is never shown again once the player has done the thing (saved in settings.learned).
 * Order = priority: only one hint shows at a time.
 */
export interface HintDef {
  id: 'move' | 'spray' | 'pour' | 'purge' | 'buy';
  text: string;
  /** Which control the hint points at. */
  near: 'moveStick' | 'spray' | 'refill' | 'purge' | 'interact';
}

export const HINTS: HintDef[] = [
  { id: 'move', text: 'DRAG ON THE LEFT TO MOVE', near: 'moveStick' },
  { id: 'spray', text: 'HOLD ANYWHERE ON THE RIGHT TO SPRAY', near: 'spray' },
  { id: 'purge', text: 'SURROUNDED? SINUS PURGE!', near: 'purge' },
  { id: 'pour', text: 'TAP REFILL AGAIN WHEN THE RING HITS GOLD', near: 'refill' },
  { id: 'buy', text: 'HOLD USE TO BUY', near: 'interact' },
];
