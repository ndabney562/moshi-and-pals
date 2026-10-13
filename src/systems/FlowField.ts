import Phaser from 'phaser';
import type { Obstacle } from '../data/rooms';

/**
 * Lets germs path around furniture. The room is split into a coarse grid;
 * every few hundred ms we flood outward from Eugene's cell, so every cell
 * knows its walking distance to him. Germs step toward the neighboring cell
 * that is closer. One flood serves every germ, so cost doesn't grow with
 * enemy count.
 */
export class FlowField {
  private readonly cols: number;
  private readonly rows: number;
  private readonly blocked: Uint8Array;
  private readonly dist: Int32Array;
  private readonly queue: Int32Array;
  private static readonly NEIGHBORS = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  ] as const;

  /** `clearance` inflates obstacles so germ bodies don't scrape corners. */
  constructor(width: number, height: number, obstacles: Obstacle[], private readonly cell = 40, private readonly clearance = 18) {
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(height / cell);
    const n = this.cols * this.rows;
    this.blocked = new Uint8Array(n);
    this.dist = new Int32Array(n);
    this.queue = new Int32Array(n);
    this.rebuild(obstacles);
  }

  /** Re-marks which cells are solid, e.g. after a door is bought open. */
  rebuild(obstacles: Obstacle[]): void {
    const { cell, clearance, cols, rows } = this;
    this.blocked.fill(0);
    for (const o of obstacles) {
      const x0 = Math.max(0, Math.floor((o.x - clearance) / cell));
      const y0 = Math.max(0, Math.floor((o.y - clearance) / cell));
      const x1 = Math.min(cols - 1, Math.floor((o.x + o.w + clearance - 1) / cell));
      const y1 = Math.min(rows - 1, Math.floor((o.y + o.h + clearance - 1) / cell));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.blocked[y * cols + x] = 1;
    }
  }

  /** Re-floods distances from a target position (Eugene). */
  update(tx: number, ty: number): void {
    const { cols, rows, dist, queue, blocked } = this;
    dist.fill(-1);
    const start = this.index(tx, ty);
    let head = 0;
    let tail = 0;
    dist[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
      const i = queue[head++];
      const cx = i % cols;
      const cy = (i / cols) | 0;
      for (const [dx, dy] of FlowField.NEIGHBORS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (dist[ni] !== -1 || blocked[ni]) continue;
        // No cutting diagonally through a blocked corner
        if (dx && dy && (blocked[cy * cols + nx] || blocked[ny * cols + cx])) continue;
        dist[ni] = dist[i] + 1;
        queue[tail++] = ni;
      }
    }
  }

  /**
   * Writes into `out` the point a germ at (x, y) should walk toward.
   * Returns false if there's no path info (germ should chase directly).
   */
  nextStep(x: number, y: number, out: Phaser.Math.Vector2): boolean {
    const { cols, rows, dist, cell } = this;
    const i = this.index(x, y);
    const here = dist[i];
    if (here <= 0) return false;
    const cx = i % cols;
    const cy = (i / cols) | 0;
    let best = -1;
    let bestDist = here;
    for (const [dx, dy] of FlowField.NEIGHBORS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const d = dist[ny * cols + nx];
      if (d >= 0 && d < bestDist) { bestDist = d; best = ny * cols + nx; }
    }
    if (best < 0) return false;
    out.set(((best % cols) + 0.5) * cell, (((best / cols) | 0) + 0.5) * cell);
    return true;
  }

  private index(x: number, y: number): number {
    const cx = Phaser.Math.Clamp(Math.floor(x / this.cell), 0, this.cols - 1);
    const cy = Phaser.Math.Clamp(Math.floor(y / this.cell), 0, this.rows - 1);
    return cy * this.cols + cx;
  }
}
