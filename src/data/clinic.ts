/**
 * MoshiLand Urgent Care, M8: laid out after the real clinic's floor plan (Noah's call; the photos
 * are not in the repo). Two floors side by side in one world, joined by the two real staircases.
 *
 * Everything below is written in the floor plan's own coordinates (pixels on Noah's photos of the
 * posted plans) and converted with g() / u(), so it can be checked against the plans directly.
 * Rooms are boxes with doors; the walls are generated from them, with every door cut out of every
 * wall it touches. Locked rooms open by buying any of their doors.
 *
 *   GROUND FLOOR                                   UPSTAIRS (bought via the stairs)
 *   ┌──────┬──────┬──────┬──────┬──┬──────┐        ┌─────┬─────┬─────┬─────┬───fire esc─┐
 *   │ EX 1 │ EX 2 │ EX 3 │ EX 4 │  │ EX 5 │        │EX 8 │EX 9 │EX 10│EX 11│           │
 *   ├──────┴──────┴──────┴──────┤  ├──────┤        ├─────┴─────┴─────┴─────┤  ├────────┤
 *   │SC1 ┌──hall──────────────┐ │  │ EX 6 │        │B3  hall               │  │ EX 12  │
 *   │B2  │      LAB           │ │  ├──────┤        ├─────┐   ┌─MA─┐        │  ├────────┤
 *   │stairs└──────────────────┘ │  │ EX 7 │        │stairs   └────┘        │  │ EX 13  │
 *   │WAITING  RECEPTION MGR B1  └──┴─┬────┤        │░░open to below░░ SC2 hall──┴────┤
 *   │ chairs            ELEV  X-RAY  │EGR │        │░░░░░░░░░░░░░░░░░ B4  SC3 stairs │
 *   └────────front doors─────────────┴────┘        │░░░░░░░░░░░░░ ELEV EX 15 │ EX 14 │
 */
import type { FloorArea, Obstacle, ObstacleKind, Rect, RoomArea, RoomLayout, Stairway } from './rooms';

/** Game pixels per plan pixel. Was 3 until v0.19.1, when Noah found the map too big; 2.4 is 20% smaller. */
const S = 2.4;
const T = 30; // wall thickness
/** Floor outlines in plan coordinates. */
const OUTLINE: Record<'g' | 'u', number[]> = { g: [158, 378, 1282, 1612], u: [236, 382, 1256, 1496] };
const up10 = (n: number) => Math.ceil(n / 10) * 10;
/** Plan origin of each floor, and where that floor sits in the game world (a solid gap between them). */
const G0 = { px: 150, py: 370, x: 0 };
const GROUND_W = up10((OUTLINE.g[2] - G0.px) * S);
const U0 = { px: 230, py: 370, x: GROUND_W + up10((400 / 3) * S) };
const UP_W = up10((OUTLINE.u[2] - U0.px) * S);
const H = up10((OUTLINE.g[3] - G0.py) * S) + 10;

// Rounded to whole pixels so walls and furniture stay crisp
const gx = (px: number) => Math.round(G0.x + (px - G0.px) * S);
const ux = (px: number) => Math.round(U0.x + (px - U0.px) * S);
const fy = (py: number) => Math.round((py - G0.py) * S);
type Floor = 'g' | 'u';
const X = (f: Floor, px: number) => (f === 'g' ? gx(px) : ux(px));
/** A plan box [x1, y1, x2, y2] on a floor, as a game rect. */
const box = (f: Floor, b: number[]): Rect => ({ x: X(f, b[0]), y: fy(b[1]), w: X(f, b[2]) - X(f, b[0]), h: fy(b[3]) - fy(b[1]) });
const pt = (f: Floor, px: number, py: number) => ({ x: X(f, px), y: fy(py) });

