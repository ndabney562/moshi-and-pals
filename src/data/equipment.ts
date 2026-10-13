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
  /** Currency cost to refill (economy arrives in Milestone 4). */
  refillCost: number;
  /** Droplet tint. */
  color: number;
}

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
    effectiveness: { bacteria: 1, virus: 1.2, spore: 0.25, biofilm: 0.5 },
    knockback: 18,
    refillMs: 1100,
    refillCost: 0,
    color: 0x9fe7ff,
  },
};

export const STARTING_EQUIPMENT = 'squirtBottle';
