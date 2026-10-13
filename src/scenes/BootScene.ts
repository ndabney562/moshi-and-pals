import Phaser from 'phaser';
import { COLORS } from '../config/theme';

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
    this.scene.start('Title');
  }

  /** Top-down Eugene facing right (+x). 96x96, centered. */
  private makeEugene(): void {
    const g = this.add.graphics();
    const outline = 0x1b2b30;

    // Right arm reaching forward holding the squirt bottle (his right side is +y when facing +x)
    g.fillStyle(COLORS.coat).lineStyle(3, outline).fillRoundedRect(46, 56, 30, 12, 6).strokeRoundedRect(46, 56, 30, 12, 6);
    g.fillStyle(COLORS.skin).fillCircle(78, 62, 6).strokeCircle(78, 62, 6);
    // Squirt bottle: body, cap, nozzle
    g.fillStyle(COLORS.bottle).fillRoundedRect(76, 66, 14, 20, 4).strokeRoundedRect(76, 66, 14, 20, 4);
    g.fillStyle(COLORS.bottleCap).fillRect(79, 60, 8, 7).strokeRect(79, 60, 8, 7);
    g.fillStyle(COLORS.bottleCap).fillTriangle(87, 61, 94, 63, 87, 65);

    // Left arm, slightly forward
    g.fillStyle(COLORS.coat).fillRoundedRect(44, 22, 22, 12, 6).strokeRoundedRect(44, 22, 22, 12, 6);
    g.fillStyle(COLORS.skin).fillCircle(68, 28, 6).strokeCircle(68, 28, 6);

    // Lab coat (shoulders seen from above)
    g.fillStyle(COLORS.coat).fillEllipse(42, 46, 40, 66).strokeEllipse(42, 46, 40, 66);
    g.fillStyle(COLORS.coatShadow).fillEllipse(36, 46, 18, 50);
    // Scrubs collar peeking out
    g.fillStyle(COLORS.scrubs).fillCircle(50, 46, 12);

    // Head: big confident nose leading the way (important for later sinus business)
    g.fillStyle(COLORS.skin).fillCircle(48, 46, 15).strokeCircle(48, 46, 15);
    g.fillStyle(COLORS.skin).fillEllipse(64, 46, 12, 9).strokeEllipse(64, 46, 12, 9);
    // Hair on the back of the head
    g.fillStyle(COLORS.hair).beginPath().slice(46, 46, 15, Phaser.Math.DegToRad(100), Phaser.Math.DegToRad(260), false).fillPath();

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
}