type Side = 'n' | 's' | 'e' | 'w';
interface DoorSpec { side: Side; at: number; w?: number }
interface RoomSpec {
  id: string;
  name: string;
  floor: Floor;
  /** One or more plan boxes. The first one gets the walls and doors (open areas get no walls). */
  boxes: number[][];
  walled?: boolean;
  doors?: DoorSpec[];
  /** Copays to open (absent = open from the start, or only opened by a gate). */
  cost?: number;
  start?: boolean;
  tint?: number;
  spawns?: number[][];
}

const DOOR_W = 140;

const ROOMS: RoomSpec[] = [
  // ───────── GROUND FLOOR ─────────
  {
    id: 'waiting', name: 'Waiting Room', floor: 'g', start: true, walled: false,
    // Waiting area by the street (with the stair alcove), then reception and the seating in front of it
    boxes: [[405, 1112, 815, 1605], [172, 978, 405, 1605], [172, 885, 405, 978]],
    spawns: [[545, 1580], [200, 935], [748, 1490]],
  },
  {
    id: 'halls', name: 'Hallways', floor: 'g', walled: false, tint: 0x9fd8cb,
    // The loop around the lab: west passage, top corridor, east corridor, and the lower hall
    boxes: [[405, 772, 515, 1112], [405, 652, 978, 772], [978, 382, 1066, 1132], [922, 1132, 1085, 1262]],
    spawns: [[1020, 430], [460, 700]],
  },
  { id: 'exam1', name: 'Exam Room 1', floor: 'g', boxes: [[172, 382, 372, 652]], doors: [{ side: 's', at: 330 }], cost: 150, tint: 0xa8e6cf, spawns: [[240, 450]] },
  { id: 'exam2', name: 'Exam Room 2', floor: 'g', boxes: [[372, 382, 578, 656]], doors: [{ side: 's', at: 418 }], cost: 150, tint: 0xa8e6cf, spawns: [[520, 450]] },
  { id: 'exam3', name: 'Exam Room 3', floor: 'g', boxes: [[578, 382, 780, 660]], doors: [{ side: 's', at: 622 }], cost: 150, tint: 0xa8e6cf, spawns: [[720, 450]] },
  { id: 'exam4', name: 'Exam Room 4', floor: 'g', boxes: [[780, 382, 978, 664]], doors: [{ side: 's', at: 935 }], cost: 150, tint: 0xa8e6cf, spawns: [[830, 450]] },
  { id: 'exam5', name: 'Exam Room 5', floor: 'g', boxes: [[1066, 392, 1278, 636]], doors: [{ side: 'w', at: 590 }], cost: 200, tint: 0xa8e6cf, spawns: [[1220, 450]] },
  { id: 'exam6', name: 'Exam Room 6', floor: 'g', boxes: [[1060, 636, 1268, 882]], doors: [{ side: 'w', at: 820 }], cost: 200, tint: 0xa8e6cf, spawns: [[1220, 700]] },
  { id: 'exam7', name: 'Exam Room 7', floor: 'g', boxes: [[1046, 882, 1258, 1132]], doors: [{ side: 'w', at: 930 }], cost: 200, tint: 0xa8e6cf, spawns: [[1200, 1080]] },
  { id: 'sc1', name: 'Supply Closet', floor: 'g', boxes: [[172, 652, 405, 768]], doors: [{ side: 'e', at: 715, w: 120 }], cost: 150, tint: 0xd7ccc8, spawns: [[210, 700]] },
  { id: 'bath2', name: 'Bathroom 2', floor: 'g', boxes: [[248, 768, 405, 885]], doors: [{ side: 'e', at: 830, w: 110 }], cost: 100, tint: 0x7fd3ff, spawns: [[285, 800]] },
  { id: 'lab', name: 'Lab', floor: 'g', boxes: [[515, 772, 948, 1112]], doors: [{ side: 'w', at: 1060 }], cost: 500, tint: 0xb39ddb, spawns: [[855, 900]] },
  { id: 'manager', name: "Manager's Office", floor: 'g', boxes: [[690, 1118, 818, 1292]], doors: [{ side: 'w', at: 1160, w: 120 }], cost: 150, tint: 0xf4a261, spawns: [[780, 1160]] },
  { id: 'bath1', name: 'Bathroom 1', floor: 'g', boxes: [[818, 1112, 922, 1262]], doors: [{ side: 'e', at: 1170, w: 110 }], cost: 100, tint: 0x7fd3ff, spawns: [[850, 1150]] },
  { id: 'xray', name: 'X-Ray', floor: 'g', boxes: [[815, 1262, 1082, 1605]], doors: [{ side: 'n', at: 985 }], cost: 600, tint: 0x546e7a, spawns: [[860, 1560], [1040, 1400]] },
  { id: 'egress', name: 'Egress Stairs', floor: 'g', boxes: [[1085, 1135, 1252, 1605]], doors: [{ side: 'w', at: 1170, w: 120 }], cost: 200, tint: 0x90a4ae, spawns: [[1120, 1560]] },

  // ───────── UPSTAIRS ─────────
  {
    id: 'upstairs', name: 'Upstairs', floor: 'u', walled: false, tint: 0xc5e1a5,
    boxes: [
      [240, 778, 495, 925], // stair landing
      [362, 640, 985, 780], // north corridor
      [495, 780, 985, 1000], // around the MA station
      [560, 1000, 712, 1060], // nook by the railing
      [712, 1000, 825, 1222], // down past the restrooms to the elevator
      [985, 388, 1040, 1000], // east corridor
      [1040, 388, 1252, 505], // fire-escape hall
      [910, 1000, 1135, 1232], // south hall
    ],
    spawns: [[1180, 420], [767, 1200], [440, 700]],
  },
  { id: 'exam8', name: 'Exam Room 8', floor: 'u', boxes: [[240, 385, 432, 640]], doors: [{ side: 's', at: 400 }], cost: 150, tint: 0xa8e6cf, spawns: [[300, 450]] },
  { id: 'exam9', name: 'Exam Room 9', floor: 'u', boxes: [[432, 385, 612, 640]], doors: [{ side: 's', at: 470 }], cost: 150, tint: 0xa8e6cf, spawns: [[560, 450]] },
  { id: 'exam10', name: 'Exam Room 10', floor: 'u', boxes: [[612, 388, 792, 645]], doors: [{ side: 's', at: 645 }], cost: 150, tint: 0xa8e6cf, spawns: [[740, 450]] },
  { id: 'exam11', name: 'Exam Room 11', floor: 'u', boxes: [[792, 388, 985, 645]], doors: [{ side: 's', at: 950 }], cost: 150, tint: 0xa8e6cf, spawns: [[850, 450]] },
  { id: 'exam12', name: 'Exam Room 12', floor: 'u', boxes: [[1040, 505, 1250, 752]], doors: [{ side: 'w', at: 715 }], cost: 200, tint: 0xa8e6cf, spawns: [[1200, 560]] },
  { id: 'exam13', name: 'Exam Room 13', floor: 'u', boxes: [[1030, 752, 1240, 998]], doors: [{ side: 'w', at: 795 }], cost: 200, tint: 0xa8e6cf, spawns: [[1190, 950]] },
  { id: 'exam14', name: 'Exam Room 14', floor: 'u', boxes: [[990, 1232, 1192, 1492]], doors: [{ side: 'n', at: 1025 }], cost: 200, tint: 0xa8e6cf, spawns: [[1140, 1440]] },
  { id: 'exam15', name: 'Exam Room 15', floor: 'u', boxes: [[822, 1232, 990, 1492]], doors: [{ side: 'n', at: 958 }], cost: 200, tint: 0xa8e6cf, spawns: [[860, 1440]] },
  { id: 'bath3', name: 'Bathroom 3', floor: 'u', boxes: [[240, 640, 362, 778]], doors: [{ side: 'e', at: 700, w: 110 }], cost: 100, tint: 0x7fd3ff, spawns: [[330, 705]] },
  { id: 'bath4', name: 'Bathroom 4', floor: 'u', boxes: [[825, 1062, 912, 1222]], doors: [{ side: 'e', at: 1150, w: 110 }], cost: 100, tint: 0x7fd3ff, spawns: [[860, 1100]] },
  { id: 'sc2', name: 'Supply Closet 2', floor: 'u', boxes: [[825, 955, 912, 1062]], doors: [{ side: 'e', at: 1010, w: 110 }], cost: 150, tint: 0xd7ccc8, spawns: [[850, 990]] },
];

