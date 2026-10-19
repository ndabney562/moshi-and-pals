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
  shape: 'blob' | 'spiky' | 'paper' | 'shell' | 'sneezer' | 'duo' | 'rod' | 'dish' | 'mold' | 'fax';
  /** 0 = full knockback from spray, 1 = immovable. */
  knockbackResist: number;
  /** "Cause of death" on the Discharge Summary when this germ lands the final hit. */
  deathNote?: string;
  /** Bosses get a health bar and their own round. */
  boss?: boolean;
  /** Extra costume drawn on top of the body. */
  look?: 'manager' | 'patient';
  /** Special behavior controller. Germs without one simply chase Eugene. */
  brain?: 'diamond' | 'patientZero' | 'faxMachine';
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
  /** Bursts into `count` germs of type `id` when disinfected (Diplococcus Duo, Chonk Coccus). */
  splitInto?: { id: string; count: number };
  /** Arrives as a group of `count` germs of type `id` instead of itself (Colony). */
  spawnAs?: { id: string; count: number };
  /**
   * Charger (Bacillus Bulldozer): within `range` and in sight, it stops and aims (a red line shows the
   * path) for `windupMs`, then charges straight at `speed` for up to `ms`. Hitting Eugene hurts for
   * `damage`; hitting a wall stuns it for `stunMs`, and it takes `stunnedDamageTaken` × damage meanwhile.
   */
  charge?: { range: number; windupMs: number; speed: number; ms: number; cooldownMs: [number, number]; damage: number; stunMs: number; stunnedDamageTaken: number };
  /** Healer (Mother Culture): keeps `keepAway` from Eugene and heals germs within `radius` by `perSec` HP/s. */
  heal?: { radius: number; perSec: number; keepAway: number };
  /** Stationary spawner (Mold Spot): never moves; lets out a `id` germ every `everyMs` (at most `max` alive). */
  spawner?: { id: string; everyMs: number; max: number };
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
  /** DIPLOCOCCUS DUO: two cocci stuck together. Disinfect it and it splits into two quicker halves. From round 7. */
  duo: {
    id: 'duo', name: 'Diplococcus Duo', tag: 'bacteria', deathNote: 'Outnumbered by a germ that came in pairs.',
    hp: 46, speed: 90, radius: 24, color: 0x4fc3a1, outline: 0x1f5a49, contactBounce: 260, contactDamage: 14,
    points: 25, copays: 10, shape: 'duo', knockbackResist: 0.1, splitInto: { id: 'monococcus', count: 2 },
  },
  monococcus: {
    id: 'monococcus', name: 'Monococcus', tag: 'bacteria', deathNote: 'Half a germ. Still enough.',
    hp: 16, speed: 135, radius: 14, color: 0x4fc3a1, outline: 0x1f5a49, contactBounce: 300, contactDamage: 8,
    points: 8, copays: 3, shape: 'blob', knockbackResist: 0,
  },
  /**
   * BACILLUS BULLDOZER: a long rod that lines up, shows its path with a red line, then charges.
   * Sidestep it; if it slams into a wall it's dazed and takes double damage. From round 8.
   */
  charger: {
    id: 'charger', name: 'Bacillus Bulldozer', tag: 'bacteria', deathNote: 'Run over by a Bacillus Bulldozer.',
    hp: 60, speed: 80, radius: 22, color: 0xff8a50, outline: 0x7a2e0e, contactBounce: 200, contactDamage: 12,
    points: 30, copays: 14, shape: 'rod', knockbackResist: 0.5,
    charge: { range: 420, windupMs: 800, speed: 560, ms: 900, cooldownMs: [2800, 4200], damage: 24, stunMs: 1500, stunnedDamageTaken: 2 },
  },
  /** MOTHER CULTURE: a walking petri dish that hangs back and heals germs around it (green pulse). Kill it first. From round 9. */
  healer: {
    id: 'healer', name: 'Mother Culture', tag: 'biofilm', deathNote: 'You let the Mother Culture keep everyone healthy.',
    hp: 40, speed: 95, radius: 22, color: 0xf8bbd0, outline: 0x7a2e4a, contactBounce: 260, contactDamage: 6,
    points: 35, copays: 16, shape: 'dish', knockbackResist: 0, heal: { radius: 200, perSec: 10, keepAway: 330 },
  },
  /** COLONY: arrives as a flock of eight tiny specks. One spray hit each; the Fogger eats them alive. From round 10. */
  colony: {
    id: 'colony', name: 'Colony', tag: 'virus', hp: 1, speed: 0, radius: 8, color: 0xce93d8, outline: 0x4a148c,
    contactBounce: 0, contactDamage: 0, points: 0, copays: 0, shape: 'spiky', knockbackResist: 0, spawnAs: { id: 'speck', count: 8 },
  },
  speck: {
    id: 'speck', name: 'Colony Speck', tag: 'virus', deathNote: 'Nibbled to death by a Colony.',
    hp: 6, speed: 150, radius: 9, color: 0xce93d8, outline: 0x4a148c, contactBounce: 300, contactDamage: 4,
    points: 3, copays: 1, shape: 'spiky', knockbackResist: 0,
  },
  /**
   * MOLD SPOT: a fuzzy stain that grows somewhere far from Eugene and never moves, letting out a spore
   * every few seconds until it's cleaned. The round can't end while it's there. Bleach melts it. From round 11.
   */
  moldSpot: {
    id: 'moldSpot', name: 'Mold Spot', tag: 'fungus', deathNote: 'Spores. So many spores.',
    hp: 120, speed: 0, radius: 30, color: 0x558b2f, outline: 0x1b3a0b, contactBounce: 200, contactDamage: 10,
    points: 40, copays: 20, shape: 'mold', knockbackResist: 1, spawner: { id: 'spore', everyMs: 6000, max: 5 },
  },
  spore: {
    id: 'spore', name: 'Mold Spore', tag: 'fungus', deathNote: 'Breathed in a Mold Spore.',
    hp: 12, speed: 120, radius: 11, color: 0x9ccc65, outline: 0x33691e, contactBounce: 280, contactDamage: 6,
    points: 4, copays: 2, shape: 'blob', knockbackResist: 0,
  },
  /** CHONK COCCUS: a huge, slow, unshovable blob (mini-boss). It bursts into six Basic Germs. From round 8. */
  chonk: {
    id: 'chonk', name: 'Chonk Coccus', tag: 'bacteria', deathNote: 'Sat on by a Chonk Coccus.',
    hp: 380, speed: 55, radius: 44, color: 0x7cb342, outline: 0x2f4f12, contactBounce: 160, contactDamage: 22,
    points: 80, copays: 35, shape: 'blob', knockbackResist: 1, splitInto: { id: 'basic', count: 6 },
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
  /**
   * THE LAST FAX MACHINE: the Miracle Cure's secret boss, alone in the Records Room since 1997.
   * Moves in systems/FaxMachineBrain.ts, lines in data/miracleCure.ts, numbers in BALANCE.faxMachine.
   */
  faxMachine: {
    id: 'faxMachine',
    deathNote: 'Faxed to death. Confirmation page to follow.',
    name: 'The Last Fax Machine',
    tag: 'biofilm',
    hp: 1400,
    speed: 70,
    radius: 58,
    color: 0xd9d2bf,
    outline: 0x3e3a30,
    contactBounce: 160,
    contactDamage: 18,
    points: 600,
    copays: 200,
    shape: 'fax',
    knockbackResist: 1,
    boss: true,
    brain: 'faxMachine',
  },
  /** Fax pages: what the Last Fax Machine prints at you. Quick, flimsy, sharp edges. */
  faxPage: {
    id: 'faxPage',
    deathNote: 'Paper cut. A big one.',
    name: 'Fax Page',
    tag: 'bacteria',
    hp: 9,
    speed: 190,
    radius: 12,
    color: 0xf7f4ea,
    outline: 0x3e3a30,
    contactBounce: 320,
    contactDamage: 5,
    points: 5,
    copays: 1,
    shape: 'paper',
    knockbackResist: 0,
  },
};
