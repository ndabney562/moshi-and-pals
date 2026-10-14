import Phaser from 'phaser';

const MAX_PUDDLES = 8;

interface Puddle { img: Phaser.GameObjects.Image; x: number; y: number; r: number; slow: number; until: number; born: number; }

/**
 * Slippery mucus puddles left by Sneezer globs. Eugene walks slower while standing in one.
 * Pooled; the oldest puddle is reused when the pool is full.
 */
export class Puddles {
  private readonly items: Puddle[] = [];
  private next = 0;

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < MAX_PUDDLES; i++) {
      const img = scene.add.image(0, 0, 'blob').setDepth(1.5).setVisible(false).setTint(0xa8c94a);
      this.items.push({ img, x: 0, y: 0, r: 0, slow: 1, until: 0, born: 0 });
    }
  }

  add(x: number, y: number, radius: number, ms: number, slow: number, time: number): void {
    const p = this.items[this.next];
    this.next = (this.next + 1) % MAX_PUDDLES;
    Object.assign(p, { x, y, r: radius, slow, until: time + ms, born: time });
    p.img.setPosition(x, y).setScale((radius * 2) / 16, (radius * 1.7) / 16).setRotation(Math.random() * Math.PI).setAlpha(0.6).setVisible(true);
  }

  /** Fades puddles out and returns the slow factor for someone standing at (x, y): 1 = not in a puddle. */
  update(time: number, x: number, y: number): number {
    let slow = 1;
    for (const p of this.items) {
      if (!p.img.visible) continue;
      const left = p.until - time;
      if (left <= 0) {
        p.img.setVisible(false);
        continue;
      }
      // Splat in, then fade over the last half second
      const grow = Math.min(1, (time - p.born) / 120);
      p.img.setAlpha(0.6 * Math.min(1, left / 500)).setScale(((p.r * 2) / 16) * grow, ((p.r * 1.7) / 16) * grow);
      if ((x - p.x) ** 2 + (y - p.y) ** 2 < p.r * p.r) slow = Math.min(slow, p.slow);
    }
    return slow;
  }

  /** How many puddles are on the floor (tests). */
  get count(): number {
    return this.items.filter((p) => p.img.visible).length;
  }
}
