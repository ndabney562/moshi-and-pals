import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import { GERMS, type GermDef } from '../data/germs';
import { VIOLATIONS, type ViolationDef } from '../data/patients';

/**
 * Creates placeholder textures in code so the prototype needs no image files.
 * When real art arrives, this scene becomes a loader for files in public/assets/.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeEugene();
    this.makeFloorTile();
    this.makeShadow();
    for (const def of Object.values(GERMS)) this.makeGerm(def);
    for (const def of VIOLATIONS) this.makePatient(def);
    this.makeDroplet();
    this.makeSplat();
    this.scene.start('Title');
  }

  /**
   * Top-down Eugene facing right (+x). 96x96, centered.
   * Based on Noah's description: stocky, thinning grey hair, glasses,
   * white lab coat over a dark scrub top.
   */
  private makeEugene(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;

    // Right arm reaching forward holding the squirt bottle (his right side is +y when facing +x)
    g.fillStyle(COLORS.coat).lineStyle(3, outline).fillRoundedRect(46, 60, 30, 13, 6).strokeRoundedRect(46, 60, 30, 13, 6);
    g.fillStyle(COLORS.skin).fillCircle(78, 66, 6).strokeCircle(78, 66, 6);
    // Squirt bottle: body, cap, nozzle
    g.fillStyle(COLORS.bottle).fillRoundedRect(76, 70, 14, 20, 4).strokeRoundedRect(76, 70, 14, 20, 4);
    g.fillStyle(COLORS.bottleCap).fillRect(79, 64, 8, 7).strokeRect(79, 64, 8, 7);
    g.fillStyle(COLORS.bottleCap).fillTriangle(87, 65, 94, 67, 87, 69);

    // Left arm, slightly forward
    g.fillStyle(COLORS.coat).fillRoundedRect(44, 18, 22, 13, 6).strokeRoundedRect(44, 18, 22, 13, 6);
    g.fillStyle(COLORS.skin).fillCircle(68, 24, 6).strokeCircle(68, 24, 6);

    // Lab coat over broad, stocky shoulders
    g.fillStyle(COLORS.coat).fillEllipse(41, 46, 46, 78).strokeEllipse(41, 46, 46, 78);
    g.fillStyle(COLORS.coatShadow).fillEllipse(34, 46, 20, 58);
    // Dark scrub top showing at the collar
    g.fillStyle(COLORS.scrubs).fillCircle(49, 46, 20).fillEllipse(58, 46, 22, 26);

    // Head
    g.fillStyle(COLORS.skin).fillCircle(48, 46, 15).strokeCircle(48, 46, 15);
    // Thinning grey hair: a fringe around the back and sides, bald on top
    g.fillStyle(COLORS.hair).beginPath()
      .slice(48, 46, 15, Phaser.Math.DegToRad(70), Phaser.Math.DegToRad(290), false).fillPath();
    g.fillStyle(COLORS.skinTop).fillCircle(50, 46, 9.5);
    g.fillStyle(COLORS.skin, 0.6).fillCircle(52, 44, 4);
    // A few heroic surviving strands
    g.lineStyle(2, COLORS.hairStrand).lineBetween(42, 42, 54, 40).lineBetween(42, 47, 55, 46).lineBetween(43, 51, 53, 52);
    g.lineStyle(3, outline).strokeCircle(48, 46, 15);

    // Big confident nose leading the way (important for later sinus business)
    g.fillStyle(COLORS.skin).fillEllipse(65, 46, 12, 9).strokeEllipse(65, 46, 12, 9);
    // Glasses: lenses in front of the face, arms running back along the head
    g.lineStyle(2, COLORS.glasses);
    g.lineBetween(60, 35, 50, 33).lineBetween(60, 57, 50, 59);
    g.fillStyle(COLORS.lens, 0.85).fillRoundedRect(58, 34, 6, 9, 2).fillRoundedRect(58, 49, 6, 9, 2);
    g.strokeRoundedRect(58, 34, 6, 9, 2).strokeRoundedRect(58, 49, 6, 9, 2);
    g.lineBetween(61, 43, 61, 49);

    g.generateTexture('eugene', 96, 96);
    g.destroy();
  }

  /** Two-tone clinic linoleum, tiled across the floor. */
  private makeFloorTile(): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.floorA).fillRect(0, 0, 64, 64);
    g.fillStyle(COLORS.floorB).fillRect(0, 0, 32, 32).fillRect(32, 32, 32, 32);
    g.lineStyle(1, 0xb5c7c0, 0.8).strokeRect(0, 0, 64, 64);
    g.generateTexture('floor', 64, 64);
    g.destroy();
  }

  private makeShadow(): void {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.22).fillEllipse(32, 16, 60, 28);
    g.generateTexture('shadow', 64, 32);
    g.destroy();
  }

  /** A round, smug little microbe with googly eyes. Texture key: germ-<id>. */
  private makeGerm(def: GermDef): void {
    const r = def.radius;
    const size = (r + 10) * 2;
    const c = size / 2;
    if (def.shape === 'paper') {
      this.makePaperGerm(def);
      return;
    }
    if (def.look === 'manager') {
      this.makeManagerMonster(def);
      return;
    }
    const g = this.add.graphics();
    if (def.shape === 'spiky') {
      // Virus spikes: little triangles all the way round
      g.fillStyle(def.outline);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const w = 0.22;
        g.fillTriangle(
          c + Math.cos(a - w) * r * 0.9, c + Math.sin(a - w) * r * 0.9,
          c + Math.cos(a + w) * r * 0.9, c + Math.sin(a + w) * r * 0.9,
          c + Math.cos(a) * (r + 9), c + Math.sin(a) * (r + 9),
        );
      }
    } else {
      // Cilia around the edge
      g.lineStyle(def.boss ? 5 : 3, def.outline);
      const n = def.boss ? 20 : 12;
      const len = def.boss ? 9 : 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.lineBetween(c + Math.cos(a) * r, c + Math.sin(a) * r, c + Math.cos(a) * (r + len), c + Math.sin(a) * (r + len));
      }
    }
    // Body with lighter belly spots
    g.fillStyle(def.color).fillCircle(c, c, r);
    g.lineStyle(3, def.outline).strokeCircle(c, c, r);
    g.fillStyle(0xffffff, 0.25).fillCircle(c - r * 0.35, c - r * 0.35, r * 0.3);
    g.fillStyle(def.outline, 0.35).fillCircle(c + r * 0.4, c + r * 0.45, r * 0.15).fillCircle(c - r * 0.45, c + r * 0.3, r * 0.1);
    // Eyes facing right (+x), the direction it moves
    for (const dy of [-0.32, 0.32]) {
      g.fillStyle(0xffffff).fillCircle(c + r * 0.38, c + r * dy, r * 0.27);
      g.fillStyle(0x111111).fillCircle(c + r * 0.48, c + r * dy, r * 0.13);
    }
    // Grin (bosses scowl)
    if (def.boss) {
      g.lineStyle(4, def.outline).lineBetween(c + r * 0.15, c - r * 0.55, c + r * 0.5, c - r * 0.2)
        .lineBetween(c + r * 0.15, c + r * 0.55, c + r * 0.5, c + r * 0.2);
    }
    g.lineStyle(def.boss ? 4 : 2, def.outline).beginPath()
      .arc(c + r * 0.2, c, r * 0.55, Phaser.Math.DegToRad(-30), Phaser.Math.DegToRad(30)).strokePath();
    g.generateTexture(`germ-${def.id}`, size, size);
    g.destroy();
  }

  /**
   * Diamond: a big, slimy germ monster in the style of cold-medicine ad
   * creatures. Stubby arms (one holding her clipboard), a bun with a pencil,
   * furious eyebrows, a toothy scowl, and a lanyard with a Trinidad and Tobago
   * flag pin. Faces right (+x) like every germ.
   */
  private makeManagerMonster(def: GermDef): void {
    const r = def.radius;
    const size = (r + 14) * 2;
    const c = size / 2;
    const ink = def.outline;
    const g = this.add.graphics();

    // Stubby arms out to the sides, reaching forward
    g.fillStyle(def.color).fillEllipse(c + r * 0.35, c - r * 0.95, r * 0.7, r * 0.42).fillEllipse(c + r * 0.35, c + r * 0.95, r * 0.7, r * 0.42);
    g.lineStyle(3, ink).strokeEllipse(c + r * 0.35, c - r * 0.95, r * 0.7, r * 0.42).strokeEllipse(c + r * 0.35, c + r * 0.95, r * 0.7, r * 0.42);

    // Lumpy, slimy body: a ring of bumps under the main blob
    g.fillStyle(def.color);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.fillCircle(c + Math.cos(a) * r * 0.86, c + Math.sin(a) * r * 0.86, r * 0.26);
    }
    g.fillCircle(c, c, r * 0.95);
    g.lineStyle(3, ink);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.beginPath().arc(c + Math.cos(a) * r * 0.86, c + Math.sin(a) * r * 0.86, r * 0.26, a - 1.1, a + 1.1, false).strokePath();
    }
    // Slime shine and drips
    g.fillStyle(0xffffff, 0.3).fillEllipse(c - r * 0.3, c - r * 0.35, r * 0.5, r * 0.3);
    g.fillStyle(0x000000, 0.12).fillCircle(c - r * 0.5, c + r * 0.4, r * 0.14).fillCircle(c - r * 0.1, c + r * 0.6, r * 0.09);

    // Hair cap and bun on the back of the head, pencil through the bun
    const hair = 0x2a1a12;
    g.fillStyle(hair).slice(c, c, r * 0.8, Math.PI - 1.1, Math.PI + 1.1, false).fillPath();
    g.fillStyle(hair).fillCircle(c - r * 0.8, c, r * 0.28);
    g.lineStyle(2, 0x5a3a26).strokeCircle(c - r * 0.8, c, r * 0.17);
    g.lineStyle(4, 0xffc93c).lineBetween(c - r * 1.05, c - r * 0.3, c - r * 0.55, c + r * 0.3);

    // Lanyard with a Trinidad and Tobago flag pin
    g.lineStyle(3, 0x222222).beginPath().arc(c, c, r * 0.62, -1.0, 1.0, false).strokePath();
    const fx = c + r * 0.12, fy = c + r * 0.5, fw = r * 0.34, fh = r * 0.22;
    g.fillStyle(0xce1126).fillRect(fx, fy, fw, fh);
    g.lineStyle(fh * 0.5, 0xffffff).lineBetween(fx, fy, fx + fw, fy + fh);
    g.lineStyle(fh * 0.3, 0x000000).lineBetween(fx, fy, fx + fw, fy + fh);
    g.lineStyle(1.5, ink).strokeRect(fx, fy, fw, fh);

    // Eyes and furious eyebrows
    for (const dy of [-0.3, 0.3]) {
      g.fillStyle(0xffffff).fillCircle(c + r * 0.42, c + r * dy, r * 0.2);
      g.fillStyle(0x111111).fillCircle(c + r * 0.5, c + r * dy, r * 0.1);
    }
    g.lineStyle(r / 9, hair);
    g.lineBetween(c + r * 0.18, c - r * 0.55, c + r * 0.6, c - r * 0.16);
    g.lineBetween(c + r * 0.18, c + r * 0.55, c + r * 0.6, c + r * 0.16);

    // Big toothy scowl across the front
    g.fillStyle(0x3a0f1f).fillEllipse(c + r * 0.78, c, r * 0.22, r * 0.62);
    g.fillStyle(0xffffff);
    for (const ty of [-0.2, 0, 0.2]) g.fillRect(c + r * 0.7, c + r * ty - r * 0.07, r * 0.09, r * 0.14);
    g.lineStyle(2, ink).strokeEllipse(c + r * 0.78, c, r * 0.22, r * 0.62);

    // Clipboard in the right hand
    const bx = c + r * 0.55, by = c + r * 0.8;
    g.fillStyle(0x8b5a2b).fillRoundedRect(bx, by, r * 0.5, r * 0.36, 3);
    g.fillStyle(0xffffff).fillRect(bx + r * 0.05, by + r * 0.05, r * 0.4, r * 0.26);
    g.lineStyle(2, 0x999999).lineBetween(bx + r * 0.1, by + r * 0.13, bx + r * 0.38, by + r * 0.13)
      .lineBetween(bx + r * 0.1, by + r * 0.22, bx + r * 0.3, by + r * 0.22);

    g.generateTexture(`germ-${def.id}`, size, size);
    g.destroy();
  }

  /** A crumpled pink slip with angry eyes. */
  private makePaperGerm(def: GermDef): void {
    const r = def.radius;
    const size = (r + 10) * 2;
    const c = size / 2;
    const g = this.add.graphics();
    g.fillStyle(def.color).fillRect(c - r, c - r * 1.1, r * 2, r * 2.2);
    g.lineStyle(2, def.outline).strokeRect(c - r, c - r * 1.1, r * 2, r * 2.2);
    g.lineStyle(1.5, def.outline, 0.5);
    for (const dy of [-0.5, -0.1, 0.3, 0.7]) g.lineBetween(c - r * 0.8, c + r * dy, c - r * 0.1, c + r * dy);
    for (const dy of [-0.35, 0.35]) {
      g.fillStyle(0xffffff).fillCircle(c + r * 0.4, c + r * dy, r * 0.28);
      g.fillStyle(0x111111).fillCircle(c + r * 0.5, c + r * dy, r * 0.14);
    }
    g.lineStyle(2, def.outline).lineBetween(c + r * 0.1, c - r * 0.75, c + r * 0.6, c - r * 0.5)
      .lineBetween(c + r * 0.1, c + r * 0.75, c + r * 0.6, c + r * 0.5);
    g.generateTexture(`germ-${def.id}`, size, size);
    g.destroy();
  }

  /** A patient seen from above, facing right (+x): shoulders, head, hair. Texture key: patient-<id>. */
  private makePatient(def: ViolationDef): void {
    const g = this.add.graphics();
    const c = 32;
    const outline = 0x1b2b30;
    // Shoulders and arms
    g.fillStyle(def.shirt).fillEllipse(c - 2, c, 30, 52);
    g.lineStyle(2, outline).strokeEllipse(c - 2, c, 30, 52);
    g.fillStyle(COLORS.skin).fillCircle(c + 8, c - 22, 6).fillCircle(c + 8, c + 22, 6);
    // Head with hair on the back half
    g.fillStyle(COLORS.skin).fillCircle(c + 2, c, 13);
    g.fillStyle(def.hair).slice(c + 2, c, 13, Math.PI / 2, Math.PI * 1.5, false).fillPath();
    g.lineStyle(2, outline).strokeCircle(c + 2, c, 13);
    // Nose
    g.fillStyle(COLORS.skin).fillCircle(c + 15, c, 3);
    if (def.id === 'chinMask') g.fillStyle(0x9ad1f5).fillRect(c + 9, c - 8, 5, 16);
    g.generateTexture(`patient-${def.id}`, 64, 64);
    g.destroy();
  }

  private makeDroplet(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.35).fillCircle(8, 8, 8);
    g.fillStyle(0xffffff).fillCircle(8, 8, 4.5);
    g.generateTexture('droplet', 16, 16);
    g.destroy();
  }

  /** Generic soft blob used for splats and mist; tinted at runtime. */
  private makeSplat(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff).fillCircle(8, 8, 8);
    g.generateTexture('blob', 16, 16);
    g.destroy();
  }
}
