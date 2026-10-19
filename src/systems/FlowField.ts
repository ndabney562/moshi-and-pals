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
  /** Finer grid of what's actually solid (no clearance), for line-of-sight checks. */
  private readonly solid: Uint8Array;
  private readonly solidCols: number;
  private readonly solidRows: number;
  private static readonly SOLID_CELL = 16;
  /** Staircases: a germ standing in cell `from` can step to cell `to` on the other floor. */
  private portals: { from: number; to: number }[] = [];
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
    this.solidCols = Math.ceil(width / FlowField.SOLID_CELL);
    this.solidRows = Math.ceil(height / FlowField.SOLID_CELL);
    this.solid = new Uint8Array(this.solidCols * this.solidRows);
    this.rebuild(obstacles);
  }

  /** Re-marks which cells are solid, e.g. after a door is bought open. */
  rebuild(obstacles: Obstacle[]): void {
    const { cell, clearance, cols, rows } = this;
    this.blocked.fill(0);
    // A cell is blocked when its centre is within `clearance` of an obstacle. (Blocking every cell the inflated
    // obstacle touched closed off narrow doors depending on how they lined up with the grid.) Every obstacle is
    // at least a few px thick, so with clearance 18 it still covers a centre: walls never leak.
    for (const o of obstacles) {
      const x0 = Math.max(0, Math.ceil((o.x - clearance) / cell - 0.5));
      const y0 = Math.max(0, Math.ceil((o.y - clearance) / cell - 0.5));
      const x1 = Math.min(cols - 1, Math.floor((o.x + o.w + clearance) / cell - 0.5));
      const y1 = Math.min(rows - 1, Math.floor((o.y + o.h + clearance) / cell - 0.5));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.blocked[y * cols + x] = 1;
    }
    const sc = FlowField.SOLID_CELL;
    this.solid.fill(0);
    for (const o of obstacles) {
      const x0 = Math.max(0, Math.floor(o.x / sc));
      const y0 = Math.max(0, Math.floor(o.y / sc));
      const x1 = Math.min(this.solidCols - 1, Math.floor((o.x + o.w - 1) / sc));
      const y1 = Math.min(this.solidRows - 1, Math.floor((o.y + o.h - 1) / sc));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.solid[y * this.solidCols + x] = 1;
    }
  }

  /** True if nothing solid (walls, furniture, locked doors) lies on the straight line between two points. */
  lineClear(x0: number, y0: number, x1: number, y1: number): boolean {
    const sc = FlowField.SOLID_CELL;
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (sc * 0.75));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const cx = Math.floor((x0 + (x1 - x0) * t) / sc);
      const cy = Math.floor((y0 + (y1 - y0) * t) / sc);
      if (cx < 0 || cy < 0 || cx >= this.solidCols || cy >= this.solidRows) return false;
      if (this.solid[cy * this.solidCols + cx]) return false;
    }
    return true;
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
      // Stairs: a cell whose staircase comes out here is one step away
      for (const p of this.portals) {
        if (p.to !== i || dist[p.from] !== -1) continue;
        dist[p.from] = dist[i] + 1;
        queue[tail++] = p.from;
      }
    }
  }

  /** After `update`: true if (x, y) can be walked to from the flood's start (coarse: narrow gaps may read as closed). */
  reaches(x: number, y: number): boolean {
    return this.dist[this.index(x, y)] >= 0;
  }

  /** Sets the active staircases (germs path through them to reach Eugene on another floor). */
  setPortals(links: { from: { x: number; y: number }; to: { x: number; y: number } }[]): void {
    this.portals = links.map((l) => ({ from: this.index(l.from.x, l.from.y), to: this.index(l.to.x, l.to.y) }));
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
