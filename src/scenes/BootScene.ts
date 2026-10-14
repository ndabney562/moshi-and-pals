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

  preload(): void {
    // Noah's title art (Moshi and Pals poster)
    this.load.image('title-art', 'assets/title.jpg');
  }

  create(): void {
    this.makeEugene();
    this.makeKaya();
    this.makeLucien();
    this.makeFloorTile();
    this.makeShadow();
    for (const def of Object.values(GERMS)) this.makeGerm(def);
    for (const def of VIOLATIONS) this.makePatient(def);
    this.makeDroplet();
    this.makeSplat();
    this.makePuff();
    this.makeHalo();
    this.makeArrow();
    this.makeGlob();
    this.makeEliteRing();
    this.makePill();
    this.scene.start('Title');
  }

  /**
   * Top-down Eugene facing right (+x). 96x96, centered.
   * Matches Noah's title poster: messy brown-grey hair, blue surgical mask,
   * stethoscope, white lab coat over navy scrubs, white spray bottle.
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
    // Dark scrub top showing at the collar, stethoscope around the neck
    g.fillStyle(COLORS.scrubs).fillCircle(49, 46, 20).fillEllipse(58, 46, 22, 26);
    g.lineStyle(3, COLORS.stethoscope).beginPath()
      .arc(48, 46, 19, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false).strokePath();
    g.fillStyle(COLORS.coatShadow).fillCircle(66, 58, 3.5);

    // Messy spiky hair sticking out past his head every which way
    const spikes: [number, number][] = [[24, 34], [22, 46], [24, 58], [31, 67], [31, 25], [41, 20], [41, 72], [52, 22], [52, 70]];
    g.fillStyle(COLORS.hair).lineStyle(2, outline);
    for (const [tx, ty] of spikes) {
      const a = Math.atan2(ty - 46, tx - 48) + Math.PI / 2;
      const bx = 48 + (tx - 48) * 0.45;
      const by = 46 + (ty - 46) * 0.45;
      const pts = [bx + Math.cos(a) * 6, by + Math.sin(a) * 6, bx - Math.cos(a) * 6, by - Math.sin(a) * 6, tx, ty];
      g.fillTriangle(...(pts as [number, number, number, number, number, number]));
      g.strokeTriangle(...(pts as [number, number, number, number, number, number]));
    }

    // Head, with hair over the back and sides, thinner at the front
    g.fillStyle(COLORS.skin).fillCircle(48, 46, 15);
    g.fillStyle(COLORS.hair).beginPath()
      .slice(48, 46, 15, Phaser.Math.DegToRad(60), Phaser.Math.DegToRad(300), false).fillPath();
    g.fillCircle(42, 46, 13);
    g.fillStyle(COLORS.skinTop).fillEllipse(54, 46, 8, 12);
    g.lineStyle(2, COLORS.hairStrand).lineBetween(36, 40, 47, 38).lineBetween(35, 47, 47, 46).lineBetween(37, 53, 47, 54);
    g.lineStyle(3, outline).beginPath()
      .arc(48, 46, 15, Phaser.Math.DegToRad(-62), Phaser.Math.DegToRad(62), false).strokePath();

    // Blue surgical mask over his nose and mouth, ear loops running back
    g.lineStyle(1.5, COLORS.maskFold).lineBetween(58, 35, 47, 32).lineBetween(58, 57, 47, 60);
    g.fillStyle(COLORS.mask).lineStyle(2, outline).fillRoundedRect(57, 34, 11, 24, 4).strokeRoundedRect(57, 34, 11, 24, 4);
    g.lineStyle(1.5, COLORS.maskFold).lineBetween(60, 38, 60, 54).lineBetween(64, 38, 64, 54);

    g.generateTexture('eugene', 96, 96);
    g.destroy();
  }

  /** Two-tone clinic linoleum, tiled across the floor. */
  /** The parts every doctor shares, seen from above facing +x: arms (one holding the bottle) and the lab coat. */
  private drawDoctorBody(g: Phaser.GameObjects.Graphics, skin: number, under: number, coatW: number): void {
    const outline = 0x1b2b30;
    g.fillStyle(COLORS.coat).lineStyle(3, outline).fillRoundedRect(46, 60, 30, 13, 6).strokeRoundedRect(46, 60, 30, 13, 6);
    g.fillStyle(skin).fillCircle(78, 66, 6).strokeCircle(78, 66, 6);
    g.fillStyle(COLORS.bottle).fillRoundedRect(76, 70, 14, 20, 4).strokeRoundedRect(76, 70, 14, 20, 4);
    g.fillStyle(COLORS.bottleCap).fillRect(79, 64, 8, 7).strokeRect(79, 64, 8, 7);
    g.fillStyle(COLORS.bottleCap).fillTriangle(87, 65, 94, 67, 87, 69);
    g.fillStyle(COLORS.coat).fillRoundedRect(44, 18, 22, 13, 6).strokeRoundedRect(44, 18, 22, 13, 6);
    g.fillStyle(skin).fillCircle(68, 24, 6).strokeCircle(68, 24, 6);
    g.fillStyle(COLORS.coat).fillEllipse(41, 46, coatW, 78).strokeEllipse(41, 46, coatW, 78);
    g.fillStyle(COLORS.coatShadow).fillEllipse(34, 46, coatW * 0.43, 58);
    g.fillStyle(under).fillCircle(49, 46, 19).fillEllipse(58, 46, 22, 26);
  }

  /**
   * DR. KAYA (from Noah's photo): lean, a black cap, dark sunglasses, a trimmed dark beard, a smartwatch.
   * Charcoal scrubs under the coat.
   */
  private makeKaya(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;
    const skin = 0xdcae8c;
    this.drawDoctorBody(g, skin, 0x3a3f47, 42);
    g.fillStyle(0x111111).fillRoundedRect(55, 18, 6, 11, 2); // smartwatch on the left wrist
    // Face, with the beard round its front edge
    g.fillStyle(skin).lineStyle(3, outline).fillCircle(49, 46, 15).strokeCircle(49, 46, 15);
    g.lineStyle(5, 0x2b2420).beginPath().arc(49, 46, 13, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55), false).strokePath();
    // Trimmed dark beard along the jaw, showing past both sides of the brim
    g.fillStyle(0x2b2420).fillEllipse(56, 32, 12, 7).fillEllipse(56, 60, 12, 7).fillEllipse(62, 46, 5, 26);
    // Black cap: crown over the head, brim pointing forward, a little orange button on top
    g.fillStyle(0x16181c).lineStyle(2, outline).fillCircle(46, 46, 14).strokeCircle(46, 46, 14);
    g.fillStyle(0x16181c).fillEllipse(57, 46, 11, 21).strokeEllipse(57, 46, 11, 21);
    g.lineStyle(1.5, 0x3a3f47).lineBetween(34, 46, 58, 46).lineBetween(38, 36, 52, 56).lineBetween(38, 56, 52, 36);
    g.fillStyle(0xf26b21).fillCircle(46, 46, 3);
    // Dark sunglasses peeking out under the brim
    g.fillStyle(0x0b0b0b).fillRoundedRect(62, 37, 5, 8, 2).fillRoundedRect(62, 47, 5, 8, 2).fillRect(63, 44, 2, 4);
    g.generateTexture('kaya', 96, 96);
    g.destroy();
  }

  /**
   * PA LUCIEN (from Noah's photo): glasses, close-cropped hair, a mustache and goatee, shirt and tie
   * under the white coat, stethoscope.
   */
  private makeLucien(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;
    const skin = 0x6b4632;
    this.drawDoctorBody(g, skin, 0xe3eaf2, 48);
    // Silver-lilac tie peeking out under the chin
    g.fillStyle(0xc5b8d6).lineStyle(1.5, outline).fillTriangle(62, 43, 62, 49, 69, 46).strokeTriangle(62, 43, 62, 49, 69, 46);
    g.lineStyle(3, COLORS.stethoscope).beginPath()
      .arc(48, 46, 19, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false).strokePath();
    // Head: close-cropped hair as a thin cap over the crown and back, the brow and face in front
    g.fillStyle(skin).lineStyle(3, outline).fillCircle(48, 46, 15).strokeCircle(48, 46, 15);
    g.fillStyle(0x2a1d16).beginPath().slice(48, 46, 14, Phaser.Math.DegToRad(110), Phaser.Math.DegToRad(250), false).fillPath();
    g.fillStyle(0x7d5440).fillEllipse(51, 46, 10, 16); // light on the top of his head
    // Glasses: thin frames with pale lenses, arms running back over the ears
    g.fillStyle(0xd6e4ec, 0.9).lineStyle(2, 0x111111).fillRoundedRect(57, 36, 6, 9, 2).strokeRoundedRect(57, 36, 6, 9, 2)
      .fillRoundedRect(57, 47, 6, 9, 2).strokeRoundedRect(57, 47, 6, 9, 2);
    g.lineStyle(2, 0x111111).lineBetween(60, 45, 60, 47).lineBetween(57, 39, 44, 34).lineBetween(57, 53, 44, 58);
    // Mustache and goatee at the front
    g.fillStyle(0x1a1410).fillEllipse(63.5, 46, 3, 12);
    g.generateTexture('lucien', 96, 96);
    g.destroy();
  }

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
    if (def.look === 'patient') {
      this.makePatientZero(def);
      return;
    }
    if (def.shape === 'shell') {
      this.makeSporePod(def);
      return;
    }
    if (def.shape === 'duo' || def.shape === 'rod' || def.shape === 'dish' || def.shape === 'mold') {
      this.makeEcologyGerm(def);
      return;
    }
    if (def.shape === 'sneezer') {
      this.makeSneezer(def);
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

  /**
   * M11 germs, each with its own silhouette (faces +x like every germ):
   * duo = two cocci stuck together (diplococcus), rod = a long capsule (bacillus),
   * dish = a petri dish with colonies growing in it, mold = a fuzzy stain.
   */
  private makeEcologyGerm(def: GermDef): void {
    const r = def.radius;
    const ink = def.outline;
    const eyes = (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, sleepy = false) => {
      for (const dy of [-0.35, 0.35]) {
        g.fillStyle(0xffffff).fillCircle(x, y + s * dy, s * 0.3);
        g.fillStyle(0x111111).fillCircle(x + s * 0.1, y + s * dy, s * 0.14);
        if (sleepy) g.fillStyle(def.color).fillRect(x - s * 0.32, y + s * dy - s * 0.32, s * 0.64, s * 0.26);
      }
    };
    const g = this.add.graphics();
    let size = (r + 12) * 2;
    if (def.shape === 'duo') {
      size = (r + 14) * 2;
      const c = size / 2;
      for (const dy of [-r * 0.45, r * 0.45]) {
        g.fillStyle(def.color).fillCircle(c, c + dy, r * 0.62);
        g.lineStyle(3, ink).strokeCircle(c, c + dy, r * 0.62);
        g.fillStyle(0xffffff, 0.25).fillCircle(c - r * 0.2, c + dy - r * 0.2, r * 0.18);
        eyes(g, c + r * 0.25, c + dy, r * 0.5);
      }
    } else if (def.shape === 'rod') {
      size = (r + 30) * 2;
      const c = size / 2;
      const len = r * 2.6;
      g.fillStyle(def.color).fillRoundedRect(c - len / 2, c - r * 0.7, len, r * 1.4, r * 0.7);
      g.lineStyle(3, ink).strokeRoundedRect(c - len / 2, c - r * 0.7, len, r * 1.4, r * 0.7);
      g.lineStyle(2, ink, 0.4);
      for (const x of [-0.6, -0.2, 0.2]) g.lineBetween(c + r * x, c - r * 0.55, c + r * x, c + r * 0.55);
      g.fillStyle(0xffffff, 0.25).fillRoundedRect(c - len / 2 + 6, c - r * 0.55, len - 20, r * 0.3, 6);
      eyes(g, c + len / 2 - r * 0.45, c, r * 0.7);
      // Angry brow: it means business
      g.lineStyle(3, ink).lineBetween(c + len / 2 - r * 0.8, c - r * 0.5, c + len / 2 - r * 0.25, c - r * 0.25);
    } else if (def.shape === 'dish') {
      const c = size / 2;
      g.fillStyle(0xe1f5fe, 0.9).fillCircle(c, c, r);
      g.lineStyle(4, 0x90a4ae).strokeCircle(c, c, r);
      g.fillStyle(def.color).fillCircle(c, c, r * 0.8);
      for (const [x, y, s] of [[-0.35, -0.3, 0.16], [0.1, -0.45, 0.12], [-0.45, 0.25, 0.14], [0.0, 0.4, 0.1], [-0.1, 0.0, 0.09]]) {
        g.fillStyle(0xf06292).fillCircle(c + r * x, c + r * y, r * s);
      }
      g.fillStyle(0xffffff, 0.5).fillEllipse(c - r * 0.3, c - r * 0.55, r * 0.6, r * 0.2);
      eyes(g, c + r * 0.4, c, r * 0.6);
    } else {
      // mold
      size = (r + 16) * 2;
      const c = size / 2;
      g.fillStyle(def.color);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const d = r * (0.75 + ((i * 7) % 5) * 0.06);
        g.fillCircle(c + Math.cos(a) * d, c + Math.sin(a) * d, r * 0.28);
      }
      g.fillCircle(c, c, r * 0.85);
      g.fillStyle(ink, 0.5);
      for (let i = 0; i < 10; i++) {
        const a = i * 2.4;
        g.fillCircle(c + Math.cos(a) * r * 0.55, c + Math.sin(a) * r * 0.55, 3);
      }
      g.fillStyle(0xc5e1a5, 0.5).fillCircle(c - r * 0.2, c - r * 0.2, r * 0.3);
      eyes(g, c + r * 0.3, c, r * 0.55, true);
    }
    g.generateTexture(`germ-${def.id}`, size, size);
    g.destroy();
  }

  /**
   * Patient Zero, seen from above facing right (+x): broad shoulders in a dotted hospital gown,
   * a sweaty head with messy hair, a big red nose, tissues stuck all over, and his ticket: 9 HRS.
   */
  private makePatientZero(def: GermDef): void {
    const r = def.radius;
    const size = (r + 16) * 2;
    const c = size / 2;
    const g = this.add.graphics();
    // Shoulders and gown
    g.fillStyle(def.color).fillEllipse(c - r * 0.1, c, r * 1.5, r * 2.0);
    g.lineStyle(3, def.outline).strokeEllipse(c - r * 0.1, c, r * 1.5, r * 2.0);
    g.fillStyle(0x6fa9cf);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      g.fillCircle(c - r * 0.1 + Math.cos(a) * r * 0.55, c + Math.sin(a) * r * 0.8, 3);
    }
    // Arms forward, one holding the ticket
    g.fillStyle(0xe8b48f).fillEllipse(c + r * 0.55, c - r * 0.78, r * 0.6, r * 0.3).fillEllipse(c + r * 0.55, c + r * 0.78, r * 0.6, r * 0.3);
    g.fillStyle(0xffe066).fillRect(c + r * 0.7, c + r * 0.62, r * 0.42, r * 0.3);
    g.lineStyle(2, 0x5d4037).strokeRect(c + r * 0.7, c + r * 0.62, r * 0.42, r * 0.3);
    g.fillStyle(0x5d4037).fillRect(c + r * 0.76, c + r * 0.72, r * 0.3, 3).fillRect(c + r * 0.76, c + r * 0.8, r * 0.2, 3);
    // Head: sweaty, messy hair at the back, puffy eyes, the red nose out front
    g.fillStyle(0xf2c2a0).fillCircle(c + r * 0.2, c, r * 0.55);
    g.lineStyle(3, 0x8d5b3f).strokeCircle(c + r * 0.2, c, r * 0.55);
    g.fillStyle(0x4e342e).slice(c + r * 0.2, c, r * 0.56, Math.PI - 1.2, Math.PI + 1.2, false).fillPath();
    for (const dy of [-0.22, 0.22]) {
      g.fillStyle(0xffffff).fillCircle(c + r * 0.45, c + r * dy, r * 0.11);
      g.fillStyle(0xd84315, 0.5).fillCircle(c + r * 0.45, c + r * dy + r * 0.05, r * 0.12);
      g.fillStyle(0x111111).fillCircle(c + r * 0.5, c + r * dy, r * 0.05);
    }
    g.fillStyle(0xe5383b).fillCircle(c + r * 0.72, c, r * 0.17);
    g.fillStyle(0xffffff, 0.6).fillCircle(c + r * 0.76, c - r * 0.06, r * 0.05);
    g.fillStyle(0x7fd3ff).fillCircle(c + r * 0.4, c + r * 0.35, r * 0.06); // sweat
    // Tissues stuck everywhere
    g.fillStyle(0xffffff);
    for (const [x, y, a] of [[-0.5, -0.6, 0.3], [-0.6, 0.4, -0.5], [0.0, 0.75, 0.2], [-0.2, -0.85, -0.2], [0.05, -0.3, 0.6]]) {
      g.save();
      g.translateCanvas(c + r * x, c + r * y);
      g.rotateCanvas(a);
      g.fillRect(-8, -6, 16, 12);
      g.lineStyle(1, 0xbdbdbd).strokeRect(-8, -6, 16, 12);
      g.restore();
    }
    g.generateTexture(`germ-${def.id}`, size, size);
    g.destroy();
  }

  /**
   * Spore Pod: a hexagonal shell with thick armor plates across its front (+x, the way it faces),
   * beady eyes peeking out between the plates, and a soft, lighter back: the weak spot.
   */
  private makeSporePod(def: GermDef): void {
    const r = def.radius;
    const size = (r + 12) * 2;
    const c = size / 2;
    const g = this.add.graphics();
    const hex = (rad: number) => Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      return new Phaser.Math.Vector2(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
    });
    // Soft back half (lighter, squishy)
    g.fillStyle(0xf2c98a).fillPoints(hex(r), true);
    g.lineStyle(3, def.outline).strokePoints(hex(r), true);
    g.fillStyle(0xffffff, 0.3).fillCircle(c - r * 0.45, c, r * 0.25);
    // Armor: three heavy plates over the front 120°
    for (let i = -1; i <= 1; i++) {
      const a = i * (Math.PI / 3);
      g.fillStyle(def.color).slice(c, c, r + 8, a - 0.5, a + 0.5, false).fillPath();
      g.lineStyle(3, def.outline).slice(c, c, r + 8, a - 0.5, a + 0.5, false).strokePath();
      g.fillStyle(0xffffff, 0.25).fillCircle(c + Math.cos(a) * (r * 0.95), c + Math.sin(a) * (r * 0.95), 3);
    }
    // Eyes in the slit between plates
    g.fillStyle(0x1a0e04).fillEllipse(c + r * 0.25, c, r * 0.4, r * 0.9);
    for (const dy of [-0.22, 0.22]) {
      g.fillStyle(0xffe066).fillCircle(c + r * 0.3, c + r * dy, r * 0.12);
      g.fillStyle(0x111111).fillCircle(c + r * 0.34, c + r * dy, r * 0.06);
    }
    g.generateTexture(`germ-${def.id}`, size, size);
    g.destroy();
  }

  /** Sneezer: a droopy, runny blob with a huge red nose out front and watery half-closed eyes. */
  private makeSneezer(def: GermDef): void {
    const r = def.radius;
    const size = (r + 14) * 2;
    const c = size / 2;
    const g = this.add.graphics();
    // Droopy drips around the back
    g.fillStyle(def.color);
    for (const a of [2.3, 2.8, 3.3, 3.8]) g.fillEllipse(c + Math.cos(a) * r * 0.9, c + Math.sin(a) * r * 0.9, r * 0.5, r * 0.36);
    g.fillCircle(c, c, r);
    g.lineStyle(3, def.outline).strokeCircle(c, c, r);
    g.fillStyle(0xffffff, 0.25).fillCircle(c - r * 0.35, c - r * 0.35, r * 0.28);
    // Sleepy, watery eyes
    for (const dy of [-0.38, 0.38]) {
      g.fillStyle(0xffffff).fillCircle(c + r * 0.2, c + r * dy, r * 0.24);
      g.fillStyle(def.color).fillRect(c + r * 0.2 - r * 0.26, c + r * dy - r * 0.26, r * 0.52, r * 0.13); // droopy lids
      g.fillStyle(0x111111).fillCircle(c + r * 0.28, c + r * dy + r * 0.06, r * 0.1);
      g.fillStyle(0x7fd3ff).fillCircle(c + r * 0.05, c + r * dy + r * 0.25, r * 0.07); // tear
    }
    // The nose: big, red, shiny
    g.fillStyle(0xe5383b).fillCircle(c + r * 0.85, c, r * 0.42);
    g.lineStyle(2, 0x7a1012).strokeCircle(c + r * 0.85, c, r * 0.42);
    g.fillStyle(0xffffff, 0.6).fillCircle(c + r * 0.95, c - r * 0.14, r * 0.1);
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

  /** Soft, fuzzy-edged cloud used for the spray mist. */
  private makePuff(): void {
    const g = this.add.graphics();
    const c = 24;
    for (let i = 12; i >= 1; i--) g.fillStyle(0xffffff, 0.09).fillCircle(c, c, i * 2);
    g.generateTexture('puff', 48, 48);
    g.destroy();
  }

  private makeDroplet(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.35).fillCircle(8, 8, 8);
    g.fillStyle(0xffffff).fillCircle(8, 8, 4.5);
    g.generateTexture('droplet', 16, 16);
    g.destroy();
  }

  /** RESISTANT aura: a spiky gold ring (tinted per trait) behind an elite germ. */
  private makeEliteRing(): void {
    const g = this.add.graphics();
    g.lineStyle(7, 0xffffff, 1).strokeCircle(32, 32, 25);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(0xffffff).fillTriangle(32 + Math.cos(a - 0.15) * 26, 32 + Math.sin(a - 0.15) * 26, 32 + Math.cos(a + 0.15) * 26, 32 + Math.sin(a + 0.15) * 26, 32 + Math.cos(a) * 32, 32 + Math.sin(a) * 32);
    }
    g.generateTexture('elite-ring', 64, 64);
    g.destroy();
  }

  /** Power-up pickup: a two-tone capsule (the white half is tinted per power-up). */
  private makePill(): void {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(4, 12, 44, 22, 11);
    // White and light grey halves: tinting the whole pill gives two tones of the power-up's color
    g.fillStyle(0xffffff).fillRoundedRect(2, 8, 44, 22, 11);
    g.fillStyle(0xa0a0a0).fillRoundedRect(24, 8, 22, 22, { tl: 0, bl: 0, tr: 11, br: 11 });
    g.fillStyle(0xffffff).fillRect(8, 12, 14, 4);
    g.lineStyle(2, 0x1b2b30).strokeRoundedRect(2, 8, 44, 22, 11);
    g.generateTexture('pill', 48, 36);
    g.destroy();
  }

  /** Sneezer mucus glob: a gooey green droplet with a shine. */
  private makeGlob(): void {
    const g = this.add.graphics();
    g.fillStyle(0x9bbf3a).fillCircle(12, 12, 10);
    g.fillStyle(0xc8e66b).fillCircle(10, 10, 6);
    g.fillStyle(0xffffff, 0.7).fillCircle(8, 8, 2.5);
    g.lineStyle(2, 0x4f5e14).strokeCircle(12, 12, 10);
    g.generateTexture('glob', 24, 24);
    g.destroy();
  }

  /** Edge-of-screen pointer toward an off-screen germ (points right; tinted per germ). */
  private makeArrow(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0d2b2e, 0.85).fillTriangle(2, 2, 30, 14, 2, 26);
    g.fillStyle(0xffffff).fillTriangle(6, 7, 24, 14, 6, 21);
    g.generateTexture('threat-arrow', 32, 28);
    g.destroy();
  }

  /** A tiny saint's halo that floats up off each disinfected germ. */
  private makeHalo(): void {
    const g = this.add.graphics();
    g.lineStyle(4, 0xffe66d).strokeEllipse(16, 8, 26, 10);
    g.lineStyle(2, 0xfff8d0).strokeEllipse(16, 8, 20, 6);
    g.generateTexture('halo', 32, 16);
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
