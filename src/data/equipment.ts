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
  /** What the HUD calls a unit of supply ('%' shows as a charge). */
  unit: string;
  /** What the HUD calls the spare supply (default JUG). */
  spareName?: string;
  /** One line for the Supply Requisition form: what it's for. */
  blurb?: string;
  /** Tools that don't spray droplets: how each use works instead (see systems/Arsenal.ts). */
  attack?: ToolAttack;
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

/** WIPES: a melee sweep. Every `bigEvery`th swipe is a DEEP CLEAN (×`bigMult` damage, `bigReach`). */
export interface SwipeAttack { kind: 'swipe'; reach: number; arcDeg: number; bigEvery: number; bigMult: number; bigReach: number; }
/** GEL LAUNCHER: lobbed to the aimed germ (or `range`); bursts, then leaves gel that slows germs. */
export interface LobAttack { kind: 'lob'; flightMs: number; blastRadius: number; puddleRadius: number; puddleMs: number; puddleSlow: number; }
/** DEFIB PADDLES: zaps the germ in front within `reach`, then jumps `jumps` more times; each jump hits ×`falloff`. */
export interface ChainAttack { kind: 'chain'; reach: number; jumps: number; jumpRange: number; falloff: number; stunMs: number; }
export type ToolAttack = SwipeAttack | LobAttack | ChainAttack;

const WIPES: SwipeAttack = { kind: 'swipe', reach: 100, arcDeg: 150, bigEvery: 3, bigMult: 2.5, bigReach: 135 };
const GEL: LobAttack = { kind: 'lob', flightMs: 420, blastRadius: 95, puddleRadius: 85, puddleMs: 3500, puddleSlow: 0.45 };
const DEFIB: ChainAttack = { kind: 'chain', reach: 170, jumps: 4, jumpRange: 170, falloff: 0.85, stunMs: 350 };

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
    blurb: 'A huge, short cloud. Melts crowds and Colonies.',
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
    blurb: 'A long, hard stream that shoves germs back. Mold hates it.',
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
    blurb: 'A beam through a line of germs. Ignores shells. Charges itself.',
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
    blurb: 'Fizzy foam that slows germs to a crawl.',
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
  // M12 arsenal: tools that don't spray. `attack` hands each use to systems/Arsenal.ts.
  wipes: {
    id: 'wipes',
    name: 'Disinfectant Wipes',
    blurb: 'Melee sweep in front of you. Every third swipe is a DEEP CLEAN. Scrubs biofilm.',
    // Wet time: 4 minutes. You have 4 seconds.
    capacity: 40,
    costPerShot: 1,
    fireIntervalMs: 280,
    dropletsPerShot: 0,
    spreadDeg: 150,
    dropletSpeed: 0,
    range: 100,
    damage: 16,
    effectiveness: { bacteria: 1, virus: 1, spore: 0.6, biofilm: 1.6, fungus: 1.3 },
    knockback: 150,
    refillMs: 1200,
    reserve: 160,
    color: 0xe8fff9,
    unit: 'wipes',
    spareName: 'BOX',
    mistPuffs: 0,
    attack: WIPES,
    tiers: [
      { name: 'Thicker Wipes', blurb: 'A wider, longer sweep', cost: 300, mods: { range: 120, attack: { ...WIPES, reach: 120, bigReach: 160, arcDeg: 200 } } },
      { name: 'Bulk Canister', blurb: 'Every other swipe is a DEEP CLEAN', cost: 700, mods: { capacity: 60, reserve: 240, attack: { ...WIPES, reach: 120, bigReach: 160, arcDeg: 200, bigEvery: 2 } } },
    ],
  },
  gelLauncher: {
    id: 'gelLauncher',
    name: 'Gel Launcher',
    blurb: 'Lobs hand sanitizer over germs. It bursts and leaves sticky gel that slows them.',
    capacity: 10,
    costPerShot: 1,
    fireIntervalMs: 620,
    dropletsPerShot: 0,
    spreadDeg: 0,
    dropletSpeed: 0,
    range: 380,
    damage: 30,
    effectiveness: { bacteria: 1, virus: 1.2, spore: 0.8, biofilm: 1, fungus: 1 },
    knockback: 60,
    refillMs: 1600,
    reserve: 40,
    color: 0x80deea,
    unit: 'gels',
    spareName: 'CASE',
    mistPuffs: 0,
    attack: GEL,
    tiers: [
      { name: 'Extra Hold', blurb: 'Gel lasts longer and sticks harder', cost: 300, mods: { attack: { ...GEL, puddleMs: 5500, puddleSlow: 0.3 } } },
      { name: 'Family Size', blurb: 'Bigger, harder bursts', cost: 700, mods: { damage: 42, attack: { ...GEL, puddleMs: 5500, puddleSlow: 0.3, blastRadius: 125, puddleRadius: 105 } } },
    ],
  },
  defib: {
    id: 'defib',
    name: 'Defib Paddles',
    blurb: '"CLEAR!" A zap that jumps through a clump of germs. Charges itself.',
    capacity: 100,
    costPerShot: 25,
    fireIntervalMs: 650,
    dropletsPerShot: 0,
    spreadDeg: 0,
    dropletSpeed: 0,
    range: 170,
    damage: 26,
    effectiveness: { bacteria: 1, virus: 1, spore: 1, biofilm: 1.2, fungus: 1 },
    knockback: 30,
    refillMs: 0,
    reserve: 0,
    color: 0x7fd3ff,
    unit: '%',
    mistPuffs: 0,
    rechargePerSecond: 30,
    attack: DEFIB,
    tiers: [
      { name: 'Higher Joules', blurb: 'Jumps to 6 germs, hits harder', cost: 300, mods: { damage: 32, attack: { ...DEFIB, jumps: 6 } } },
      { name: 'Crash Cart', blurb: 'Charges twice as fast; zapped germs stay stunned', cost: 700, mods: { rechargePerSecond: 60, attack: { ...DEFIB, jumps: 6, stunMs: 900 } } },
    ],
  },
};

/** What a Supply Requisition can offer (two at a time, never the crate tool you already hold). */
/**
 * THE IONIZER 9000: the Miracle Cure, from the Records Room (never in a crate). "Ionizes 99.9% of everything."
 * A wide, piercing purple charge that works on everything and charges itself.
 */
EQUIPMENT.ionizer9000 = {
  id: 'ionizer9000',
  name: 'Ionizer 9000',
  blurb: 'Ionizes 99.9% of everything. As seen in a 2009 magazine.',
  capacity: 100,
  costPerShot: 2,
  fireIntervalMs: 70,
  dropletsPerShot: 3,
  spreadDeg: 22,
  dropletSpeed: 900,
  range: 300,
  damage: 9,
  effectiveness: { bacteria: 1.3, virus: 1.3, spore: 1.3, biofilm: 1.3, fungus: 1.3 },
  knockback: 14,
  refillMs: 0,
  reserve: 0,
  color: 0xe040fb,
  unit: '%',
  mistPuffs: 3,
  pierce: 2,
  rechargePerSecond: 30,
};

export const CRATE_POOL = ['lysolFogger', 'bleachSoaker', 'uvWand', 'peroxideFoamer', 'wipes', 'gelLauncher', 'defib'];

export const STARTING_EQUIPMENT = 'squirtBottle';
