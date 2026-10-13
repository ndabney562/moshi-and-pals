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
  /** Placeholder art style: round blob with cilia, or spiky virus. */
  shape: 'blob' | 'spiky';
  /** 0 = full knockback from spray, 1 = immovable. */
  knockbackResist: number;
  /** Bosses get a health bar and their own round. */
  boss?: boolean;
  /** Optional headscarf color (Babushka and family). */
  headscarf?: number;
  /** Special behavior controller. Germs without one simply chase Eugene. */
  brain?: 'babushka';
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
   * BOSS #1, designed with Noah: a whiny, guilt-tripping grandmother germ who
   * wants to take Eugene back to Mother Russia. Her moves live in
   * systems/BabushkaBrain.ts, her lines in data/babushka.ts, her numbers in
   * config/balance.ts (BALANCE.babushka).
   */
  babushka: {
    id: 'babushka',
    name: 'Babushka Bacillus',
    tag: 'bacteria',
    hp: 700,
    speed: 62,
    radius: 50,
    color: 0xc98bb9,
    outline: 0x5a2350,
    contactBounce: 140,
    contactDamage: 22,
    points: 300,
    shape: 'blob',
    knockbackResist: 0.85,
    boss: true,
    headscarf: 0xd7263d,
    brain: 'babushka',
  },
  /** Babushka's little cousins: sobbed out when she gets hurt. Tiny, quick, fragile. */
  cousin: {
    id: 'cousin',
    name: 'Little Cousin',
    tag: 'bacteria',
    hp: 10,
    speed: 170,
    radius: 12,
    color: 0xe8a7d4,
    outline: 0x5a2350,
    contactBounce: 320,
    contactDamage: 6,
    points: 5,
    shape: 'blob',
    knockbackResist: 0,
    headscarf: 0xd7263d,
  },
};
