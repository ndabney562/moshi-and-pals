import Phaser from 'phaser';
import { drawProviderPreview, type PreviewProvider } from './providerArt';
import { registerPortraits } from '../ui/menuTheme';
import { COLORS } from '../config/theme';
import { GERMS, type GermDef } from '../data/germs';
import { VIOLATIONS, type ViolationDef } from '../data/patients';
import { EQUIPMENT, STARTING_EQUIPMENT } from '../data/equipment';
import { drawTool, toolTexture } from './toolArt';

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
    this.load.image('provider-portraits', 'assets/provider-portraits.png');
    this.load.image('menu-sprites', 'assets/menu-sprites.jpg');
    this.load.image('menu-bgs', 'assets/menu-bgs.jpg');
  }

  create(): void {
    registerPortraits(this);
    document.getElementById('loading')?.setAttribute('hidden', '');
    this.makeEugene();
    this.makeEugene(true);
    this.makeKaya();
    this.makeLucien();
    this.makeKen();
    for (const id of ['janeen', 'amanda', 'dharma', 'dhiwya', 'lidiya', 'raj', 'jason'] as PreviewProvider[]) {
      const g = this.add.graphics();
      drawProviderPreview(g, id);
      this.finishDoctor(g, id);
    }
    const capsule = this.add.graphics();
    capsule.fillStyle(0xffffff).fillRoundedRect(0, 0, 16, 8, 4);
    capsule.fillStyle(0xd995d9).fillRoundedRect(8, 0, 8, 8, 3);
    capsule.generateTexture('medication-capsule', 16, 8); capsule.destroy();
    for (const [i, color] of [0x138e91, 0x9964b7, 0xce8251].entries()) {
      const g = this.add.graphics(); drawProviderPreview(g, 'dhiwya', color); this.finishDoctor(g, `dhiwya-${i}`);
    }
    this.makeTools();
    this.makeOmar();
    this.makeAlan();
    this.makeDonald();
    this.makeSelina();
    this.makeElaine();
    this.makeAlexandra();
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
    this.makeVent();
    this.makeEliteRing();
    this.makePill();
    this.scene.start('Title');
  }

  /**
   * Top-down Eugene facing right (+x). 96x96, centered.
   * Matches Noah's title poster: messy brown-grey hair, blue surgical mask,
   * stethoscope, white lab coat over navy scrubs. His tool is a separate sprite (toolArt.ts).
   */
  private makeEugene(cap = false): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;

    // Right arm reaching forward to hold his tool (his right side is +y when facing +x)
    g.fillStyle(COLORS.coat).lineStyle(3, outline).fillRoundedRect(46, 60, 30, 13, 6).strokeRoundedRect(46, 60, 30, 13, 6);
    g.fillStyle(COLORS.skin).fillCircle(78, 66, 6).strokeCircle(78, 66, 6);

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

    if (cap) {
      // The Miracle Cure's reward: his dark patterned scrub cap, tied at the back
      g.fillStyle(0x1f2a44).lineStyle(2, outline).fillCircle(45, 46, 14).strokeCircle(45, 46, 14);
      g.fillStyle(0x1f2a44).fillEllipse(54, 46, 8, 22);
      g.fillStyle(0x6fa8dc);
      for (const [dx, dy] of [[-7, -6], [0, -9], [6, -3], [-4, 2], [3, 6], [-8, 8], [8, 5], [0, 0]]) g.fillCircle(45 + dx, 46 + dy, 1.6);
      g.lineStyle(3, 0x1f2a44).lineBetween(31, 46, 24, 42).lineBetween(31, 46, 24, 51);
    }
    this.finishDoctor(g, cap ? 'eugene-cap' : 'eugene');
  }

  /**
   * Saves a doctor's texture empty-handed (in a shift the held tool is its own sprite, see Player), then
   * again as `<key>-held` holding the squirt bottle, for portraits.
   */
  private finishDoctor(g: Phaser.GameObjects.Graphics, key: string): void {
    g.generateTexture(key, 96, 96);
    drawTool(g, STARTING_EQUIPMENT);
    g.generateTexture(`${key}-held`, 96, 96);
    g.destroy();
  }

  /** One held-tool sprite per piece of equipment, `tool-<id>`, laid over the doctor in the same 96x96 frame. */
  private makeTools(): void {
    for (const id of Object.keys(EQUIPMENT)) {
      const g = this.add.graphics();
      drawTool(g, id);
      g.generateTexture(toolTexture(id), 96, 96);
      g.destroy();
    }
  }

  /** The parts every doctor shares, seen from above facing +x: arms (the right hand holds the tool, drawn separately) and the lab coat. */
  private drawDoctorBody(g: Phaser.GameObjects.Graphics, skin: number, under: number, coatW: number,
    coat: number = COLORS.coat, coatShadow: number = COLORS.coatShadow): void {
    const outline = 0x1b2b30;
    g.fillStyle(coat).lineStyle(3, outline).fillRoundedRect(46, 60, 30, 13, 6).strokeRoundedRect(46, 60, 30, 13, 6);
    g.fillStyle(skin).fillCircle(78, 66, 6).strokeCircle(78, 66, 6);
    g.fillStyle(coat).fillRoundedRect(44, 18, 22, 13, 6).strokeRoundedRect(44, 18, 22, 13, 6);
    g.fillStyle(skin).fillCircle(68, 24, 6).strokeCircle(68, 24, 6);
    g.fillStyle(coat).fillEllipse(41, 46, coatW, 78).strokeEllipse(41, 46, coatW, 78);
    g.fillStyle(coatShadow).fillEllipse(34, 46, coatW * 0.43, 58);
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
    this.finishDoctor(g, 'kaya');
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
    this.finishDoctor(g, 'lucien');
  }

  /**
   * KEN (from Noah's photo): stocky, short dark receding hair, clean-shaven, a black zip fleece over
   * light-blue scrubs and a grey tee, a chunky black wristwatch. Plain fleece, no logos.
   */
  private makeKen(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;
    const skin = 0xe2ae8a;
    // Broad, stocky shoulders in the fleece, light-blue scrubs at the collar
    this.drawDoctorBody(g, skin, 0x9fd0e3, 54, 0x2b2e34, 0x1c1e22);
    // Fleece collar and zip line running forward from it
    g.lineStyle(2, 0x45494f).beginPath().arc(48, 46, 21, Phaser.Math.DegToRad(-80), Phaser.Math.DegToRad(80), false).strokePath();
    // Grey tee in the scrubs' V
    g.fillStyle(0xbfc4c8).fillEllipse(63, 46, 7, 14);
    g.lineStyle(2, 0x6fa9bf).lineBetween(58, 33, 66, 46).lineBetween(58, 59, 66, 46);
    // Chunky black watch with a silver face on the left wrist
    g.fillStyle(0x0e0e10).lineStyle(1.5, outline).fillRoundedRect(55, 16, 8, 17, 3).strokeRoundedRect(55, 16, 8, 17, 3);
    g.fillStyle(0xb8c2cc).fillCircle(59, 24.5, 2.6);
    // Ears
    g.fillStyle(skin).lineStyle(2, outline).fillCircle(46, 30, 4).strokeCircle(46, 30, 4).fillCircle(46, 62, 4).strokeCircle(46, 62, 4);
    // Head: short dark hair over the back and sides, receding at the front
    g.fillStyle(skin).lineStyle(3, outline).fillCircle(48, 46, 16).strokeCircle(48, 46, 16);
    g.fillStyle(0x3b2d25).beginPath().slice(48, 46, 15, Phaser.Math.DegToRad(100), Phaser.Math.DegToRad(260), false).fillPath();
    g.fillEllipse(43, 36, 13, 7).fillEllipse(43, 56, 13, 7);
    g.fillStyle(0x56443a).fillEllipse(44, 46, 7, 9); // a little left on top
    g.fillStyle(0xeebc9a).fillEllipse(54, 46, 9, 15); // light on the high forehead
    g.lineStyle(3, outline).strokeCircle(48, 46, 16);
    // Nose
    g.fillStyle(0xd59c78).fillCircle(64, 46, 3);
    this.finishDoctor(g, 'ken');
  }

  /**
   * The scribes' shared top-down body (facing +x, 96x96): shoulders and arms in `top`, and a laptop held
   * out front in both hands (they chart while they fight).
   */
  private drawScribeBody(g: Phaser.GameObjects.Graphics, skin: number, top: number, shade: number, sleeves: number): void {
    const outline = 0x1b2b30;
    // Arms forward to the laptop
    g.fillStyle(sleeves).lineStyle(3, outline).fillRoundedRect(44, 20, 22, 12, 6).strokeRoundedRect(44, 20, 22, 12, 6)
      .fillRoundedRect(44, 60, 22, 12, 6).strokeRoundedRect(44, 60, 22, 12, 6);
    // Laptop: open, screen toward them, a little blue glow
    g.fillStyle(0x9aa4ad).lineStyle(2, outline).fillRoundedRect(66, 26, 14, 40, 3).strokeRoundedRect(66, 26, 14, 40, 3);
    g.fillStyle(0x263238).fillRect(66, 29, 4, 34);
    g.fillStyle(0x7fd3ff, 0.8).fillRect(70, 30, 2, 32);
    g.fillStyle(skin).lineStyle(2, outline).fillCircle(68, 28, 5).strokeCircle(68, 28, 5).fillCircle(68, 64, 5).strokeCircle(68, 64, 5);
    // Shoulders
    g.fillStyle(top).lineStyle(3, outline).fillEllipse(42, 46, 40, 72).strokeEllipse(42, 46, 40, 72);
    g.fillStyle(shade).fillEllipse(35, 46, 16, 52);
  }

  /**
   * OMAR, scribe (from Noah's photo): short dark hair, a short beard, a big smile, an N95 pulled down
   * under his chin, a black jacket over black scrubs. Plain mask, no brand.
   */
  private makeOmar(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;
    const skin = 0xd8a47f;
    this.drawScribeBody(g, skin, 0x23262c, 0x16181c, 0x2b2f36);
    // Jacket collar
    g.lineStyle(2, 0x3c4048).beginPath().arc(48, 46, 18, Phaser.Math.DegToRad(-75), Phaser.Math.DegToRad(75), false).strokePath();
    // Head: short dark hair on top and back, beard around the front of the jaw
    g.fillStyle(skin).lineStyle(3, outline).fillCircle(47, 46, 14).strokeCircle(47, 46, 14);
    g.fillStyle(0x2a1d17).beginPath().slice(47, 46, 14, Phaser.Math.DegToRad(70), Phaser.Math.DegToRad(290), false).fillPath();
    g.fillCircle(45, 46, 12);
    g.lineStyle(1.5, 0x4a362b).lineBetween(38, 40, 50, 39).lineBetween(37, 46, 51, 46).lineBetween(38, 52, 50, 53);
    g.lineStyle(4, 0x2a1d17, 0.85).beginPath().arc(47, 46, 12, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50), false).strokePath();
    g.lineStyle(3, outline).beginPath().arc(47, 46, 14, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false).strokePath();
    // N95 pulled down under his chin: a white cup hanging at his throat, blue straps running back
    g.lineStyle(1.5, 0x6f9fd8).lineBetween(58, 33, 42, 31).lineBetween(58, 59, 42, 61);
    g.lineStyle(8, outline).beginPath().arc(47, 46, 18, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50), false).strokePath();
    g.lineStyle(5.5, 0xf4f1e6).beginPath().arc(47, 46, 18, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50), false).strokePath();
    g.fillStyle(0xf4f1e6).lineStyle(2, outline).fillEllipse(65, 46, 7, 16).strokeEllipse(65, 46, 7, 16);
    // Nose out front
    g.fillStyle(0xc98f6a).fillCircle(60, 46, 2.5);
    g.generateTexture('scribe-omar', 96, 96);
    g.destroy();
  }

  /**
   * ALAN, scribe (from Noah's photo): slim, a black buzz cut, a blue-grey t-shirt and a black backpack.
   * Plain shirt, no print.
   */
  private makeAlan(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;
    const skin = 0xe8c4a0;
    // Black backpack on his back (-x), straps over the shoulders
    g.fillStyle(0x15171b).lineStyle(3, outline).fillRoundedRect(16, 30, 18, 32, 6).strokeRoundedRect(16, 30, 18, 32, 6);
    g.fillStyle(0x2a2e35).fillRoundedRect(19, 36, 10, 20, 3);
    this.drawScribeBody(g, skin, 0x5d7189, 0x4b5d73, skin);
    // Short sleeves at the shoulders
    g.fillStyle(0x5d7189).fillEllipse(46, 23, 10, 12).fillEllipse(46, 69, 10, 12);
    // Backpack straps
    g.lineStyle(4, 0x15171b).lineBetween(30, 32, 54, 30).lineBetween(30, 60, 54, 62);
    // Collar
    g.fillStyle(0x4b5d73).fillEllipse(56, 46, 10, 18);
    // Head: a black buzz cut all over, the face out front
    g.fillStyle(skin).lineStyle(3, outline).fillCircle(48, 46, 13).strokeCircle(48, 46, 13);
    g.fillStyle(0x1e1e1e).beginPath().slice(48, 46, 12.5, Phaser.Math.DegToRad(60), Phaser.Math.DegToRad(300), false).fillPath();
    g.fillCircle(46, 46, 10.5);
    g.fillStyle(0x3a3a3a);
    for (const [dx, dy] of [[-6, -4], [-2, 5], [2, -6], [-7, 3], [3, 2], [-3, -1], [0, 8], [0, -9]]) g.fillCircle(46 + dx, 46 + dy, 0.9);
    g.lineStyle(3, outline).strokeCircle(48, 46, 13);
    g.fillStyle(0xd6ad86).fillCircle(61, 46, 2.5);
    g.generateTexture('scribe-alan', 96, 96);
    g.destroy();
  }

  /**
   * DONALD, X-ray tech (from Noah's photo): dark brown hair swept back, a short stubble beard along the jaw,
   * a black zip-up fleece over a black tee. Holds an X-ray film out front instead of a laptop. Plain fleece, no logo.
   */
  private makeDonald(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;
    const skin = 0xe2b896;
    const fleece = 0x1d1f23;
    // Arms forward to the film
    g.fillStyle(fleece).lineStyle(3, outline).fillRoundedRect(44, 20, 22, 12, 6).strokeRoundedRect(44, 20, 22, 12, 6)
      .fillRoundedRect(44, 60, 22, 12, 6).strokeRoundedRect(44, 60, 22, 12, 6);
    // X-ray film: a dark sheet with a pale rib cage on it
    g.fillStyle(0x22343c).lineStyle(2, outline).fillRoundedRect(64, 24, 16, 44, 2).strokeRoundedRect(64, 24, 16, 44, 2);
    g.lineStyle(1.5, 0xc8ffe6, 0.85).lineBetween(72, 28, 72, 64);
    for (const ry of [32, 39, 46, 53, 60]) g.lineBetween(67, ry, 77, ry);
    g.fillStyle(skin).lineStyle(2, outline).fillCircle(66, 27, 5).strokeCircle(66, 27, 5).fillCircle(66, 65, 5).strokeCircle(66, 65, 5);
    // Shoulders: black fleece, a zip down the front
    g.fillStyle(fleece).lineStyle(3, outline).fillEllipse(42, 46, 42, 74).strokeEllipse(42, 46, 42, 74);
    g.fillStyle(0x121316).fillEllipse(34, 46, 16, 54);
    g.lineStyle(2, 0x3a3d44).beginPath().arc(48, 46, 18, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false).strokePath();
    g.lineStyle(1.5, 0x6b6f78).lineBetween(61, 40, 61, 52);
    // Head: dark brown hair swept back from the forehead, stubble beard along the jaw
    g.fillStyle(skin).lineStyle(3, outline).fillCircle(48, 46, 14).strokeCircle(48, 46, 14);
    g.fillStyle(0x3b2a1f).beginPath().slice(48, 46, 14, Phaser.Math.DegToRad(55), Phaser.Math.DegToRad(305), false).fillPath();
    g.fillEllipse(45, 46, 22, 26);
    // Combed-back strands and a little volume up front
    g.lineStyle(1.5, 0x5a4232).lineBetween(55, 40, 37, 38).lineBetween(56, 46, 36, 46).lineBetween(55, 52, 37, 54)
      .lineBetween(54, 36, 41, 33).lineBetween(54, 56, 41, 59);
    g.fillStyle(0x4a3527).fillEllipse(55, 46, 6, 16);
    // Stubble beard around the front of the jaw
    g.lineStyle(4, 0x4e3a2e, 0.6).beginPath().arc(48, 46, 12, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55), false).strokePath();
    g.lineStyle(3, outline).strokeCircle(48, 46, 14);
    // Nose out front
    g.fillStyle(0xcf9e7c).fillCircle(61, 46, 2.5);
    g.generateTexture('scribe-donald', 96, 96);
    g.destroy();
  }

  /**
   * SELINA, front desk PSR (from Noah's photo): long wavy brown hair with honey highlights down her back, a tiny nose
   * stud, a gold cuff bracelet, burgundy scrubs (her dress's color). Holds a check-in clipboard out front.
   */
  private makeSelina(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;
    const skin = 0xd9a77f;
    const top = 0x5a1f2e;
    // Arms forward to the clipboard
    g.fillStyle(skin).lineStyle(3, outline).fillRoundedRect(44, 20, 22, 11, 6).strokeRoundedRect(44, 20, 22, 11, 6)
      .fillRoundedRect(44, 61, 22, 11, 6).strokeRoundedRect(44, 61, 22, 11, 6);
    g.fillStyle(0xd4a017).fillRect(55, 60, 6, 13); // gold cuff
    // Clipboard: brown board, white sheet, silver clip
    g.fillStyle(0x8d6e63).lineStyle(2, outline).fillRoundedRect(64, 27, 15, 38, 2).strokeRoundedRect(64, 27, 15, 38, 2);
    g.fillStyle(0xfafafa).fillRect(66, 31, 11, 31);
    g.lineStyle(1, 0x9e9e9e).lineBetween(68, 36, 75, 36).lineBetween(68, 41, 75, 41).lineBetween(68, 46, 75, 46).lineBetween(68, 51, 73, 51);
    g.fillStyle(0xb0bec5).fillRect(73, 41, 5, 10);
    g.fillStyle(skin).lineStyle(2, outline).fillCircle(67, 27, 5).strokeCircle(67, 27, 5).fillCircle(67, 65, 5).strokeCircle(67, 65, 5);
    // Shoulders: burgundy scrubs, a V neck
    g.fillStyle(top).lineStyle(3, outline).fillEllipse(42, 46, 38, 70).strokeEllipse(42, 46, 38, 70);
    g.fillStyle(0x45161f).fillEllipse(35, 46, 15, 50);
    g.fillStyle(skin).fillTriangle(54, 40, 54, 52, 61, 46);
    // Long wavy hair falling down her back, over the shoulders
    const hair = 0x4a3020;
    g.fillStyle(hair).lineStyle(3, outline);
    for (const [hx, hy, r] of [[28, 34, 9], [24, 46, 10], [28, 58, 9], [36, 28, 8], [36, 64, 8], [20, 40, 7], [20, 53, 7]]) g.fillCircle(hx, hy, r);
    // Head
    g.fillStyle(skin).lineStyle(3, outline).fillCircle(48, 46, 13).strokeCircle(48, 46, 13);
    g.fillStyle(hair).beginPath().slice(48, 46, 13, Phaser.Math.DegToRad(50), Phaser.Math.DegToRad(310), false).fillPath();
    g.fillEllipse(44, 46, 20, 24);
    // Honey highlights and a few waves
    g.lineStyle(2, 0xc9925a).beginPath().arc(30, 38, 7, 0.4, 2.6).strokePath().beginPath().arc(26, 54, 7, 0.4, 2.6).strokePath();
    g.lineStyle(1.5, 0xb07a48).lineBetween(53, 40, 38, 38).lineBetween(53, 52, 38, 54).lineBetween(54, 46, 36, 46);
    g.lineStyle(3, outline).strokeCircle(48, 46, 13);
    // Nose, with a tiny stud
    g.fillStyle(0xc4906a).fillCircle(61, 46, 2.5);
    g.fillStyle(0xfff3c4).fillCircle(61, 48.5, 1);
    g.generateTexture('scribe-selina', 96, 96);
    g.destroy();
  }

  /**
   * ELAINE, front desk PSR (from Noah's photo): dark wavy shoulder-length hair parted in the middle, a light pink top,
   * silver rings, and her phone (in a pale sage case) in hand.
   */
  private makeElaine(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;
    const skin = 0xd6a07c;
    const top = 0xf3d3dc;
    // Arms: one forward to the phone, one resting on the desk side
    g.fillStyle(skin).lineStyle(3, outline).fillRoundedRect(44, 20, 22, 11, 6).strokeRoundedRect(44, 20, 22, 11, 6)
      .fillRoundedRect(44, 61, 18, 11, 6).strokeRoundedRect(44, 61, 18, 11, 6);
    // Phone in a sage case
    g.fillStyle(0xc8d5b9).lineStyle(2, outline).fillRoundedRect(64, 16, 12, 20, 3).strokeRoundedRect(64, 16, 12, 20, 3);
    g.fillStyle(0x37474f).fillCircle(72, 20, 2);
    g.fillStyle(skin).lineStyle(2, outline).fillCircle(66, 27, 5).strokeCircle(66, 27, 5).fillCircle(63, 66, 5).strokeCircle(63, 66, 5);
    g.fillStyle(0xe0e0e0).fillCircle(68, 25, 1.4).fillCircle(65, 64, 1.4); // rings
    // Shoulders: light pink top
    g.fillStyle(top).lineStyle(3, outline).fillEllipse(42, 46, 38, 70).strokeEllipse(42, 46, 38, 70);
    g.fillStyle(0xe2b9c5).fillEllipse(35, 46, 15, 50);
    // Dark wavy hair to the shoulders
    const hair = 0x1f1714;
    g.fillStyle(hair).lineStyle(3, outline);
    for (const [hx, hy, r] of [[32, 33, 9], [29, 46, 10], [32, 59, 9], [38, 28, 7], [38, 64, 7]]) g.fillCircle(hx, hy, r);
    // Head
    g.fillStyle(skin).lineStyle(3, outline).fillCircle(48, 46, 13).strokeCircle(48, 46, 13);
    g.fillStyle(hair).beginPath().slice(48, 46, 13, Phaser.Math.DegToRad(55), Phaser.Math.DegToRad(305), false).fillPath();
    g.fillEllipse(44, 46, 20, 24);
    // Middle part, front to back, and a couple of waves
    g.lineStyle(1.5, 0xa77c66).lineBetween(55, 46, 36, 46);
    g.lineStyle(1.5, 0x3a2c26).beginPath().arc(32, 36, 6, 0.4, 2.6).strokePath().beginPath().arc(32, 57, 6, 0.4, 2.6).strokePath();
    g.lineStyle(3, outline).strokeCircle(48, 46, 13);
    g.fillStyle(0xc28d6a).fillCircle(61, 46, 2.5);
    g.generateTexture('scribe-elaine', 96, 96);
    g.destroy();
  }

  /**
   * ALEXANDRA, Essence Scribe (Milestone 4):
   * An ethereal animated cloud/essence with a black medical mask and glowing cyan aura.
   */
  private makeAlexandra(): void {
    const g = this.add.graphics();
    // Outer ethereal aura
    g.fillStyle(0x80ed99, 0.25).fillCircle(48, 46, 32);
    g.fillStyle(0x4a0e4e, 0.45).fillCircle(48, 46, 26);
    // Cloud essence wisps
    g.fillStyle(0x2e0854, 0.85);
    g.fillCircle(40, 40, 16);
    g.fillCircle(56, 40, 16);
    g.fillCircle(40, 52, 15);
    g.fillCircle(56, 52, 15);
    g.fillCircle(48, 46, 18);
    // Ethereal swirls
    g.lineStyle(2, 0x80ed99, 0.75);
    g.strokeCircle(48, 46, 22);
    // Black medical mask over the lower center of the essence
    g.fillStyle(0x111111, 0.95).fillRoundedRect(36, 46, 24, 16, 4);
    g.lineStyle(1.5, 0x333333).strokeRoundedRect(36, 46, 24, 16, 4);
    // Mask pleats
    g.lineStyle(1, 0x444444);
    g.lineBetween(38, 51, 58, 51);
    g.lineBetween(38, 56, 58, 56);
    // Ear loops on mask
    g.lineStyle(1.5, 0x222222);
    g.beginPath().arc(36, 54, 4, Math.PI / 2, -Math.PI / 2, false).strokePath();
    g.beginPath().arc(60, 54, 4, -Math.PI / 2, Math.PI / 2, false).strokePath();
    // Glowing cyan eyes above mask
    g.fillStyle(0x80ed99, 0.95);
    g.fillCircle(43, 40, 2.5);
    g.fillCircle(53, 40, 2.5);
    g.generateTexture('scribe-alexandra', 96, 96);
    g.destroy();
  }

  /** Two-tone clinic linoleum with tactile grout seams, vinyl specks, and bevel highlights. */
  private makeFloorTile(): void {
    const g = this.add.graphics();
    // Base tile colors
    g.fillStyle(COLORS.floorA).fillRect(0, 0, 64, 64);
    g.fillStyle(COLORS.floorB).fillRect(0, 0, 32, 32).fillRect(32, 32, 32, 32);

    // Each 32x32 quadrant tile gets beveling, vinyl specks, and micro-highlights
    const quadrants = [
      { x: 0, y: 0 },
      { x: 32, y: 0 },
      { x: 0, y: 32 },
      { x: 32, y: 32 },
    ];

    for (const q of quadrants) {
      // Clean top-left bevel highlight
      g.lineStyle(1, 0xffffff, 0.45);
      g.lineBetween(q.x + 1, q.y + 1, q.x + 31, q.y + 1);
      g.lineBetween(q.x + 1, q.y + 1, q.x + 1, q.y + 31);

      // Subtle bottom-right shadow bevel
      g.lineStyle(1, 0x8ea8a0, 0.35);
      g.lineBetween(q.x + 1, q.y + 31, q.x + 31, q.y + 31);
      g.lineBetween(q.x + 31, q.y + 1, q.x + 31, q.y + 31);

      // Micro vinyl flecks (authentic hospital linoleum composition)
      g.fillStyle(0x528277, 0.16);
      g.fillRect(q.x + 7, q.y + 8, 2, 2);
      g.fillRect(q.x + 22, q.y + 14, 2, 2);
      g.fillRect(q.x + 12, q.y + 24, 2, 2);

      g.fillStyle(0xffffff, 0.35);
      g.fillRect(q.x + 18, q.y + 6, 1.5, 1.5);
      g.fillRect(q.x + 8, q.y + 18, 1.5, 1.5);
      g.fillRect(q.x + 24, q.y + 26, 1.5, 1.5);
    }

    // Grout seam grid lines (1.5px soft mint-slate)
    g.lineStyle(1.5, 0x98b3ab, 0.85);
    g.strokeRect(0, 0, 64, 64);
    g.lineBetween(32, 0, 32, 64);
    g.lineBetween(0, 32, 64, 32);

    g.generateTexture('floor', 64, 64);
    g.destroy();
  }

  private makeShadow(): void {
    const g = this.add.graphics();
    // Two-tier contact shadow with soft penumbra
    g.fillStyle(0x000000, 0.12).fillEllipse(32, 16, 62, 28);
    g.fillStyle(0x000000, 0.22).fillEllipse(32, 16, 46, 20);
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
    if (def.shape === 'fax') {
      this.makeFaxMachine(def);
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
    if (def.look === 'staph') {
      for (const layers of [3, 2, 1]) this.makeStaph(def, layers);
      return;
    }
    if (def.look === 'flu') {
      this.makeFluTwin(def);
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
    // Body with 3D volume shading
    g.fillStyle(def.color).fillCircle(c, c, r);
    // Underside shadow crescent
    g.fillStyle(def.outline, 0.25).beginPath()
      .arc(c, c, r - 2, Phaser.Math.DegToRad(40), Phaser.Math.DegToRad(140), false)
      .strokePath();
    // Curved glossy specular rim highlight (arcade sheen)
    g.lineStyle(Math.max(2, r * 0.12), 0xffffff, 0.35).beginPath()
      .arc(c, c, r * 0.72, -2.4, -1.0, false).strokePath();

    g.lineStyle(3, def.outline).strokeCircle(c, c, r);
    g.fillStyle(0xffffff, 0.25).fillCircle(c - r * 0.35, c - r * 0.35, r * 0.3);
    g.fillStyle(def.outline, 0.35).fillCircle(c + r * 0.4, c + r * 0.45, r * 0.15).fillCircle(c - r * 0.45, c + r * 0.3, r * 0.1);
    // Eyes facing right (+x), the direction it moves
    for (const dy of [-0.32, 0.32]) {
      g.fillStyle(0xffffff).fillCircle(c + r * 0.38, c + r * dy, r * 0.27);
      g.lineStyle(1.5, def.outline, 0.5).strokeCircle(c + r * 0.38, c + r * dy, r * 0.27);
      g.fillStyle(0x111111).fillCircle(c + r * 0.48, c + r * dy, r * 0.13);
      // Bright catchlight glint in eyes
      g.fillStyle(0xffffff, 0.95).fillCircle(c + r * 0.44, c + r * (dy - 0.06), Math.max(1.2, r * 0.05));
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
   * creatures. Stubby arms (one holding her clipboard), furious eyebrows and a toothy scowl.
   * Her look follows Noah's reference picture (v0.18): a striped red-gold-green knit headwrap,
   * long beaded dreadlocks, gold hoops, bead necklaces and bracelets.
   * Faces right (+x) like every germ.
   */
  private makeManagerMonster(def: GermDef): void {
    const r = def.radius;
    const size = (r + 22) * 2;
    const c = size / 2;
    const ink = def.outline;
    const g = this.add.graphics();

    // Stubby arms out to the sides, reaching forward
    g.fillStyle(def.color).fillEllipse(c + r * 0.35, c - r * 0.95, r * 0.7, r * 0.42).fillEllipse(c + r * 0.35, c + r * 0.95, r * 0.7, r * 0.42);
    g.lineStyle(3, ink).strokeEllipse(c + r * 0.35, c - r * 0.95, r * 0.7, r * 0.42).strokeEllipse(c + r * 0.35, c + r * 0.95, r * 0.7, r * 0.42);

    const hair = 0x3a2416;
    const beads = [0xd7263d, 0xf2c14e, 0x1f8a3b];
    // Long dreadlocks hanging past her back and sides (drawn first, so only their ends show past the body)
    const locks: number[] = [];
    for (let i = 0; i < 11; i++) locks.push(Math.PI - 1.9 + (i / 10) * 3.8);
    for (const [i, a] of locks.entries()) {
      const len = r * (1.22 + (i % 3) * 0.05);
      const x1 = c + Math.cos(a) * len, y1 = c + Math.sin(a) * len;
      g.lineStyle(r * 0.2, 0x24160d).lineBetween(c, c, x1, y1);
      g.lineStyle(r * 0.13, i % 2 ? hair : 0x4f3322).lineBetween(c, c, x1, y1);
      g.fillStyle(beads[i % 3]).fillCircle(x1, y1, r * 0.085);
      g.lineStyle(1.5, 0x24160d).strokeCircle(x1, y1, r * 0.085);
    }

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

    // A few locks falling over her back from under the wrap
    for (const a of [Math.PI - 0.75, Math.PI - 0.25, Math.PI + 0.25, Math.PI + 0.75]) {
      const x0 = c + Math.cos(a) * r * 0.55, y0 = c + Math.sin(a) * r * 0.55;
      const x1 = c + Math.cos(a) * r * 1.05, y1 = c + Math.sin(a) * r * 1.05;
      g.lineStyle(r * 0.16, 0x24160d).lineBetween(x0, y0, x1, y1);
      g.lineStyle(r * 0.1, 0x4f3322).lineBetween(x0, y0, x1, y1);
    }
    // Bracelets of beads on both stubby arms
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const bx = c + r * (0.2 + k * 0.1), by = c + side * r * 0.95;
        g.fillStyle(beads[(k + (side > 0 ? 1 : 0)) % 3]).fillCircle(bx, by - side * r * 0.16, r * 0.065);
        g.lineStyle(1, 0x24160d, 0.8).strokeCircle(bx, by - side * r * 0.16, r * 0.065);
      }
    }
    // The striped knit headwrap over the back of her head: red, gold and green bands (seen from above,
    // each band a smaller cap sitting further back, so they read as stripes running across it)
    const back = c - r * 0.98;
    const capW = r * 0.98, capH = r * 1.5;
    const bands = [0xd7263d, 0x24160d, 0xf2c14e, 0x24160d, 0x1f8a3b, 0xd7263d, 0xf2c14e];
    bands.forEach((col, k) => {
      const w = capW * (1 - k * 0.13);
      const h = capH * (1 - k * 0.06);
      g.fillStyle(col).fillEllipse(back + w / 2, c, w, h);
    });
    g.lineStyle(3, 0x24160d).strokeEllipse(back + capW / 2, c, capW, capH);
    // Knit ribbing along the brim
    g.lineStyle(1.5, 0x000000, 0.25);
    for (let i = -5; i <= 5; i++) {
      const t = i / 6;
      const ex = back + capW / 2 + Math.cos(Math.asin(t)) * capW * 0.5;
      g.lineBetween(ex - r * 0.1, c + t * capH * 0.5, ex - 1, c + t * capH * 0.5);
    }
    // Gold hoop earrings at the sides of her face
    for (const side of [-1, 1]) {
      const hx = c - r * 0.02, hy = c + side * r * 0.7;
      g.lineStyle(5, 0x8a6200).strokeCircle(hx, hy, r * 0.14);
      g.lineStyle(3, 0xffd34d).strokeCircle(hx, hy, r * 0.14);
    }
    // Bead necklaces draped round her sides (clear of the face)
    for (const [rad, size] of [[0.9, 0.075]] as const) {
      for (const side of [-1, 1]) {
        for (let k = 0; k <= 6; k++) {
          const a = side * (0.9 + k * 0.1);
          g.fillStyle(beads[(k + (rad > 0.85 ? 1 : 0)) % 3]).fillCircle(c + Math.cos(a) * r * rad, c + Math.sin(a) * r * rad, r * size);
          g.lineStyle(1, 0x24160d, 0.8).strokeCircle(c + Math.cos(a) * r * rad, c + Math.sin(a) * r * rad, r * size);
        }
      }
    }
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
   * Methicillin: a bunch of grapes (staph under the microscope), seen from above facing right (+x).
   * `layers` 3..1: the armored outer ring and the middle ring peel off as he's hurt. Texture keys:
   * germ-methicillin (all three), germ-methicillin-2, germ-methicillin-1.
   */
  private makeStaph(def: GermDef, layers: number): void {
    const r = def.radius;
    const size = (r + 14) * 2;
    const c = size / 2;
    const g = this.add.graphics();
    const grape = (x: number, y: number, gr: number, fill: number, ink: number, plated = false) => {
      g.fillStyle(fill).fillCircle(x, y, gr);
      g.lineStyle(3, ink).strokeCircle(x, y, gr);
      g.fillStyle(0xffffff, 0.35).fillCircle(x - gr * 0.35, y - gr * 0.35, gr * 0.3);
      if (plated) {
        // Armor plate with rivets
        g.lineStyle(3, 0x8d8d8d).beginPath().arc(x, y, gr * 0.7, -2.2, 0.6, false).strokePath();
        g.fillStyle(0x5d5d5d).fillCircle(x + gr * 0.45, y + gr * 0.2, 2.5);
      }
    };
    // Outer ring: armored grapes
    if (layers >= 3) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        grape(c + Math.cos(a) * r * 0.78, c + Math.sin(a) * r * 0.78, r * 0.26, 0xc9a227, def.outline, true);
      }
    }
    // Middle ring
    if (layers >= 2) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        grape(c + Math.cos(a) * r * 0.5, c + Math.sin(a) * r * 0.5, r * 0.25, def.color, def.outline);
      }
    }
    // Core: a tight bunch, with the face on the front grape
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI;
      grape(c + Math.cos(a) * r * 0.24, c + Math.sin(a) * r * 0.24, r * 0.22, 0xf2d675, def.outline);
    }
    const fx = c + r * 0.2;
    grape(fx, c, r * 0.3, 0xf2d675, def.outline);
    for (const dy of [-0.12, 0.12]) {
      g.fillStyle(0xffffff).fillCircle(fx + r * 0.1, c + r * dy, r * 0.09);
      g.fillStyle(0x111111).fillCircle(fx + r * 0.14, c + r * dy, r * 0.045);
    }
    // Smug brows and a smirk
    g.lineStyle(3, def.outline).lineBetween(fx + r * 0.02, c - r * 0.26, fx + r * 0.18, c - r * 0.16)
      .lineBetween(fx + r * 0.02, c + r * 0.26, fx + r * 0.18, c + r * 0.16);
    g.lineStyle(3, def.outline).beginPath().arc(fx + r * 0.1, c, r * 0.17, Phaser.Math.DegToRad(-25), Phaser.Math.DegToRad(40)).strokePath();
    g.generateTexture(layers === 3 ? `germ-${def.id}` : `germ-${def.id}-${layers}`, size, size);
    g.destroy();
  }

  /**
   * An Influenza Twin: a round, balloon-like virion studded with surface spikes, its letter (H or N) on
   * its back, and big eyes. H has lollipop spikes (hemagglutinin), N mushroom ones (neuraminidase).
   */
  private makeFluTwin(def: GermDef): void {
    const r = def.radius;
    const size = (r + 16) * 2;
    const c = size / 2;
    const g = this.add.graphics();
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x0 = c + Math.cos(a) * r * 0.95, y0 = c + Math.sin(a) * r * 0.95;
      const x1 = c + Math.cos(a) * (r + 10), y1 = c + Math.sin(a) * (r + 10);
      g.lineStyle(3, def.outline).lineBetween(x0, y0, x1, y1);
      if (def.id === 'fluH') {
        g.fillStyle(0xfff3c4).fillCircle(x1, y1, 4.5);
        g.lineStyle(2, def.outline).strokeCircle(x1, y1, 4.5);
      } else {
        g.fillStyle(0xd1f2eb).slice(x1, y1, 6, a - Math.PI / 2, a + Math.PI / 2, false).fillPath();
        g.lineStyle(2, def.outline).slice(x1, y1, 6, a - Math.PI / 2, a + Math.PI / 2, false).strokePath();
      }
    }
    g.fillStyle(def.color).fillCircle(c, c, r);
    g.lineStyle(4, def.outline).strokeCircle(c, c, r);
    g.fillStyle(0xffffff, 0.35).fillEllipse(c - r * 0.35, c - r * 0.4, r * 0.55, r * 0.32);
    // Eyes facing right (+x)
    for (const dy of [-0.3, 0.3]) {
      g.fillStyle(0xffffff).fillCircle(c + r * 0.42, c + r * dy, r * 0.22);
      g.fillStyle(0x111111).fillCircle(c + r * 0.5, c + r * dy, r * 0.1);
    }
    g.lineStyle(3, def.outline).beginPath().arc(c + r * 0.25, c, r * 0.5, Phaser.Math.DegToRad(-25), Phaser.Math.DegToRad(25)).strokePath();
    // Its letter on the back half, drawn as blocks (reads sideways, which is how it travels)
    const lx = c - r * 0.4, ly = c, h = r * 0.7, w = r * 0.5, t = r * 0.14;
    const block = (x: number, y: number, bw: number, bh: number) => {
      g.fillStyle(0xffffff).fillRect(x, y, bw, bh);
      g.lineStyle(2, def.outline).strokeRect(x, y, bw, bh);
    };
    if (def.id === 'fluH') {
      block(lx - w / 2, ly - h / 2, t, h);
      block(lx + w / 2 - t, ly - h / 2, t, h);
      block(lx - w / 2 + t, ly - t / 2, w - 2 * t, t);
    } else {
      block(lx - w / 2, ly - h / 2, t, h);
      block(lx + w / 2 - t, ly - h / 2, t, h);
      g.fillStyle(0xffffff).fillPoints([
        new Phaser.Math.Vector2(lx - w / 2 + t, ly - h / 2), new Phaser.Math.Vector2(lx - w / 2 + t * 2, ly - h / 2),
        new Phaser.Math.Vector2(lx + w / 2 - t, ly + h / 2), new Phaser.Math.Vector2(lx + w / 2 - t * 2, ly + h / 2),
      ], true);
    }
    g.generateTexture(`germ-${def.id}`, size, size);
    g.destroy();
  }

  /**
   * THE LAST FAX MACHINE, from above, facing +x: a yellowed beige box, a paper tray sticking out the back,
   * the output slot in front, an angry green LCD for a face, a keypad, and the handset on its curly cord.
   */
  private makeFaxMachine(def: GermDef): void {
    const r = def.radius;
    const size = (r + 14) * 2;
    const c = size / 2;
    const g = this.add.graphics();
    const ink = def.outline;
    // Paper tray out the back, with a sheet still in it
    g.fillStyle(0x9e9682).lineStyle(3, ink).fillRect(c - r - 12, c - r * 0.55, 24, r * 1.1).strokeRect(c - r - 12, c - r * 0.55, 24, r * 1.1);
    g.fillStyle(0xffffff).fillRect(c - r - 8, c - r * 0.45, 22, r * 0.9);
    // The body: a chunky rounded box with a shadowed back half
    g.fillStyle(def.color).fillRoundedRect(c - r, c - r * 0.85, r * 2, r * 1.7, 10);
    g.fillStyle(0xbcb49c).fillRoundedRect(c - r, c - r * 0.85, r * 0.8, r * 1.7, 10);
    g.lineStyle(3, ink).strokeRoundedRect(c - r, c - r * 0.85, r * 2, r * 1.7, 10);
    // The output slot along the front, a page halfway out
    g.fillStyle(0x23211c).fillRect(c + r * 0.72, c - r * 0.6, 8, r * 1.2);
    g.fillStyle(0xffffff).lineStyle(1.5, ink).fillRect(c + r * 0.8, c - r * 0.5, 16, r).strokeRect(c + r * 0.8, c - r * 0.5, 16, r);
    // Angry LCD face
    g.fillStyle(0x23211c).fillRoundedRect(c + r * 0.05, c - r * 0.5, r * 0.55, r * 0.6, 4);
    g.fillStyle(0x9ccc65).fillRoundedRect(c + r * 0.1, c - r * 0.45, r * 0.45, r * 0.5, 3);
    g.lineStyle(3, 0x1b3a0e).lineBetween(c + r * 0.18, c - r * 0.38, c + r * 0.3, c - r * 0.3)
      .lineBetween(c + r * 0.18, c - r * 0.07, c + r * 0.3, c - r * 0.15)
      .lineBetween(c + r * 0.45, c - r * 0.38, c + r * 0.45, c - r * 0.07);
    // Keypad
    g.fillStyle(0x6d6656);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g.fillRect(c - r * 0.35 + i * 9, c + r * 0.12 + j * 8, 6, 5);
    // Handset on the side, and its curly cord
    g.fillStyle(0x4e4a3e).lineStyle(2, ink).fillRoundedRect(c - r * 0.75, c + r * 0.25, r * 0.38, r * 0.62, 6)
      .strokeRoundedRect(c - r * 0.75, c + r * 0.25, r * 0.38, r * 0.62, 6);
    g.lineStyle(2, ink);
    for (let i = 0; i < 5; i++) g.strokeCircle(c - r * 0.82 - i * 3, c + r * 0.95 + i * 2, 3);
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
    let g = this.add.graphics();
    const hex = (rad: number) => Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      return new Phaser.Math.Vector2(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
    });
    // Soft back half (lighter, squishy)
    g.fillStyle(0xf2c98a).fillPoints(hex(r), true);
    g.lineStyle(3, def.outline).strokePoints(hex(r), true);
    g.fillStyle(0xffffff, 0.3).fillCircle(c - r * 0.45, c, r * 0.25);
    // Reinforced carapace shield brow: solid outer rim covering the front 120° arc
    g.fillStyle(def.color).slice(c, c, r + 9, -Math.PI / 3, Math.PI / 3, false).fillPath();
    g.lineStyle(4, def.outline).slice(c, c, r + 9, -Math.PI / 3, Math.PI / 3, false).strokePath();
    // Armor: three heavy plates over the front 120°
    for (let i = -1; i <= 1; i++) {
      const a = i * (Math.PI / 3);
      g.fillStyle(def.color).slice(c, c, r + 8, a - 0.48, a + 0.48, false).fillPath();
      g.lineStyle(3, def.outline).slice(c, c, r + 8, a - 0.48, a + 0.48, false).strokePath();
      g.fillStyle(0xffffff, 0.35).fillCircle(c + Math.cos(a) * (r * 0.95), c + Math.sin(a) * (r * 0.95), 3.5);
    }
    // Eyes in the slit between plates
    g.fillStyle(0x1a0e04).fillEllipse(c + r * 0.25, c, r * 0.4, r * 0.9);
    for (const dy of [-0.22, 0.22]) {
      g.fillStyle(0xffe066).fillCircle(c + r * 0.3, c + r * dy, r * 0.12);
      g.fillStyle(0x111111).fillCircle(c + r * 0.34, c + r * dy, r * 0.06);
      g.fillStyle(0xffffff, 0.95).fillCircle(c + r * 0.32, c + r * (dy - 0.03), Math.max(1.2, r * 0.04));
    }
    g.generateTexture(`germ-${def.id}`, size, size);
    g.destroy();

    // FLIPPED / VULNERABLE STATE: cracked shell opened on its back, soft belly exposed with dazed eyes
    g = this.add.graphics();
    // Little flailing cilia/feet around the perimeter
    g.lineStyle(2.5, def.outline);
    for (const a of [0.4, 1.1, 1.8, 2.5, 3.2, 3.9, 4.6, 5.3, 6.0]) {
      const legX = c + Math.cos(a) * r;
      const legY = c + Math.sin(a) * r;
      const tipX = c + Math.cos(a) * (r + 7);
      const tipY = c + Math.sin(a) * (r + 7);
      g.lineBetween(legX, legY, tipX, tipY);
      g.fillStyle(def.outline).fillCircle(tipX, tipY, 2);
    }
    // Soft, squishy vulnerable underbelly (pale peach)
    g.fillStyle(0xffe4c4).fillCircle(c, c, r);
    g.lineStyle(3, 0xd49b6a).strokeCircle(c, c, r);
    // Split carapace shell halves pushed to the flanks
    for (const dy of [-1, 1]) {
      const shellY = c + dy * r * 0.65;
      g.fillStyle(def.color).fillEllipse(c - r * 0.1, shellY, r * 1.5, r * 0.45);
      g.lineStyle(3, def.outline).strokeEllipse(c - r * 0.1, shellY, r * 1.5, r * 0.45);
      // Jagged crack on the split edges
      g.lineStyle(2, def.outline);
      g.lineBetween(c - r * 0.6, c + dy * r * 0.35, c - r * 0.2, c + dy * r * 0.42);
      g.lineBetween(c - r * 0.2, c + dy * r * 0.42, c + r * 0.2, c + dy * r * 0.36);
      g.lineBetween(c + r * 0.2, c + dy * r * 0.36, c + r * 0.6, c + dy * r * 0.45);
    }
    // Soft belly highlight
    g.fillStyle(0xffffff, 0.45).fillCircle(c - r * 0.2, c, r * 0.25);
    // Dazed spiral / cross googly eyes in the center belly
    for (const dy of [-0.24, 0.24]) {
      const eyeX = c + r * 0.05;
      const eyeY = c + r * dy;
      g.fillStyle(0xffffff).fillCircle(eyeX, eyeY, r * 0.2);
      g.lineStyle(2, def.outline).strokeCircle(eyeX, eyeY, r * 0.2);
      // Dazed spiral / X pupils
      g.lineStyle(2, 0x111111);
      g.lineBetween(eyeX - 3.5, eyeY - 3.5, eyeX + 3.5, eyeY + 3.5);
      g.lineBetween(eyeX - 3.5, eyeY + 3.5, eyeX + 3.5, eyeY - 3.5);
    }
    g.generateTexture(`germ-${def.id}-flipped`, size, size);
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
      g.fillStyle(0xffffff, 0.9).fillCircle(c + r * 0.25, c + r * dy + r * 0.02, Math.max(1, r * 0.04)); // catchlight
      g.fillStyle(0x7fd3ff).fillCircle(c + r * 0.05, c + r * dy + r * 0.25, r * 0.07); // tear
    }
    // The nose: big, red, shiny
    g.fillStyle(0xe5383b).fillCircle(c + r * 0.85, c, r * 0.42);
    g.lineStyle(2, 0x7a1012).strokeCircle(c + r * 0.85, c, r * 0.42);
    g.fillStyle(0xffffff, 0.75).fillCircle(c + r * 0.95, c - r * 0.14, r * 0.12);
    g.fillStyle(0xffffff, 0.4).fillCircle(c + r * 0.82, c + r * 0.12, r * 0.06);
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
      g.fillStyle(0xffffff, 0.95).fillCircle(c + r * 0.46, c + r * (dy - 0.06), Math.max(1.2, r * 0.05));
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

  /** GERM VENT: a cracked floor grate with green ooze bubbling up (germs come in here). */
  private makeVent(): void {
    const g = this.add.graphics();
    g.fillStyle(0x1b3a1f, 0.85).fillEllipse(28, 20, 54, 34);
    g.fillStyle(0x4f7a1e).fillEllipse(28, 20, 42, 24);
    g.fillStyle(0x2c3e2f);
    for (let i = 0; i < 4; i++) g.fillRect(12 + i * 9, 10, 4, 20);
    g.fillStyle(0x9bbf3a);
    g.fillCircle(17, 14, 4).fillCircle(37, 25, 5).fillCircle(29, 9, 3);
    g.fillStyle(0xc8e66b).fillCircle(36, 24, 2).fillCircle(16, 13, 1.5);
    g.lineStyle(2, 0x0d2b2e, 0.9).strokeEllipse(28, 20, 54, 34);
    g.generateTexture('germ-vent', 56, 40);
    g.clear();
    // PRIOR AUTH barricade: a striped sawhorse with a sign on it
    g.fillStyle(0x6d4c41).fillRect(8, 30, 5, 18).fillRect(51, 30, 5, 18);
    g.fillStyle(0xffd23f).fillRoundedRect(2, 22, 60, 12, 3);
    g.fillStyle(0x222222);
    for (let i = 0; i < 5; i++) g.fillTriangle(6 + i * 12, 22, 12 + i * 12, 22, 6 + i * 12, 34);
    g.lineStyle(2, 0x0d2b2e).strokeRoundedRect(2, 22, 60, 12, 3);
    g.fillStyle(0xffffff).fillRoundedRect(14, 2, 36, 20, 3);
    g.lineStyle(2, 0xd62828).strokeRoundedRect(14, 2, 36, 20, 3);
    g.generateTexture('vent-block', 64, 50);
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

  /** Generic soft blob used for splats and mist; layered droplet tinted at runtime. */
  private makeSplat(): void {
    const g = this.add.graphics();
    // Multi-layered juicy droplet with soft halo and dense core
    g.fillStyle(0xffffff, 0.25).fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.65).fillCircle(8, 8, 5.5);
    g.fillStyle(0xffffff, 1.0).fillCircle(7.5, 7.5, 3);
    g.generateTexture('blob', 16, 16);
    g.destroy();
  }
}
