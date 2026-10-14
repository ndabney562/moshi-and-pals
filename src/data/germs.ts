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
  /** Copays (currency) earned on kill. */
  copays: number;
  /** Placeholder art style: round blob with cilia, spiky virus, sheet of paper, armored hex shell, or droopy sneezer. */
  shape: 'blob' | 'spiky' | 'paper' | 'shell' | 'sneezer';
  /** 0 = full knockback from spray, 1 = immovable. */
  knockbackResist: number;
  /** "Cause of death" on the Discharge Summary when this germ lands the final hit. */
  deathNote?: string;
  /** Bosses get a health bar and their own round. */
  boss?: boolean;
  /** Extra costume drawn on top of the body. */
  look?: 'manager' | 'patient';
  /** Special behavior controller. Germs without one simply chase Eugene. */
  brain?: 'diamond' | 'patientZero';
  /**
   * Armored shell (Spore Pod): hits on the front arc are mostly blocked, hits from behind hurt extra.
   * It turns slowly (`turnDegPerSec`), so circling it works. Piercing tools (UV) ignore the shell;
   * Sinus Purge flips it onto its back for `flipMs` (no armor, can't move).
   */
  armor?: { frontArcDeg: number; front: number; back: number; turnDegPerSec: number; flipMs: number };
  /**
   * Ranged spitter (Sneezer): keeps about `keepAway` px from Eugene, winds up for `windupMs`,
   * then fires a mucus glob that hurts on hit and leaves a slowing puddle.
   */
  spit?: {
    keepAway: number; band: number; windupMs: number; cooldownMs: [number, number];
    globSpeed: number; globRange: number; damage: number;
    puddleMs: number; puddleRadius: number; puddleSlow: number;
  };
}

export const GERMS: Record<string, GermDef> = {
  basic: {
    id: 'basic',
    deathNote: "Overwhelmed by the common germ. The most common cause.",
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
    copays: 5,
    shape: 'blob',
    knockbackResist: 0,
  },
  sprinter: {
    id: 'sprinter',
    deathNote: "A Viral Sprinter got there first.",
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
    copays: 8,
    shape: 'spiky',
    knockbackResist: 0,
  },
  /**
   * SPORE POD: a slow, armored hexagonal shell. Spraying its face is nearly useless; get behind it,
   * use the UV Wand (pierces the shell, ×1.5 vs spores), or Sinus Purge to flip it over. From round 6.
   */
  sporePod: {
    id: 'sporePod',
    deathNote: "Blunt shell trauma. You sprayed its face.",
    name: 'Spore Pod',
    tag: 'spore',
    hp: 50,
    speed: 70,
    radius: 26,
    color: 0xc98b3a,
    outline: 0x4a2e0e,
    contactBounce: 220,
    contactDamage: 18,
    points: 30,
    copays: 15,
    shape: 'shell',
    knockbackResist: 0.6,
    armor: { frontArcDeg: 120, front: 0.25, back: 1.5, turnDegPerSec: 70, flipMs: 2000 },
  },
  /**
   * SNEEZER: a droopy rhinovirus with a huge red nose. Hangs back, goes "AH... AH..." and sneezes a
   * mucus glob that leaves a slippery puddle (slows Eugene). Fragile; long-range tools out-range it. From round 4.
   */
  sneezer: {
    id: 'sneezer',
    deathNote: "Slipped in someone else's sneeze.",
    name: 'Sneezer',
    tag: 'virus',
    hp: 24,
    speed: 110,
    radius: 18,
    color: 0xd7e88a,
    outline: 0x4f5e14,
    contactBounce: 300,
    contactDamage: 8,
    points: 20,
    copays: 10,
    shape: 'sneezer',
    knockbackResist: 0,
    spit: {
      keepAway: 260, band: 60, windupMs: 700, cooldownMs: [2400, 3400],
      globSpeed: 300, globRange: 420, damage: 10,
      puddleMs: 2500, puddleRadius: 52, puddleSlow: 0.55,
    },
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
    deathNote: "A fatal performance review.",
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
    copays: 100,
    shape: 'blob',
    knockbackResist: 0.92,
    boss: true,
    look: 'manager',
    brain: 'diamond',
  },
  /**
   * BOSS #2: PATIENT ZERO. The most contagious patient in the waiting room, nine hours into his wait.
   * Huge, in a hospital gown, tissues stuck all over, a red nose and a ticket that says 9 HRS.
   * Moves in systems/PatientZeroBrain.ts, lines in data/patientZero.ts, numbers in BALANCE.patientZero.
   */
  patientZero: {
    id: 'patientZero',
    deathNote: 'Patient Zero coughed directly into your face.',
    name: 'Patient Zero',
    tag: 'virus',
    hp: 1100,
    speed: 52,
    radius: 60,
    color: 0xb3d9f2,
    outline: 0x2c4a5e,
    contactBounce: 120,
    contactDamage: 20,
    points: 400,
    copays: 150,
    shape: 'blob',
    knockbackResist: 0.9,
    boss: true,
    look: 'patient',
    brain: 'patientZero',
  },
  /** Diamond's write-ups: angry pink slips she flings when she gets hurt. Tiny, quick, fragile. */
  writeUp: {
    id: 'writeUp',
    deathNote: "Death by paperwork.",
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
    copays: 2,
    shape: 'paper',
    knockbackResist: 0,
  },
};
