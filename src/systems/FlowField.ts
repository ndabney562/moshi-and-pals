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
  private portals: { from: number; to: number; x: number; y: number }[] = [];
  /** Cells whose way to Eugene is up (or down) their staircase this flood: 1, else 0. */
  private readonly viaStairs: Uint8Array;
  /** How many cells (up to WALL_FAR) each cell is from the nearest blocked one: paths keep to the middle of halls. */
  private readonly wallDist: Uint8Array;
  private static readonly WALL_FAR = 4;
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
    this.viaStairs = new Uint8Array(n);
    this.wallDist = new Uint8Array(n);
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
    this.measureWalls();
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

  /** Floods outward from every blocked cell, so each open cell knows how close the nearest wall is. */
  private measureWalls(): void {
    const { cols, rows, blocked, wallDist, queue } = this;
    const far = FlowField.WALL_FAR;
    wallDist.fill(far);
    let head = 0;
    let tail = 0;
    for (let i = 0; i < blocked.length; i++) {
      if (!blocked[i]) continue;
      wallDist[i] = 0;
      queue[tail++] = i;
    }
    while (head < tail) {
      const i = queue[head++];
      const next = wallDist[i] + 1;
      if (next >= far) continue;
      const cx = i % cols;
      const cy = (i / cols) | 0;
      for (const [dx, dy] of FlowField.NEIGHBORS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (wallDist[ni] <= next) continue;
        wallDist[ni] = next;
        queue[tail++] = ni;
      }
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
    this.viaStairs.fill(0);
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
        this.viaStairs[p.from] = 1;
        queue[tail++] = p.from;
      }
    }
  }

  /** After `update`: true if (x, y) can be walked to from the flood's start (coarse: narrow gaps may read as closed). */
  reaches(x: number, y: number): boolean {
    return this.dist[this.index(x, y)] >= 0;
  }

  /** True if a germ fits at (x, y): its cell and the eight around it are clear of walls and furniture. */
  roomy(x: number, y: number): boolean {
    const { cols, rows, cell } = this;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || this.blocked[ny * cols + nx]) return false;
      }
    }
    return true;
  }

  /** After `update`: true if a germ at (x, y) gets to Eugene by taking the staircase it's standing at. */
  takesStairs(x: number, y: number): boolean {
    return this.viaStairs[this.index(x, y)] === 1;
  }

  /** Sets the active staircases (germs path through them to reach Eugene on another floor). */
  setPortals(links: { from: { x: number; y: number }; to: { x: number; y: number } }[]): void {
    this.portals = links.map((l) => ({ from: this.index(l.from.x, l.from.y), to: this.index(l.to.x, l.to.y), x: l.from.x, y: l.from.y }));
  }

  /**
   * Writes into `out` the point a germ at (x, y) should walk toward.
   * Returns false if there's no path info (germ should chase directly).
   */
  nextStep(x: number, y: number, out: Phaser.Math.Vector2): boolean {
    const { cols, rows, dist, cell, wallDist } = this;
    const i = this.index(x, y);
    const here = dist[i];
    if (here === 0) return false;
    if (this.viaStairs[i]) {
      // Standing at the stairs that lead to Eugene: walk onto them (the cell centre can sit beside the steps)
      const p = this.portals.find((q) => q.from === i);
      if (p) {
        out.set(p.x, p.y);
        return true;
      }
    }
    const cx = i % cols;
    const cy = (i / cols) | 0;
    let best = -1;
    let bestDist = here < 0 ? Number.MAX_SAFE_INTEGER : here;
    let bestRoom = -1;
    // A germ shoved into a wall's margin (a cell with no path) heads for the nearest cell that has one, a ring
    // further out if need be; otherwise the closer neighbor, and of equals the one further from walls
    for (let r = 1; r <= (here < 0 ? 2 : 1) && best < 0; r++) {
      for (let ny = cy - r; ny <= cy + r; ny++) {
        for (let nx = cx - r; nx <= cx + r; nx++) {
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || (nx === cx && ny === cy)) continue;
          if (Math.max(Math.abs(nx - cx), Math.abs(ny - cy)) !== r) continue;
          const ni = ny * cols + nx;
          const d = dist[ni];
          if (d < 0 || d > bestDist || (d === bestDist && (best < 0 || wallDist[ni] <= bestRoom))) continue;
          bestDist = d;
          best = ni;
          bestRoom = wallDist[ni];
        }
      }
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
