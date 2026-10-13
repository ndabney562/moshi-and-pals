import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { COLORS } from '../config/theme';
import { events, GameEvents } from '../core/events';
import { inputState } from '../core/inputState';
import { WAITING_ROOM, type Obstacle, type RoomLayout } from '../data/rooms';
import { Player } from '../entities/Player';

/** The playable world: the room, its obstacles, and Eugene. */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private room: RoomLayout = WAITING_ROOM;
  private readonly mouseWorld = new Phaser.Math.Vector2();

  constructor() {
    super('Game');
  }

  create(): void {
    const room = this.room;
    this.physics.world.setBounds(0, 0, room.width, room.height);
    this.add.tileSprite(0, 0, room.width, room.height, 'floor').setOrigin(0);

    const solids = this.physics.add.staticGroup();
    const art = this.add.graphics().setDepth(5);
    for (const o of room.obstacles) {
      this.drawObstacle(art, o);
      const zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
      solids.add(zone);
    }

    this.player = new Player(this, room.playerSpawn.x, room.playerSpawn.y);
    this.physics.add.collider(this.player, solids);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, room.width, room.height);
    cam.startFollow(this.player, true, BALANCE.camera.followLerp, BALANCE.camera.followLerp);

    this.scene.launch('Hud', { roomName: room.name });
    events.emit(GameEvents.RunStarted, { roomId: room.id });
  }

  update(_time: number, delta: number): void {
    let aimTarget: Phaser.Math.Vector2 | undefined;
    if (inputState.mouseActive) {
      aimTarget = this.cameras.main.getWorldPoint(inputState.mouseX, inputState.mouseY, this.mouseWorld);
    }
    this.player.drive(inputState, delta, aimTarget);
  }

  /** Placeholder drawing for each obstacle type. Real sprites replace this later. */
  private drawObstacle(g: Phaser.GameObjects.Graphics, o: Obstacle): void {
    const outline = 0x1b2b30;
    switch (o.kind) {
      case 'wall':
        g.fillStyle(COLORS.wall).fillRect(o.x, o.y, o.w, o.h);
        g.lineStyle(3, COLORS.wallTrim).strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);
        break;
      case 'door': {
        g.fillStyle(COLORS.doorLocked).fillRect(o.x, o.y, o.w, o.h);
        g.lineStyle(3, 0xffd166).strokeRect(o.x + 3, o.y + 3, o.w - 6, o.h - 6);
        const vertical = o.h > o.w;
        const label = this.add.text(o.x + o.w / 2, o.y + o.h / 2, `🔒 ${o.label ?? ''}`, {
          fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fff3c4',
        }).setOrigin(0.5).setDepth(6);
        if (vertical) label.setAngle(o.x < this.room.width / 2 ? 90 : -90);
        break;
      }
      case 'chairRow': {
        const count = Math.round(o.w / 54);
        for (let i = 0; i < count; i++) {
          const cx = o.x + i * 54 + 3;
          g.fillStyle(COLORS.chairDark).fillRoundedRect(cx, o.y, 48, 14, 4); // backrest
          g.fillStyle(COLORS.chair).fillRoundedRect(cx, o.y + 12, 48, 36, 6); // seat
          g.lineStyle(2, outline).strokeRoundedRect(cx, o.y, 48, 48, 6);
        }
        break;
      }
      case 'desk':
        g.fillStyle(COLORS.desk).fillRect(o.x, o.y, o.w, o.h);
        g.fillStyle(COLORS.deskTop).fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
        g.lineStyle(3, outline).strokeRect(o.x, o.y, o.w, o.h);
        break;
      case 'table':
        g.fillStyle(COLORS.table).fillRoundedRect(o.x, o.y, o.w, o.h, 10);
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 10);
        // Magazines from 2009
        g.fillStyle(0xe76f51).fillRect(o.x + 24, o.y + 20, 40, 30);
        g.fillStyle(0x2a9d8f).fillRect(o.x + 80, o.y + 34, 38, 28);
        g.fillStyle(0xf4a261).fillRect(o.x + 128, o.y + 18, 30, 40);
        break;
      case 'plant':
        g.fillStyle(COLORS.pot).fillCircle(o.x + o.w / 2, o.y + o.h / 2, o.w / 2.6);
        g.fillStyle(COLORS.plant).fillCircle(o.x + o.w / 2 - 10, o.y + o.h / 2 - 6, 18)
          .fillCircle(o.x + o.w / 2 + 10, o.y + o.h / 2 - 4, 16).fillCircle(o.x + o.w / 2, o.y + o.h / 2 + 10, 16);
        break;
      case 'waterCooler':
        g.fillStyle(0xeeeeee).fillRect(o.x, o.y, o.w, o.h);
        g.fillStyle(0x7fd3ff, 0.9).fillCircle(o.x + o.w / 2, o.y + o.h / 2, o.w / 2.8);
        g.lineStyle(2, outline).strokeRect(o.x, o.y, o.w, o.h);
        break;
    }
  }
}
