/**
 * The MoshiLand Urgent Care floor plan, as plain data. Coordinates are
 * logical pixels, origin top-left of the whole building. Every obstacle is a
 * solid rectangle; `kind` decides how it is drawn. Rooms are opened by buying
 * their doors with Copays, and each one is busier (harder to move through)
 * than the last.
 *
 *   ┌──────────┬───────────────────────────┬──────────────────┐
 *   │  BREAK   │ EXAM ROOMS 1-3 + triage   │      X-RAY       │
 *   │  ROOM    ├─────────────┤ door ├──────┤                  │
 *   ├──────────┤                           ├──────┤door├──────┤
 *   │ BATHROOM │      WAITING ROOM         │       LAB        │
 *   │          │        (start)            │                  │
 *   └──────────┴──────────┤EXIT├───────────┴──────────────────┘
 */
export type ObstacleKind =
  | 'wall' | 'chairRow' | 'desk' | 'table' | 'plant' | 'waterCooler' | 'door' | 'supplyCart'
  | 'stall' | 'sink' | 'examTable' | 'counter' | 'xray' | 'couch' | 'fridge' | 'cabinet'
  /** Supply crate: buy it open with Copays for a random new tool (M6). */
  | 'crate'
  /** M8 clinic: railing around the upstairs "open to below" drop, waiting-room lounge chairs and benches, the elevator. */
  | 'railing' | 'lounge' | 'bench' | 'elevator'
  /** M14 room traps and the vending machine. */
  | 'handDryer' | 'autoclave' | 'xrayControls' | 'vending'
  /** M9: the Lab's Compounding Station (weapon upgrades). */
  | 'compounder';

export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Optional sign text (doors, supply carts). */
  label?: string;
  /** Doors only: the room this door opens into, and its price in Copays. */
  opens?: string;
  cost?: number;
}

/** One room of the building: its floor area and where germs come in. */
export interface RoomArea {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Open from the start (only the waiting room). */
  start?: boolean;
  /** Floor tint, so each room reads differently at a glance. */
  tint?: number;
  germSpawns: { x: number; y: number }[];
}

export interface RoomLayout {
  id: string;
  name: string;
  width: number;
  height: number;
  playerSpawn: { x: number; y: number };
  rooms: RoomArea[];
  obstacles: Obstacle[];
  /** The way out. Diamond tries to drag Eugene out here for a "quick meeting". */
  exit: { x: number; y: number };
  /** Painted floor signs. */
  signs: { x: number; y: number; text: string }[];
  /** Floors of the building (M8). The camera stays inside the floor Eugene is on. */
  floors?: FloorArea[];
  /** Staircases linking floors: walk into one end, come out at the other. Usable once all `requires` rooms are open. */
  stairs?: Stairway[];
  /** Plan pixel to world point, for layouts drawn from a floor plan (tests use it to stand somewhere specific). */
  fromPlan?: (floor: 'ground' | 'up', px: number, py: number) => { x: number; y: number };
}

export interface Rect { x: number; y: number; w: number; h: number; }

export interface FloorArea extends Rect { id: string; name: string; }

export interface StairEnd {
  /** Walking into this zone takes you up (or down) the stairs... */
  zone: Rect;
  /** ...and you come out here, on the other floor, just outside the other end's zone. */
  arrive: { x: number; y: number };
}

export interface Stairway {
  id: string;
  a: StairEnd;
  b: StairEnd;
  requires: string[];
}

const W = 3800;
const H = 2100;
const T = 40; // wall thickness

/** Wall x-positions and y-positions where rooms meet. */
const LEFT = 600; // break room / bathroom | exam hall / waiting room
const RIGHT = 2360; // exam hall / waiting room | x-ray / lab
const MID = 1000; // exam hall | waiting room
const RIGHT_MID = 1060; // x-ray | lab
const BATH_TOP = 1300; // break room | bathroom

/** The waiting room's furniture was designed in its own coordinates; this places it in the building. */
const WX = LEFT;
const WY = MID;
const shift = (list: Obstacle[], dx: number, dy: number): Obstacle[] => list.map((o) => ({ ...o, x: o.x + dx, y: o.y + dy }));

/** A row of `count` waiting-room chairs starting at (x, y). */
const chairRow = (x: number, y: number, count: number): Obstacle => ({ kind: 'chairRow', x, y, w: count * 54, h: 48 });
const wall = (x: number, y: number, w: number, h: number): Obstacle => ({ kind: 'wall', x, y, w, h });
const door = (x: number, y: number, w: number, h: number, label: string, opens: string, cost: number): Obstacle =>
  ({ kind: 'door', x, y, w, h, label, opens, cost });

