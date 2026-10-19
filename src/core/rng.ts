/**
 * Seeded random numbers, so one seed drives a run's rolls (Today's Shift: everyone gets the same day).
 * mulberry32: tiny, fast, and good enough for games.
 *
 * Gameplay rolls go through `runRng`, split into streams so one system's rolls don't shift another's
 * (a frame-rate-dependent roll in germ AI can't change which germs round 6 brings). Physics timing still
 * differs between devices, so runs are alike, not identical. Purely cosmetic randomness (particles,
 * wobble, shake, sound) stays on Math.random.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** 0 (inclusive) to 1 (exclusive). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** min (inclusive) to max (exclusive). */
  float(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** A whole number from min to max, both inclusive. */
  int(min: number, max: number): number {
    return Math.floor(min + (max - min + 1) * this.next());
  }

  /** Same as int, for [min, max] tuples from the balance file. */
  between(range: readonly [number, number]): number {
    return this.int(range[0], range[1]);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }

  /** A shuffled copy. */
  shuffle<T>(list: readonly T[]): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** `n` different items, in a random order. */
  sample<T>(list: readonly T[], n: number): T[] {
    return this.shuffle(list).slice(0, n);
  }
}

/** A 32-bit hash of a string (FNV-1a), for seeds like "2026-10-18". */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A fresh unpredictable seed (normal shifts). */
export const randomSeed = (): number => Math.floor(Math.random() * 4294967296) >>> 0;

/**
 * The current run's random streams. Reseeded at the start of every shift (`seedRun`); each stream is
 * its own generator, derived from the run seed and the stream's name.
 *   wave:     what each round brings, spawn timing
 *   spawn:    where germs come in, elites, Full Moon sizes
 *   loot:     power-up drops, crits, the Supply Requisition, claims, vending offers
 *   patients: who walks in, when, and what they do
 *   ai:       germ wind-ups and cooldowns
 *   world:    Construction's door
 *   secret:   the Miracle Cure's code
 *   vents:    where the germ vents (spawn points) sit each round
 */
const STREAMS = ['wave', 'spawn', 'loot', 'patients', 'ai', 'world', 'secret', 'vents'] as const;
export type RngStream = (typeof STREAMS)[number];

export const runRng = Object.fromEntries(STREAMS.map((s) => [s, new Rng(hashSeed(s))])) as Record<RngStream, Rng>;
let currentSeed = 0;

export function seedRun(seed: number): void {
  currentSeed = seed >>> 0;
  for (const s of STREAMS) runRng[s] = new Rng(hashSeed(`${currentSeed}:${s}`));
}

/** The seed the current run was started with. */
export const runSeed = (): number => currentSeed;
