import { expect, it } from 'vitest';
import { Rng, hashSeed, runRng, runSeed, seedRun } from '../../src/core/rng';
import { damp } from '../../src/core/math';

it('retains the known seed hash and random sequence', () => {
  expect(hashSeed('hello')).toBe(1335831723);
  const rng = new Rng(1);
  expect([rng.next(), rng.next(), rng.next()]).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
});
it('keeps inclusive integer bounds and probability extremes', () => {
  const rng = new Rng(42);
  const values = Array.from({ length: 1000 }, () => rng.int(2, 4));
  expect(new Set(values)).toEqual(new Set([2, 3, 4]));
  expect(rng.chance(0)).toBe(false);
  expect(rng.chance(1)).toBe(true);
  expect(rng.between([7, 7])).toBe(7);
});
it('samples without duplicates or modifying its input', () => {
  const input = [1, 2, 3, 4, 5];
  const output = new Rng(1).sample(input, 3);
  expect(output).toHaveLength(3);
  expect(new Set(output).size).toBe(3);
  expect(input).toEqual([1, 2, 3, 4, 5]);
});
it('isolates loot and wave rolls from frame-dependent AI', () => {
  seedRun(123);
  const expected = [runRng.wave.next(), runRng.loot.next()];
  seedRun(123);
  for (let i = 0; i < 100; i++) runRng.ai.next();
  expect([runRng.wave.next(), runRng.loot.next()]).toEqual(expected);
  expect(runSeed()).toBe(123);
});
it('eases the same distance after equal time at 30, 60 and 120 fps', () => {
  const position = (fps: number) => {
    let x = 0;
    for (let i = 0; i < fps; i++) x += (1 - x) * damp(0.1, 1000 / fps);
    return x;
  };
  expect(position(30)).toBeCloseTo(position(60), 12);
  expect(position(120)).toBeCloseTo(position(60), 12);
  expect(damp(0.1, 0)).toBe(0);
});
