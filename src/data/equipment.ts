/**
 * Disinfection equipment definitions. Adding a new weapon = adding an entry here.
 * Distances are logical pixels, times are milliseconds.
 */
export interface EquipmentDef {
  id: string;
  name: string;
  /** Supply the bottle/tank holds (shown as mL for the squirt bottle). */
  capacity: number;
  /** Supply used per shot. */
  costPerShot: number;
  /** Time between shots while spraying. */
  fireIntervalMs: number;
  /** Droplets launched per shot, fanned across `spreadDeg`. */
  dropletsPerShot: number;
  spreadDeg: number;
  dropletSpeed: number;
  /** How far a droplet travels before it evaporates. */
  range: number;
  /** Damage dealt by each droplet that hits. */
  damage: number;
  /** Damage multiplier by germ tag. Missing tags use 1. */
  effectiveness: Record<string, number>;
  /** Push applied to a germ per droplet hit. */
  knockback: number;
  refillMs: number;
  /** Spare supply carried in the jug. REFILL pours from it; the supply cart restocks it for Copays. */
  reserve: number;
  /** Droplet and mist tint. */
  color: number;
  /** What the HUD calls a unit of supply. */
  unit: 'mL' | '%';
  /** Mist puffs drawn per shot (bigger = cloudier). */
  mistPuffs: number;
  /** Germs a droplet passes through before it's used up (0 = stops at the first). */
  pierce?: number;
  /** Germs hit are slowed to `factor` of their speed for `ms`. */
  slow?: { factor: number; ms: number };
  /** Recharges on its own (supply per second, after a short pause in firing). No jug, no REFILL. */
  rechargePerSecond?: number;
  /**
   * COMPOUNDING STATION upgrades (Generic → Brand Name → Prescription Strength). Each one changes how
   * the tool plays, not just its damage. `mods` override this definition's numbers.
   */
  tiers?: ToolTier[];
}

export interface ToolTier {
  name: string;
  /** Short line shown above USE. */
  blurb: string;
  cost: number;
  mods: Partial<Omit<EquipmentDef, 'id' | 'tiers'>>;
}

/** What each tier is called after the tool's name. */
export const TIER_NAMES = ['GENERIC', 'BRAND NAME', 'PRESCRIPTION STRENGTH'];

