/**
 * Room layouts as plain data. Coordinates are logical pixels, origin top-left.
 * Every obstacle is a solid rectangle; `kind` decides how it is drawn.
 * When we design the real clinic floor plan, it will live in files like this.
 */
export type ObstacleKind = 'wall' | 'chairRow' | 'desk' | 'table' | 'plant' | 'waterCooler' | 'door';

export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Optional sign text (used for doors). */
  label?: string;
}

export interface RoomLayout {
  id: string;
  name: string;
  width: number;
  height: number;
  playerSpawn: { x: number; y: number };
  /** Where germs enter the room (just inside doors and vents). */
  germSpawns: { x: number; y: number }[];
  obstacles: Obstacle[];
}

const W = 1800;
const H = 1100;
const T = 40; // wall thickness

/** A row of `count` waiting-room chairs starting at (x, y). */
const chairRow = (x: number, y: number, count: number): Obstacle => ({
  kind: 'chairRow', x, y, w: count * 54, h: 48,
});

export const WAITING_ROOM: RoomLayout = {
  id: 'waiting_room',
  name: 'Waiting Room',
  width: W,
  height: H,
  playerSpawn: { x: 900, y: 880 },
  germSpawns: [
    { x: 440, y: 90 },    // exam rooms door
    { x: 90, y: 580 },    // bathroom door
    { x: W - 90, y: 700 }, // hallway door
    { x: 900, y: H - 90 }, // front entrance
    { x: 1460, y: 300 },  // behind the front desk
  ],
  obstacles: [
    // Outer walls
    { kind: 'wall', x: 0, y: 0, w: W, h: T },
    { kind: 'wall', x: 0, y: H - T, w: W, h: T },
    { kind: 'wall', x: 0, y: 0, w: T, h: H },
    { kind: 'wall', x: W - T, y: 0, w: T, h: H },

    // Locked doors to future areas (solid for now; unlockable in a later milestone)
    { kind: 'door', x: 380, y: 0, w: 120, h: T, label: 'EXAM ROOMS' },
    { kind: 'door', x: 0, y: 520, w: T, h: 120, label: 'BATHROOM' },
    { kind: 'door', x: W - T, y: 640, w: T, h: 120, label: 'HALLWAY' },
    { kind: 'door', x: 820, y: H - T, w: 160, h: T, label: 'EXIT (NICE TRY)' },

    // Front desk, top right
    { kind: 'desk', x: 1240, y: 150, w: 400, h: 70 },
    { kind: 'desk', x: 1240, y: 220, w: 70, h: 130 },

    // Waiting-room chairs: two blocks of rows, backs facing each other
    chairRow(200, 360, 6),
    chairRow(200, 520, 6),
    chairRow(200, 680, 6),
    chairRow(760, 360, 5),
    chairRow(760, 520, 5),

    // Coffee table with very old magazines
    { kind: 'table', x: 1180, y: 560, w: 180, h: 90 },

    // Decorations that still block movement
    { kind: 'plant', x: 60, y: 60, w: 60, h: 60 },
    { kind: 'plant', x: 1680, y: 980, w: 60, h: 60 },
    { kind: 'plant', x: 60, y: 980, w: 60, h: 60 },
    { kind: 'waterCooler', x: 1680, y: 420, w: 50, h: 50 },
  ],
};