const WAITING_FURNITURE: Obstacle[] = shift([
  // Front desk, top right
  { kind: 'desk', x: 1240, y: 150, w: 400, h: 70 },
  { kind: 'desk', x: 1240, y: 220, w: 70, h: 130 },
  // Chairs: two blocks of rows, backs facing each other
  chairRow(200, 360, 6),
  chairRow(200, 520, 6),
  chairRow(200, 680, 6),
  chairRow(760, 360, 5),
  chairRow(760, 520, 5),
  // Coffee table with very old magazines
  { kind: 'table', x: 1180, y: 560, w: 180, h: 90 },
  { kind: 'plant', x: 60, y: 60, w: 60, h: 60 },
  { kind: 'plant', x: 1680, y: 980, w: 60, h: 60 },
  { kind: 'plant', x: 60, y: 980, w: 60, h: 60 },
  { kind: 'waterCooler', x: 1680, y: 420, w: 50, h: 50 },
  { kind: 'supplyCart', x: 1480, y: 840, w: 90, h: 54, label: 'SUPPLIES' },
  { kind: 'crate', x: 1100, y: 860, w: 70, h: 60 },
], WX, WY);

export const MOSHILAND: RoomLayout = {
  id: 'moshiland',
  name: 'MoshiLand Urgent Care',
  width: W,
  height: H,
  playerSpawn: { x: WX + 900, y: WY + 880 },
  exit: { x: WX + 900, y: H - 60 },
  signs: [
    { x: WX + 1440, y: WY + 110, text: 'WELCOME TO MOSHILAND URGENT CARE' },
    { x: WX + 900, y: H - 120, text: 'PLEASE SANITIZE YOUR HANDS' },
  ],
  rooms: [
    {
      id: 'waiting', name: 'Waiting Room', x: LEFT, y: MID, w: RIGHT + T - LEFT, h: H - MID, start: true,
      germSpawns: [
        { x: WX + 900, y: H - 90 }, // front entrance
        { x: WX + 1460, y: WY + 300 }, // behind the front desk
        { x: WX + 440, y: WY + 90 }, // by the exam rooms door
        { x: WX + 1710, y: WY + 700 }, // by the lab door
        { x: WX + 90, y: WY + 580 }, // by the bathroom door
      ],
    },
    {
      id: 'bathroom', name: 'Bathroom', x: 0, y: BATH_TOP, w: LEFT + T, h: H - BATH_TOP, tint: 0x7fd3ff,
      germSpawns: [{ x: 520, y: 1620 }, { x: 300, y: 1700 }],
    },
    {
      id: 'exam', name: 'Exam Rooms', x: LEFT, y: 0, w: RIGHT + T - LEFT, h: MID + T, tint: 0xa8e6cf,
      germSpawns: [{ x: 1000, y: 300 }, { x: 1550, y: 300 }, { x: 2100, y: 300 }],
    },
    {
      id: 'break', name: 'Staff Break Room', x: 0, y: 0, w: LEFT + T, h: BATH_TOP + T, tint: 0xf4a261,
      germSpawns: [{ x: 500, y: 300 }, { x: 480, y: 1180 }],
    },
    {
      id: 'lab', name: 'Lab', x: RIGHT, y: RIGHT_MID, w: W - RIGHT, h: H - RIGHT_MID, tint: 0xb39ddb,
      germSpawns: [{ x: 3650, y: 1200 }, { x: 3700, y: 1650 }, { x: 2700, y: 1960 }],
    },
    {
      id: 'xray', name: 'X-Ray', x: RIGHT, y: 0, w: W - RIGHT, h: RIGHT_MID + T, tint: 0x546e7a,
      germSpawns: [{ x: 3650, y: 120 }, { x: 2480, y: 120 }, { x: 2800, y: 950 }],
    },
  ],
  obstacles: [
    // Outer walls
    wall(0, 0, W, T),
    wall(0, H - T, W, T),
    wall(0, 0, T, H),
    wall(W - T, 0, T, H),

    // Inner walls, with gaps where the doors sit
    wall(LEFT, 0, T, 600), wall(LEFT, 720, T, 800), wall(LEFT, 1640, T, H - 1640), // left: break door 600-720, bathroom door 1520-1640
    wall(0, BATH_TOP, LEFT, T), // break room | bathroom (no door)
    wall(LEFT + T, MID, 340, T), wall(LEFT + 500, MID, RIGHT - LEFT - 500, T), // exam | waiting: door at 980-1100
    wall(RIGHT, 0, T, 300), wall(RIGHT, 420, T, 1220), wall(RIGHT, 1760, T, H - 1760), // right: x-ray door 300-420, lab door 1640-1760
    wall(RIGHT + T, RIGHT_MID, 600, T), wall(RIGHT + 780, RIGHT_MID, W - RIGHT - 780, T), // x-ray | lab: door at 3000-3140

    // Doors. Prices climb with how busy the room is.
    door(LEFT, 1520, T, 120, 'BATHROOM', 'bathroom', 200),
    door(LEFT + 380, MID, 120, T, 'EXAM ROOMS', 'exam', 350),
    door(RIGHT, 1640, T, 120, 'LAB', 'lab', 500),
    door(LEFT, 600, T, 120, 'BREAK ROOM', 'break', 600),
    door(RIGHT, 300, T, 120, 'X-RAY', 'xray', 750),
    door(RIGHT + 640, RIGHT_MID, 140, T, 'X-RAY', 'xray', 750),
    { kind: 'door', x: WX + 820, y: H - T, w: 160, h: T, label: 'EXIT (NICE TRY)' },

    // WAITING ROOM (start): open, with chair rows
    ...WAITING_FURNITURE,

    // BATHROOM: small and cramped, two stalls and a sink counter
    { kind: 'stall', x: T, y: BATH_TOP + T, w: 170, h: 220 },
    { kind: 'stall', x: T + 190, y: BATH_TOP + T, w: 170, h: 220 },
    { kind: 'sink', x: 160, y: H - T - 90, w: 260, h: 60 },
    { kind: 'cabinet', x: LEFT - 90, y: BATH_TOP + 60, w: 50, h: 120 },

    // EXAM ROOMS: three curtained exam bays along the top, a triage desk in the corridor
    wall(1140, T, 30, 380), wall(1690, T, 30, 380),
    wall(LEFT + T, 420, 240, 30), wall(1000, 420, 330, 30), wall(1500, 420, 360, 30), wall(2040, 420, RIGHT - 2040, 30),
    { kind: 'examTable', x: 820, y: 120, w: 90, h: 190 },
    { kind: 'examTable', x: 1360, y: 120, w: 90, h: 190 },
    { kind: 'examTable', x: 1910, y: 120, w: 90, h: 190 },
    { kind: 'cabinet', x: 1060, y: 60, w: 60, h: 120 },
    { kind: 'cabinet', x: 1610, y: 60, w: 60, h: 120 },
    { kind: 'cabinet', x: 2160, y: 60, w: 60, h: 120 },
    { kind: 'counter', x: 1320, y: 620, w: 360, h: 80, label: 'TRIAGE' },
    { kind: 'plant', x: 2240, y: 880, w: 60, h: 60 },
    { kind: 'crate', x: 2150, y: 600, w: 70, h: 60 },

    // STAFF BREAK ROOM: couch, table, fridge and a counter full of mugs
    { kind: 'couch', x: 80, y: 120, w: 260, h: 90 },
    { kind: 'table', x: 150, y: 420, w: 200, h: 120 },
    { kind: 'fridge', x: 470, y: 60, w: 80, h: 90 },
    { kind: 'counter', x: 60, y: 800, w: 90, h: 360 },
    { kind: 'cabinet', x: 420, y: 760, w: 120, h: 60 },
    { kind: 'crate', x: 300, y: 980, w: 70, h: 60 },

    // LAB: long benches make narrow aisles
    { kind: 'counter', x: 2560, y: 1260, w: 900, h: 70 },
    { kind: 'counter', x: 2700, y: 1500, w: 900, h: 70 },
    { kind: 'counter', x: 2560, y: 1740, w: 900, h: 70 },
    { kind: 'fridge', x: 3640, y: 1360, w: 80, h: 100 },
    { kind: 'cabinet', x: 2460, y: 1920, w: 120, h: 60 },
    { kind: 'supplyCart', x: 3560, y: 1900, w: 90, h: 54, label: 'SUPPLIES' },
    { kind: 'crate', x: 2420, y: 1380, w: 70, h: 60 },

    // X-RAY: the big machine, lead partitions and a control booth. The busiest room.
    { kind: 'xray', x: 2860, y: 360, w: 420, h: 220, label: 'X-RAY' },
    wall(2560, 200, 30, 360), wall(3540, 200, 30, 360),
    wall(2700, 720, 300, 30), wall(3140, 720, 300, 30),
    { kind: 'counter', x: 3520, y: 860, w: 200, h: 70, label: 'CONTROLS' },
    { kind: 'cabinet', x: 2460, y: 860, w: 60, h: 140 },
    { kind: 'crate', x: 3600, y: 300, w: 70, h: 60 },
  ],
};
