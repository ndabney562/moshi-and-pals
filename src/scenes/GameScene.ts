import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { COLORS } from '../config/theme';
import { events, GameEvents } from '../core/events';
import { inputState } from '../core/inputState';
import { initSfx, sfx } from '../core/sfx';
import { EQUIPMENT, STARTING_EQUIPMENT } from '../data/equipment';
import { GERMS } from '../data/germs';
import { WAITING_ROOM, type Obstacle, type RoomLayout } from '../data/rooms';
import { Droplet } from '../entities/Droplet';
import { Germ } from '../entities/Germ';
import { Player } from '../entities/Player';
import { FlowField } from '../systems/FlowField';
import { Fx } from '../systems/Fx';
import { Sprayer } from '../systems/Sprayer';

/** The playable world: the room, Eugene, his equipment, and the germs. */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private room: RoomLayout = WAITING_ROOM;
  private germs!: Phaser.Physics.Arcade.Group;
  private droplets!: Phaser.Physics.Arcade.Group;
  private sprayer!: Sprayer;
  private fx!: Fx;
  private flow!: FlowField;
  private nextFlowAt = 0;
  private readonly step = new Phaser.Math.Vector2();
  private kills = 0;
  private nextSpawnAt = 0;
  private readonly mouseWorld = new Phaser.Math.Vector2();
  private readonly nozzle = new Phaser.Math.Vector2();

  constructor() {
    super('Game');
  }

  create(): void {
    const room = this.room;
    this.kills = 0;
    this.physics.world.setBounds(0, 0, room.width, room.height);
    this.add.tileSprite(0, 0, room.width, room.height, 'floor').setOrigin(0);

    const solids = this.physics.add.staticGroup();
    const art = this.add.graphics().setDepth(5);
    for (const o of room.obstacles) {
      this.drawObstacle(art, o);
      solids.add(this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h));
    }

    this.fx = new Fx(this);
    this.flow = new FlowField(room);
    this.player = new Player(this, room.playerSpawn.x, room.playerSpawn.y);

    // Pools: created once, reused all game
    this.droplets = this.physics.add.group({ classType: Droplet, maxSize: 90, runChildUpdate: true, defaultKey: 'droplet' });
    this.germs = this.physics.add.group({ classType: Germ, maxSize: 60, defaultKey: 'germ-basic' });
    this.sprayer = new Sprayer(EQUIPMENT[STARTING_EQUIPMENT], this.droplets);

    this.physics.add.collider(this.player, solids);
    this.physics.add.collider(this.germs, solids);
    this.physics.add.collider(this.germs, this.germs);
    this.physics.add.collider(this.droplets, solids, (d) => {
      const drop = d as Droplet;
      this.fx.dropletSplash(drop.x, drop.y);
      drop.retire();
    });
    this.physics.add.overlap(this.droplets, this.germs, (d, g) => this.onDropletHit(d as Droplet, g as Germ));
    this.physics.add.overlap(this.player, this.germs, (_p, g) => this.onGermBump(g as Germ));

    const cam = this.cameras.main;
    cam.setBounds(0, 0, room.width, room.height);
    cam.startFollow(this.player, true, BALANCE.camera.followLerp, BALANCE.camera.followLerp);

    initSfx(this);
    events.on(GameEvents.EquipmentEmpty, sfx.empty);
    events.on(GameEvents.EquipmentRefilled, sfx.refill);
    this.events.once('shutdown', () => {
      events.off(GameEvents.EquipmentEmpty, sfx.empty);
      events.off(GameEvents.EquipmentRefilled, sfx.refill);
    });

    this.scene.launch('Hud', { roomName: room.name });
    this.sprayer.emitChanged(this.time.now);
    events.emit(GameEvents.RunStarted, { roomId: room.id });
  }

  update(time: number, delta: number): void {
    let aimTarget: Phaser.Math.Vector2 | undefined;
    if (inputState.mouseActive) {
      aimTarget = this.cameras.main.getWorldPoint(inputState.mouseX, inputState.mouseY, this.mouseWorld);
    }
    this.player.drive(inputState, delta, aimTarget);

    // Equipment
    if (inputState.refillRequested) {
      inputState.refillRequested = false;
      this.sprayer.startRefill(time);
    }
    this.sprayer.update(time);
    if (inputState.firing) {
      this.player.nozzle(this.nozzle);
      // Spray where Eugene is actually facing, so the stream follows his turn
      if (this.sprayer.tryFire(this.nozzle.x, this.nozzle.y, this.player.rotation, time) === 'fired') {
        this.fx.nozzleMist(this.nozzle.x, this.nozzle.y, this.player.rotation);
        sfx.spray();
      }
    }

    // Germs
    if (time >= this.nextFlowAt) {
      this.flow.update(this.player.x, this.player.y);
      this.nextFlowAt = time + BALANCE.germs.pathRefreshMs;
    }
    for (const g of this.germs.getChildren() as Germ[]) {
      if (!g.active) continue;
      // Close in directly when near; otherwise follow the path around furniture
      const near = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y) < BALANCE.germs.directChaseDistance;
      g.chase(near || !this.flow.nextStep(g.x, g.y, this.step) ? this.player : this.step, time, delta);
    }
    this.keepGermsAlive(time);
  }

  private onDropletHit(drop: Droplet, germ: Germ): void {
    if (!drop.active || !germ.active) return;
    const time = this.time.now;
    const mult = this.sprayer.def.effectiveness[germ.def.tag] ?? 1;
    const killed = germ.hurt(drop.damage * mult, drop.rotation, drop.knockback, time);
    this.fx.dropletSplash(drop.x, drop.y);
    drop.retire();
    sfx.hit();

    // Batch damage into one number every ~180 ms per germ so the screen stays readable
    if (killed || time - germ.lastNumberAt > 180) {
      this.fx.number(germ.x, germ.y - germ.def.radius, `${Math.round(germ.pendingDamage)}`);
      germ.pendingDamage = 0;
      germ.lastNumberAt = time;
    }

    if (killed) {
      this.kills++;
      this.fx.germSplat(germ.x, germ.y, germ.def.color);
      sfx.pop();
      events.emit(GameEvents.GermKilled, { germId: germ.def.id, x: germ.x, y: germ.y, totalKills: this.kills });
      germ.kill();
      this.nextSpawnAt = Math.max(this.nextSpawnAt, time + BALANCE.sandbox.respawnDelayMs);
    }
  }

  private onGermBump(germ: Germ): void {
    const time = this.time.now;
    germ.bounceFrom(this.player.x, this.player.y, time);
    this.player.flashHurt();
    sfx.bump();
    events.emit(GameEvents.PlayerBumped, { germId: germ.def.id });
  }

  /** Milestone 2 sandbox: keep a few germs around. Replaced by the wave system in M3. */
  private keepGermsAlive(time: number): void {
    if (this.germs.countActive(true) >= BALANCE.sandbox.germsAlive || time < this.nextSpawnAt) return;
    const far = this.room.germSpawns.filter(
      (p) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) >= BALANCE.sandbox.minSpawnDistance,
    );
    const spot = Phaser.Utils.Array.GetRandom(far.length ? far : this.room.germSpawns);
    const germ = this.germs.get() as Germ | null;
    if (!germ) return;
    germ.spawn(GERMS.basic, spot.x, spot.y);
    this.nextSpawnAt = time + 400;
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
