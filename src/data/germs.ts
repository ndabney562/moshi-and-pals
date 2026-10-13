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
    contactDamage: 12,
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
   * PLACEHOLDER BOSS. Noah is designing the real first boss (name, look,
   * personality, signature moves). Until then this is just a big, slow,
   * tough germ so boss rounds can be built and tuned.
   */
  bossPlaceholder: {
    id: 'bossPlaceholder',
    name: 'Mystery Superbug',
    tag: 'bacteria',
    hp: 700,
    speed: 60,
    radius: 50,
    color: 0xd64545,
    outline: 0x5c1212,
    contactBounce: 140,
    contactDamage: 25,
    points: 250,
    shape: 'blob',
    knockbackResist: 0.85,
    boss: true,
  },
};