export const EQUIPMENT: Record<string, EquipmentDef> = {
  squirtBottle: {
    id: 'squirtBottle',
    name: 'Isopropyl Alcohol Squirt Bottle',
    capacity: 120,
    costPerShot: 1,
    fireIntervalMs: 90,
    dropletsPerShot: 2,
    spreadDeg: 14,
    dropletSpeed: 620,
    range: 200,
    damage: 4,
    effectiveness: { bacteria: 1, virus: 1.2, spore: 0.25, biofilm: 0.5, fungus: 0.6 },
    knockback: 18,
    refillMs: 1100,
    reserve: 480,
    color: 0x9fe7ff,
    unit: 'mL',
    mistPuffs: 5,
    tiers: [
      { name: 'Pressure Nozzle', blurb: 'Reaches 40% farther', cost: 300, mods: { range: 280, dropletSpeed: 760 } },
      { name: 'Industrial Trigger', blurb: 'Sprays faster and pierces a germ', cost: 700, mods: { fireIntervalMs: 60, pierce: 1, capacity: 160 } },
    ],
  },

  // Crate tools (M6). Noah approved the first three; the foamer is Claude's addition.
  lysolFogger: {
    id: 'lysolFogger',
    name: 'Lysol Fogger',
    // A huge, short, slow cloud: great for crowds, bad at range
    capacity: 200,
    costPerShot: 2,
    fireIntervalMs: 120,
    dropletsPerShot: 6,
    spreadDeg: 75,
    dropletSpeed: 300,
    range: 160,
    damage: 3,
    effectiveness: { bacteria: 1, virus: 1.4, spore: 0.4, biofilm: 0.6, fungus: 0.8 },
    knockback: 6,
    refillMs: 1800,
    reserve: 600,
    color: 0xd9f7c4,
    unit: 'mL',
    mistPuffs: 12,
    tiers: [
      { name: 'Atomizer', blurb: 'A much wider cloud', cost: 300, mods: { spreadDeg: 105, dropletsPerShot: 8, mistPuffs: 16 } },
      { name: 'Double Tank', blurb: 'Twice the tank, harder hits', cost: 700, mods: { capacity: 400, reserve: 1000, damage: 4 } },
    ],
  },
  bleachSoaker: {
    id: 'bleachSoaker',
    name: 'Bleach Super Soaker',
    // A long, hard-hitting stream that shoves germs back
    capacity: 300,
    costPerShot: 3,
    fireIntervalMs: 70,
    dropletsPerShot: 1,
    spreadDeg: 4,
    dropletSpeed: 950,
    range: 400,
    damage: 10,
    effectiveness: { bacteria: 1.2, virus: 1.2, spore: 0.8, biofilm: 1, fungus: 2 },
    knockback: 45,
    refillMs: 2000,
    reserve: 900,
    color: 0xfff6c2,
    unit: 'mL',
    mistPuffs: 2,
    tiers: [
      { name: 'High-Pressure Hose', blurb: 'Hits harder, shoves farther', cost: 300, mods: { damage: 13, knockback: 70 } },
      { name: 'Splash Zone', blurb: 'Twin streams', cost: 700, mods: { dropletsPerShot: 2, spreadDeg: 10 } },
    ],
  },
  uvWand: {
    id: 'uvWand',
    name: 'UV Wand',
    // A purple beam that pierces a line of germs and recharges itself
    capacity: 100,
    costPerShot: 2,
    fireIntervalMs: 60,
    dropletsPerShot: 1,
    spreadDeg: 0,
    dropletSpeed: 1200,
    range: 280,
    damage: 6,
    effectiveness: { bacteria: 1, virus: 1, spore: 1.5, biofilm: 1, fungus: 1 },
    knockback: 4,
    refillMs: 0,
    reserve: 0,
    color: 0xb388ff,
    unit: '%',
    mistPuffs: 1,
    pierce: 3,
    rechargePerSecond: 22,
    tiers: [
      { name: 'Wide Lens', blurb: 'Beam passes through 6 germs', cost: 300, mods: { pierce: 6 } },
      { name: 'Overclocked', blurb: 'Charges twice as fast, burns hotter', cost: 700, mods: { rechargePerSecond: 44, damage: 8 } },
    ],
  },
  peroxideFoamer: {
    id: 'peroxideFoamer',
    name: 'Peroxide Foamer',
    // Fizzy foam that slows germs down
    capacity: 150,
    costPerShot: 2,
    fireIntervalMs: 110,
    dropletsPerShot: 3,
    spreadDeg: 24,
    dropletSpeed: 460,
    range: 220,
    damage: 4,
    effectiveness: { bacteria: 1.2, virus: 1, spore: 0.5, biofilm: 1.5, fungus: 0.8 },
    knockback: 8,
    refillMs: 1500,
    reserve: 450,
    color: 0xffffff,
    unit: 'mL',
    mistPuffs: 6,
    slow: { factor: 0.45, ms: 1600 },
    tiers: [
      { name: 'Extra Fizz', blurb: 'Germs slow to a crawl', cost: 300, mods: { slow: { factor: 0.3, ms: 2000 } } },
      { name: 'Foam Party', blurb: 'A wide wall of foam', cost: 700, mods: { dropletsPerShot: 5, spreadDeg: 34, mistPuffs: 9 } },
    ],
  },
};

/** What a supply crate can give. One is picked at random (never the tool you already hold). */
export const CRATE_POOL = ['lysolFogger', 'bleachSoaker', 'uvWand', 'peroxideFoamer'];

export const STARTING_EQUIPMENT = 'squirtBottle';
