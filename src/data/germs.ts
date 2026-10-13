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
  /** Damage dealt to Eugene on contact. */
  contactDamage: number;
  /** Score awarded on kill. */
  points: number;
  /** Placeholder art style: round blob with cilia, spiky virus, or a sheet of paper. */
  shape: 'blob' | 'spiky' | 'paper';
  /** 0 = full knockback from spray, 1 = immovable. */
  knockbackResist: number;
  /** Bosses get a health bar and their own round. */
  boss?: boolean;
  /** Extra costume drawn on top of the body. */
  look?: 'manager';
  /** Special behavior controller. Germs without one simply chase Eugene. */
  brain?: 'diamond';
}

export const GERMS: Record<string, GermDef> = {
  basic: {
    id: 'basic',
    name: 'Basic Germ',
    tag: 'bacteria',
    hp: 40,
    speed: 95,
    radius: 22,
    color: 0x8bd346,
    outline: 0x2f5d12,
    contactBounce: 260,
    contactDamage: 15,
    points: 10,
    shape: 'blob',
    knockbackResist: 0,
  },
  sprinter: {
    id: 'sprinter',
    name: 'Viral Sprinter',
    tag: 'virus',
    hp: 16,
    speed: 165,
    radius: 15,
    color: 0xb36bff,
    outline: 0x4a1f7a,
    contactBounce: 320,
    contactDamage: 8,
    points: 15,
    shape: 'spiky',
    knockbackResist: 0,
  },
  /**
   * BOSS #1, designed with Noah: Diamond, the clinic's grouchy practice
   * manager from Trinidad, who has it out for Moshi. A big, heavy, slimy
   * germ monster (fictional; not based on a real person). Her moves live in
   * systems/DiamondBrain.ts, her lines in data/diamond.ts, her numbers in
   * config/balance.ts (BALANCE.diamond).
   */
  diamond: {
    id: 'diamond',
    name: 'Diamond the Practice Manager',
    tag: 'bacteria',
    hp: 850,
    speed: 55,
    radius: 62,
    color: 0x9bc53d,
    outline: 0x2f4a12,
    contactBounce: 110,
    contactDamage: 30,
    points: 300,
    shape: 'blob',
    knockbackResist: 0.92,
    boss: true,
    look: 'manager',
    brain: 'diamond',
  },
  /** Diamond's write-ups: angry pink slips she flings when she gets hurt. Tiny, quick, fragile. */
  writeUp: {
    id: 'writeUp',
    name: 'Write-Up',
    tag: 'bacteria',
    hp: 10,
    speed: 170,
    radius: 12,
    color: 0xff9ec7,
    outline: 0x7a1f4a,
    contactBounce: 320,
    contactDamage: 6,
    points: 5,
    shape: 'paper',
    knockbackResist: 0,
  },
};
