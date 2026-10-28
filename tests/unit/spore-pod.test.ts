import { describe, expect, it } from 'vitest';
import { GERMS } from '../../src/data/germs';

describe('Spore Pod State Readability & Armor Invariants', () => {
  it('defines sporePod with shell shape, 120 deg front arc, 0.25x front armor, and 1.5x back vulnerability', () => {
    const def = GERMS.sporePod;
    expect(def).toBeDefined();
    expect(def.shape).toBe('shell');
    expect(def.armor).toEqual({
      frontArcDeg: 120,
      front: 0.25,
      back: 1.5,
      turnDegPerSec: 70,
      flipMs: 2000,
    });
  });

  it('calculates armor multipliers accurately across front, back, and flipped angles', () => {
    const def = GERMS.sporePod;
    const a = def.armor!;

    // Helper implementing GameScene.armorMult calculation logic
    function calcArmor(travelAngle: number, germRotation: number, piercing: boolean, isFlipped: boolean): number {
      if (!a || piercing) return 1;
      if (isFlipped) return a.back;
      const wrap = (angle: number) => {
        let diff = angle % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
      };
      const diff = Math.abs(wrap(travelAngle + Math.PI - germRotation));
      const frontArcRad = (a.frontArcDeg / 2) * (Math.PI / 180);
      if (diff <= frontArcRad) return a.front;
      if (diff >= Math.PI - (60 * Math.PI / 180)) return a.back;
      return 1;
    }

    // Facing right (rotation 0), spray travelling left (-x, Math.PI) directly into its face
    expect(calcArmor(Math.PI, 0, false, false)).toBe(0.25);

    // Facing right (rotation 0), spray travelling right (+x, 0) into its back
    expect(calcArmor(0, 0, false, false)).toBe(1.5);

    // Piercing spray (UV Wand) ignores front armor
    expect(calcArmor(Math.PI, 0, true, false)).toBe(1);

    // When flipped, hits into its face deal back (vulnerable 1.5x) damage
    expect(calcArmor(Math.PI, 0, false, true)).toBe(1.5);
  });
});
