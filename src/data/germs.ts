/**
 * Germ definitions. New germ types reuse the Germ entity with different numbers,
 * looks, and (later) behaviors.
 */
export interface GermDef {
  id: string;
  name: string;
  /** Used by equipment effectiveness tables. */
  tag: 'bacteria' | 'virus' | 'spore' | 'biofilm' | 'fungus';
  hp: number;
  speed: number;
  radius: number;
  /** Body and outline colors for the placeholder art. */
  color: number;
  outline: number;
  /** How hard Eugene bounces the germ away when it touches him. */
  contactBounce: number;
  /** Points awarded on kill (used once score arrives in Milestone 3). */
  points: number;
}

export const GERMS: Record<string, GermDef> = {
  basic: {
    id: 'basic',
    name: 'Basic Germ',
    tag: 'bacteria',
    hp: 40,
    speed: 75,
    radius: 22,
    color: 0x8bd346,
    outline: 0x2f5d12,
    contactBounce: 260,
    points: 10,
  },
};