/** Gates across open passages: buying one opens the area behind it. */
const GATES: { floor: Floor; box: number[]; opens: string; label: string }[] = [
  { floor: 'g', box: [405, 1100, 515, 1112], opens: 'halls', label: 'HALLWAYS' },
];
const COSTS: Record<string, number> = { halls: 250, upstairs: 1000 };

/** Outer doors that never open: germs come in through them (and Diamond drags Eugene to the front one). */
const OUTER_DOORS: { floor: Floor; side: Side; at: number; w: number; label: string }[] = [
  { floor: 'g', side: 's', at: 545, w: 330, label: 'EXIT (NICE TRY)' },
  { floor: 'g', side: 'w', at: 930, w: 150, label: 'SIDE DOOR' },
  { floor: 'g', side: 'n', at: 1022, w: 160, label: 'STAFF DOOR' },
  { floor: 'g', side: 's', at: 1165, w: 300, label: 'EGRESS' },
  { floor: 'u', side: 'n', at: 1180, w: 300, label: 'FIRE ESCAPE' },
];


const ob = (kind: ObstacleKind, f: Floor, b: number[], extra: Partial<Obstacle> = {}): Obstacle => ({ kind, ...box(f, b), ...extra });

const FURNITURE: Obstacle[] = [
  // Waiting room: lounge chairs along the west wall, two blocks of seats, the big sofa, benches by the window
  ob('couch', 'g', [250, 995, 385, 1020]),
  ...[1040, 1100, 1430, 1495].map((y) => ob('lounge', 'g', [178, y, 212, y + 46])),
  ob('chairRow', 'g', [228, 1160, 352, 1176]), ob('chairRow', 'g', [228, 1210, 352, 1226]),
  ob('chairRow', 'g', [228, 1330, 352, 1346]), ob('chairRow', 'g', [228, 1380, 352, 1396]),
  ob('bench', 'g', [228, 1552, 330, 1588]), ob('bench', 'g', [338, 1552, 440, 1588]),
  ob('vending', 'g', [178, 1250, 212, 1300], { label: 'SNACKS' }),
  ob('plant', 'g', [180, 1555, 205, 1580]), ob('plant', 'g', [400, 995, 425, 1020]), ob('plant', 'g', [760, 1560, 785, 1585]),
  // Reception: the curved front desk and the long back counter, and the manager's desk
  ob('desk', 'g', [488, 1122, 535, 1250], { label: 'RECEPTION' }),
  ob('counter', 'g', [452, 1318, 685, 1362]),
  ob('desk', 'g', [715, 1200, 780, 1240]),
  ob('supplyCart', 'g', [590, 1395, 625, 1415], { label: 'SUPPLIES' }),
  ob('crate', 'g', [640, 1540, 664, 1560]),
  ob('crate', 'g', [775, 1250, 799, 1270]),
  // Elevator (germs ride it up and down)
  ob('elevator', 'g', [688, 1300, 810, 1458], { label: 'ELEVATOR' }),
  // Exam rooms: a table and a cabinet each
  ...[[180, 400], [520, 400], [620, 400], [860, 400]].map(([x, y]) => ob('examTable', 'g', [x, y + 40, x + 30, y + 120])),
  ...[[340, 390], [380, 390], [585, 390], [940, 390]].map(([x, y]) => ob('cabinet', 'g', [x, y, x + 25, y + 50])),
  ob('examTable', 'g', [1150, 420, 1230, 450]), ob('examTable', 'g', [1150, 700, 1230, 730]), ob('examTable', 'g', [1130, 1000, 1210, 1030]),
  ob('crate', 'g', [440, 560, 464, 580]),
  ob('crate', 'g', [1180, 780, 1204, 800]),
  // Supply closet, bathrooms
  ob('supplyCart', 'g', [180, 700, 215, 720], { label: 'SUPPLIES' }),
  ob('cabinet', 'g', [230, 725, 300, 742]), // clear of Exam Room 1's door
  ob('stall', 'g', [255, 800, 300, 878]), ob('sink', 'g', [340, 850, 395, 878]),
  ob('stall', 'g', [830, 1190, 880, 1255]), ob('sink', 'g', [850, 1118, 905, 1140]),
  ob('handDryer', 'g', [340, 772, 378, 784]), ob('handDryer', 'g', [821, 1150, 833, 1188]),
  // Lab: benches round the walls and down the middle
  ob('counter', 'g', [520, 780, 560, 1000]), ob('counter', 'g', [628, 782, 825, 832]), ob('counter', 'g', [880, 785, 940, 990]),
  ob('counter', 'g', [638, 940, 810, 985]), ob('counter', 'g', [575, 1062, 780, 1106]), ob('counter', 'g', [880, 1000, 920, 1075]),
  ob('supplyCart', 'g', [735, 1010, 770, 1030], { label: 'SUPPLIES' }),
  ob('compounder', 'g', [610, 1005, 665, 1040], { label: 'COMPOUNDING' }),
  ob('autoclave', 'g', [830, 785, 876, 830], { label: 'AUTOCLAVE' }),
  ob('crate', 'g', [600, 880, 624, 900]),
  // X-ray: the machine, a lead partition and the controls
  ob('xray', 'g', [860, 1340, 1000, 1420], { label: 'X-RAY' }),
  ob('wall', 'g', [960, 1525, 1078, 1535]),
  ob('xrayControls', 'g', [1000, 1540, 1075, 1570], { label: 'CONTROLS' }),
  ob('crate', 'g', [830, 1450, 854, 1470]),
  ob('cabinet', 'g', [1020, 1208, 1078, 1258]), // janitor's closet
  // Egress: the stairwell (stairs themselves are walkable; they're the way up)
  ob('wall', 'g', [1140, 1195, 1150, 1470]),

  // ───── UPSTAIRS ─────
  ob('railing', 'u', [245, 925, 560, 1492]), ob('railing', 'u', [560, 1060, 712, 1492]),
  ob('counter', 'u', [672, 780, 728, 948]), ob('counter', 'u', [775, 785, 938, 822]), ob('counter', 'u', [672, 905, 930, 950]),
  ob('elevator', 'u', [712, 1222, 822, 1350], { label: 'ELEVATOR' }),
  ob('cabinet', 'u', [712, 1350, 822, 1492]),
  ob('cabinet', 'u', [1072, 1062, 1128, 1200]), // supply closet 3 / janitor
  ...[[245, 400], [500, 400], [700, 400], [880, 400]].map(([x, y]) => ob('examTable', 'u', [x, y + 40, x + 30, y + 120])),
  ...[[405, 390], [440, 390], [615, 390], [955, 390]].map(([x, y]) => ob('cabinet', 'u', [x, y, x + 25, y + 50])),
  ob('examTable', 'u', [1130, 600, 1210, 630]), ob('examTable', 'u', [1120, 870, 1200, 900]),
  ob('examTable', 'u', [1060, 1380, 1140, 1410]), ob('examTable', 'u', [880, 1380, 960, 1410]),
  ob('crate', 'u', [560, 560, 584, 580]), ob('crate', 'u', [1200, 680, 1224, 700]), ob('crate', 'u', [930, 1300, 954, 1320]),
  ob('supplyCart', 'u', [832, 1028, 860, 1046], { label: 'SUPPLIES' }),
  ob('stall', 'u', [250, 650, 300, 720]), ob('sink', 'u', [250, 740, 320, 770]),
  ob('stall', 'u', [835, 1150, 880, 1215]), ob('sink', 'u', [835, 1070, 900, 1092]),
  ob('handDryer', 'u', [310, 644, 348, 656]), ob('handDryer', 'u', [828, 1100, 840, 1138]),
];

