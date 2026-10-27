import type Phaser from 'phaser';
import { COLORS } from '../config/theme';

/**
 * Held-tool art. Each tool is drawn in the doctor's 96x96 frame, top-down facing +x, gripped in the
 * right hand at (78, 66) (the left hand is at (68, 24)). The player lays it over the doctor (see Player).
 */

const O = 0x1b2b30;

/** Texture key for a tool's held sprite. */
export function toolTexture(id: string): string {
  return `tool-${id}`;
}

/** Where each tool's spray or zap comes out, in the same 96x96 frame. Unlisted tools use the bottle's. */
export const TOOL_MUZZLE: Record<string, { x: number; y: number }> = {
  squirtBottle: { x: 94, y: 63 },
  lysolFogger: { x: 95, y: 76 },
  bleachSoaker: { x: 96, y: 71 },
  uvWand: { x: 96, y: 66 },
  peroxideFoamer: { x: 95, y: 66 },
  wipes: { x: 92, y: 64 },
  gelLauncher: { x: 96, y: 67 },
  defib: { x: 90, y: 46 },
  ionizer9000: { x: 96, y: 68 },
};

const DRAW: Record<string, (g: Phaser.GameObjects.Graphics) => void> = {
  /** White squirt bottle with a red trigger, like the title poster. */
  squirtBottle: (g) => {
    g.lineStyle(3, O);
    g.fillStyle(COLORS.bottle).fillRoundedRect(76, 70, 14, 20, 4).strokeRoundedRect(76, 70, 14, 20, 4);
    g.fillStyle(COLORS.bottleCap).fillRect(79, 64, 8, 7).strokeRect(79, 64, 8, 7);
    g.fillStyle(COLORS.bottleCap).fillTriangle(87, 65, 94, 67, 87, 69);
  },

  /** A fat blue aerosol can with a white label and a grey spray cap. */
  lysolFogger: (g) => {
    g.lineStyle(3, O);
    g.fillStyle(0x2f6fd0).fillRoundedRect(64, 68, 26, 17, 6).strokeRoundedRect(64, 68, 26, 17, 6);
    g.fillStyle(0xf4f6f8).fillRect(71, 69, 9, 15);
    g.fillStyle(0x7cc576).fillCircle(75.5, 76.5, 3);
    g.fillStyle(0xcfd8dc).lineStyle(2, O).fillRoundedRect(88, 70, 7, 13, 2).strokeRoundedRect(88, 70, 7, 13, 2);
    g.fillStyle(O).fillCircle(94, 76.5, 1.5);
  },

  /** A long orange water gun: tank on its back, green pump grip, yellow nozzle. */
  bleachSoaker: (g) => {
    g.lineStyle(3, O);
    g.fillStyle(0xff8f1f).fillRoundedRect(50, 66, 14, 9, 3).strokeRoundedRect(50, 66, 14, 9, 3);
    g.fillStyle(0xfff6c2).fillCircle(60, 80, 9).strokeCircle(60, 80, 9);
    g.fillStyle(0xffffff, 0.8).fillCircle(57, 77, 3);
    g.fillStyle(0xff8f1f).fillRoundedRect(60, 65, 30, 11, 4).strokeRoundedRect(60, 65, 30, 11, 4);
    g.fillStyle(0x43c463).fillRoundedRect(74, 75, 11, 7, 3).strokeRoundedRect(74, 75, 11, 7, 3);
    g.fillStyle(0xffd23f).lineStyle(2, O).fillRoundedRect(88, 67, 8, 7, 2).strokeRoundedRect(88, 67, 8, 7, 2);
  },

  /** A black grip with a glowing purple tube. */
  uvWand: (g) => {
    g.fillStyle(0xb388ff, 0.35).fillRoundedRect(81, 57, 15, 18, 8);
    g.lineStyle(3, O).fillStyle(0x37474f).fillRoundedRect(66, 62, 18, 8, 3).strokeRoundedRect(66, 62, 18, 8, 3);
    g.fillStyle(0xffeb3b).fillCircle(71, 66, 1.6);
    g.fillStyle(0xe9dcff).lineStyle(2, 0x7c4dff).fillRoundedRect(83, 62, 12, 8, 4).strokeRoundedRect(83, 62, 12, 8, 4);
  },

  /** A brown peroxide bottle with a white foaming pump. */
  peroxideFoamer: (g) => {
    g.lineStyle(3, O);
    g.fillStyle(0x6d3b1e).fillRoundedRect(73, 70, 17, 21, 5).strokeRoundedRect(73, 70, 17, 21, 5);
    g.fillStyle(0xf4f6f8).fillRect(76, 76, 11, 9);
    g.fillStyle(0xf4f6f8).lineStyle(2, O).fillRoundedRect(77, 61, 10, 9, 2).strokeRoundedRect(77, 61, 10, 9, 2)
      .fillRoundedRect(86, 63, 8, 5, 2).strokeRoundedRect(86, 63, 8, 5, 2);
    g.fillStyle(0xffffff).fillCircle(95, 64, 2).fillCircle(94, 68, 1.5);
  },

  /** A canister of wipes with a teal lid, one wipe pulled out and flapping forward. */
  wipes: (g) => {
    g.lineStyle(3, O);
    g.fillStyle(0xf4f6f8).fillCircle(74, 80, 11).strokeCircle(74, 80, 11);
    g.fillStyle(0x26a69a).fillCircle(74, 80, 7);
    g.fillStyle(0xe8fff9).lineStyle(2, 0x7fbfb3).fillPoints([
      { x: 76, y: 62 }, { x: 84, y: 56 }, { x: 90, y: 59 }, { x: 94, y: 56 }, { x: 93, y: 70 }, { x: 88, y: 72 }, { x: 82, y: 70 }, { x: 76, y: 72 },
    ], true).strokePoints([
      { x: 76, y: 62 }, { x: 84, y: 56 }, { x: 90, y: 59 }, { x: 94, y: 56 }, { x: 93, y: 70 }, { x: 88, y: 72 }, { x: 82, y: 70 }, { x: 76, y: 72 },
    ], true);
  },

  /** A chunky teal launcher tube with a sanitizer pump bottle loaded on the side and gel in the muzzle. */
  gelLauncher: (g) => {
    g.lineStyle(3, O);
    g.fillStyle(0x80deea).fillRoundedRect(64, 73, 12, 15, 3).strokeRoundedRect(64, 73, 12, 15, 3);
    g.fillStyle(0xf4f6f8).fillCircle(70, 80, 3);
    g.fillStyle(0x00838f).fillRoundedRect(58, 59, 36, 15, 5).strokeRoundedRect(58, 59, 36, 15, 5);
    g.fillStyle(0x26c6da).fillRect(62, 61, 26, 4);
    g.fillStyle(0x263238).fillRoundedRect(90, 57, 6, 19, 2);
    g.fillStyle(0xb2ebf2).fillCircle(93, 66.5, 4);
  },

  /** A paddle in each hand, yellow handles, coiled cords running back, a spark between them. */
  defib: (g) => {
    // Coiled cords off the handles, out to the sides (away from his head)
    g.lineStyle(2, 0x263238);
    for (const [x0, y0, dir] of [[68, 20, -1], [76, 71, 1]]) {
      g.beginPath().moveTo(x0, y0);
      for (let i = 1; i <= 5; i++) g.lineTo(x0 - i * 3 + (i % 2 ? 3 : -3), y0 + dir * i * 3);
      g.strokePath();
    }
    g.lineStyle(3, O);
    g.fillStyle(0xffc107).fillRoundedRect(64, 19, 12, 10, 3).strokeRoundedRect(64, 19, 12, 10, 3)
      .fillRoundedRect(72, 61, 12, 10, 3).strokeRoundedRect(72, 61, 12, 10, 3);
    g.fillStyle(0x455a64).fillRoundedRect(74, 14, 9, 20, 3).strokeRoundedRect(74, 14, 9, 20, 3)
      .fillRoundedRect(82, 56, 9, 20, 3).strokeRoundedRect(82, 56, 9, 20, 3);
    g.fillStyle(0xcfd8dc).fillRect(81, 16, 2, 16).fillRect(89, 58, 2, 16);
    g.lineStyle(2, 0x7fd3ff).beginPath().moveTo(84, 34).lineTo(89, 40).lineTo(85, 46).lineTo(90, 52).lineTo(87, 56).strokePath();
  },

  /** The Ionizer 9000: a chrome retro ray gun with magenta rings and a glowing bulb. */
  ionizer9000: (g) => {
    g.lineStyle(3, O);
    g.fillStyle(0x8e24aa).fillTriangle(66, 62, 74, 54, 76, 62).strokeTriangle(66, 62, 74, 54, 76, 62);
    g.fillStyle(0xcfd8dc).fillRoundedRect(60, 62, 28, 13, 6).strokeRoundedRect(60, 62, 28, 13, 6);
    g.fillStyle(0xffffff, 0.7).fillRect(64, 64, 20, 2);
    g.fillStyle(0xe040fb).fillRect(69, 62, 3, 13).fillRect(76, 62, 3, 13);
    g.fillStyle(0xe040fb, 0.35).fillCircle(90, 68.5, 7);
    g.fillStyle(0xf8bbff).lineStyle(2, O).fillCircle(90, 68.5, 5).strokeCircle(90, 68.5, 5);
  },
};

/** Draws tool `id` into `g` (the squirt bottle if it has no art of its own). */
export function drawTool(g: Phaser.GameObjects.Graphics, id: string): void {
  if (id === 'medication') {
    g.fillStyle(0xf9f1e8).lineStyle(2,O).fillRoundedRect(76,57,17,17,4).strokeRoundedRect(76,57,17,17,4);
    g.fillStyle(0xc58ac9).fillRect(79,58,11,5); return;
  }
  (DRAW[id] ?? DRAW.squirtBottle)(g);
}