/** The two staircases. The west stairs are the way up; the egress stairs join once both ends are open. */
const STAIRS: Stairway[] = [
  {
    id: 'westStairs',
    a: { zone: box('g', [290, 895, 400, 972]), arrive: pt('u', 330, 860) },
    b: { zone: box('u', [250, 790, 285, 920]), arrive: pt('g', 300, 1065) },
    requires: ['upstairs'],
  },
  {
    id: 'egressStairs',
    a: { zone: box('g', [1160, 1200, 1240, 1460]), arrive: pt('u', 1100, 1030) },
    b: { zone: box('u', [1132, 1062, 1190, 1300]), arrive: pt('g', 1115, 1300) },
    requires: ['egress', 'upstairs'],
  },
];

// ───────── Build walls, doors and rooms ─────────

function sideRect(r: Rect, side: Side): Rect {
  switch (side) {
    case 'n': return { x: r.x, y: r.y, w: r.w, h: T };
    case 's': return { x: r.x, y: r.y + r.h - T, w: r.w, h: T };
    case 'w': return { x: r.x, y: r.y, w: T, h: r.h };
    case 'e': return { x: r.x + r.w - T, y: r.y, w: T, h: r.h };
  }
}

/** The opening of a door in a room's wall (a little thicker than the wall so it cuts neighbours' walls too). */
function doorRect(r: Rect, f: Floor, d: { side: Side; at: number; w?: number }): Rect {
  const w = d.w ?? DOOR_W;
  const pad = T;
  if (d.side === 'n' || d.side === 's') {
    const cx = X(f, d.at);
    const y = d.side === 'n' ? r.y : r.y + r.h - T;
    return { x: cx - w / 2, y: y - pad, w, h: T + pad * 2 };
  }
  const cy = fy(d.at);
  const x = d.side === 'w' ? r.x : r.x + r.w - T;
  return { x: x - pad, y: cy - w / 2, w: T + pad * 2, h: w };
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Cuts `hole` out of a thin wall, along its long axis. */
function cut(wall: Rect, hole: Rect): Rect[] {
  if (!overlaps(wall, hole)) return [wall];
  const horizontal = wall.w >= wall.h;
  const out: Rect[] = [];
  if (horizontal) {
    if (hole.x > wall.x) out.push({ ...wall, w: hole.x - wall.x });
    const end = hole.x + hole.w;
    if (end < wall.x + wall.w) out.push({ ...wall, x: end, w: wall.x + wall.w - end });
  } else {
    if (hole.y > wall.y) out.push({ ...wall, h: hole.y - wall.y });
    const end = hole.y + hole.h;
    if (end < wall.y + wall.h) out.push({ ...wall, y: end, h: wall.y + wall.h - end });
  }
  return out;
}

function build(): RoomLayout {
  let walls: Rect[] = [];
  const holes: Rect[] = [];
  const obstacles: Obstacle[] = [];
  const rooms: RoomArea[] = [];
  const curtains: Rect[] = [];

  // Outer walls of each floor, plus the solid gap between the floors
  for (const f of ['g', 'u'] as Floor[]) {
    const r = box(f, OUTLINE[f]);
    for (const s of ['n', 's', 'e', 'w'] as Side[]) walls.push(sideRect(r, s));
  }
  walls.push({ x: GROUND_W, y: 0, w: U0.x - GROUND_W, h: H });

  for (const spec of ROOMS) {
    const parts = spec.boxes.map((b) => box(spec.floor, b));
    const main = parts[0];
    if (spec.walled !== false) for (const s of ['n', 's', 'e', 'w'] as Side[]) walls.push(sideRect(main, s));
    for (const d of spec.doors ?? []) {
      const hole = doorRect(main, spec.floor, d);
      holes.push(hole);
      // The door itself: a solid, buyable obstacle sitting in the wall gap
      const wallPart = sideRect(main, d.side);
      const w = d.w ?? DOOR_W;
      const door: Rect = d.side === 'n' || d.side === 's'
        ? { x: hole.x, y: wallPart.y, w, h: T }
        : { x: wallPart.x, y: hole.y, w: T, h: w };
      obstacles.push({ kind: 'door', ...door, label: spec.name.toUpperCase(), opens: spec.id, cost: spec.cost ?? 0 });
      if (spec.id.startsWith('exam')) curtains.push(door);
    }
    parts.forEach((p, i) => rooms.push({
      id: spec.id, name: spec.name, ...p, start: spec.start, tint: spec.tint,
      germSpawns: i === 0 ? (spec.spawns ?? []).map(([px, py]) => pt(spec.floor, px, py)) : [],
    }));
  }

  for (const gate of GATES) {
    const r = box(gate.floor, gate.box);
    const g = r.w >= r.h ? { ...r, y: r.y + r.h / 2 - T / 2, h: T } : { ...r, x: r.x + r.w / 2 - T / 2, w: T };
    obstacles.push({ kind: 'door', ...g, label: gate.label, opens: gate.opens, cost: COSTS[gate.opens] });
  }
  // The waiting room's stair alcove is walled off from the west hallway passage
  walls.push(box('g', [405, 885, 415, 1099]));
  // Upstairs is bought at the bottom of the west stairs
  const up = STAIRS[0].a.zone;
  obstacles.push({ kind: 'door', x: up.x, y: up.y, w: up.w, h: up.h, label: 'UPSTAIRS', opens: 'upstairs', cost: COSTS.upstairs });

  for (const d of OUTER_DOORS) {
    const r = box(d.floor, OUTLINE[d.floor]);
    const hole = doorRect(r, d.floor, d);
    holes.push(hole);
    const wallPart = sideRect(r, d.side);
    const door = d.side === 'n' || d.side === 's' ? { x: hole.x, y: wallPart.y, w: d.w, h: T } : { x: wallPart.x, y: hole.y, w: T, h: d.w };
    obstacles.push({ kind: 'door', ...door, label: d.label });
  }

  for (const hole of holes) walls = walls.flatMap((w) => cut(w, hole));
  // Smaller rooms first, so "which room is Eugene in" finds the office before the big waiting room around it
  rooms.sort((a, b) => a.w * a.h - b.w * b.h);
  return {
    id: 'moshiland', name: 'MoshiLand Urgent Care',
    width: U0.x + UP_W, height: H,
    playerSpawn: pt('g', 300, 1290),
    exit: pt('g', 545, 1585),
    signs: [
      { ...pt('g', 545, 1500), text: 'SEATING: 26' },
      { ...pt('g', 290, 1270), text: 'PLEASE SANITIZE YOUR HANDS' },
      { ...pt('u', 380, 1200), text: 'OPEN TO BELOW' },
    ],
    rooms,
    obstacles: [...walls.map((w) => ({ kind: 'wall' as const, ...w })), ...obstacles, ...FURNITURE],
    floors: [
      { id: 'ground', name: 'Ground Floor', x: 0, y: 0, w: GROUND_W, h: H },
      { id: 'up', name: 'Upstairs', x: U0.x, y: 0, w: UP_W, h: fy(OUTLINE.u[3]) + 40 },
    ] satisfies FloorArea[],
    stairs: STAIRS,
    curtains,
    fromPlan: (floor, px, py) => pt(floor === 'up' ? 'u' : 'g', px, py),
  };
}

export const CLINIC: RoomLayout = build();
