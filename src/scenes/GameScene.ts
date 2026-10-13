import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { CONTROLS } from '../config/controls';
import { COLORS } from '../config/theme';
import { events, GameEvents, type RunResult } from '../core/events';
import { inputState } from '../core/inputState';
import { settings } from '../core/settings';
import { recordRun } from '../core/save';
import { initSfx, sfx } from '../core/sfx';
import { EQUIPMENT, STARTING_EQUIPMENT } from '../data/equipment';
import { GERMS } from '../data/germs';
import { WAITING_ROOM, type Obstacle, type RoomLayout } from '../data/rooms';
import { Droplet } from '../entities/Droplet';
import { Germ, type GermScaling } from '../entities/Germ';
import { Player } from '../entities/Player';
import { FlowField } from '../systems/FlowField';
import { Fx } from '../systems/Fx';
import { DiamondBrain, type BossHost } from '../systems/DiamondBrain';
import { Sprayer } from '../systems/Sprayer';
import { WaveDirector } from '../systems/WaveDirector';

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
  private waves!: WaveDirector;
  private kills = 0;
  private score = 0;
  private runOver = false;
  /** The current boss's behavior, if a boss with a brain is (or was last) in the room. */
  private boss?: DiamondBrain;
  private readonly mouseWorld = new Phaser.Math.Vector2();
  private readonly nozzle = new Phaser.Math.Vector2();

  constructor() {
    super('Game');
  }

  create(): void {
    const room = this.room;
    this.kills = 0;
    this.score = 0;
    this.runOver = false;
    this.boss = undefined;
    inputState.firing = false;
    inputState.refillRequested = false;
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
    this.waves = new WaveDirector(this.time.now);

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
    const sounds: [string, () => void][] = [
      [GameEvents.EquipmentEmpty, sfx.empty],
      [GameEvents.EquipmentRefilled, sfx.refill],
      [GameEvents.RoundStarted, sfx.roundStart],
      [GameEvents.RoundCompleted, sfx.roundEnd],
    ];
    for (const [name, fn] of sounds) events.on(name, fn);
    this.events.once('shutdown', () => {
      for (const [name, fn] of sounds) events.off(name, fn);
      this.boss?.destroy();
      this.boss = undefined;
    });

    this.scene.launch('Hud');
    events.emit(GameEvents.RunStarted, { roomId: room.id });
  }

  /** Re-sends current health, score and equipment so a freshly started HUD can draw them. */
  broadcastState(): void {
    events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
    events.emit(GameEvents.ScoreChanged, { score: this.score });
    this.sprayer.emitChanged(this.time.now);
  }

  update(time: number, delta: number): void {
    if (this.runOver) return;
    let aimTarget: { x: number; y: number } | undefined;
    if (inputState.mouseActive) {
      aimTarget = this.cameras.main.getWorldPoint(inputState.mouseX, inputState.mouseY, this.mouseWorld);
    } else if (CONTROLS.scheme === 'sprayButton' && settings.autoAim) {
      aimTarget = this.nearestGerm(CONTROLS.autoAimRange);
    }
    this.player.drive(inputState, delta, aimTarget);
    if (this.player.regen(time, delta)) {
      events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
    }

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
    this.boss?.update(time);
    for (const g of this.germs.getChildren() as Germ[]) {
      if (!g.active) continue;
      const override = this.boss?.germ === g ? this.boss.movement() : undefined;
      if (override) {
        g.chase(override.target, time, delta, override.speed);
        continue;
      }
      // Close in directly when near; otherwise follow the path around furniture
      const near = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y) < BALANCE.germs.directChaseDistance;
      g.chase(near || !this.flow.nextStep(g.x, g.y, this.step) ? this.player : this.step, time, delta);
    }
    this.waves.update(time, this.germs.countActive(true), (id, scaling) => this.spawnGerm(id, scaling));
  }

  /** Auto-aim: the closest living germ within `range`, if any. */
  private nearestGerm(range: number): Germ | undefined {
    const priority = this.boss?.priorityTarget;
    if (priority && Phaser.Math.Distance.Between(priority.x, priority.y, this.player.x, this.player.y) < range) return priority;
    let best: Germ | undefined;
    let bestDist = range * range;
    for (const g of this.germs.getChildren() as Germ[]) {
      if (!g.active) continue;
      const d = Phaser.Math.Distance.Squared(g.x, g.y, this.player.x, this.player.y);
      if (d < bestDist) { bestDist = d; best = g; }
    }
    return best;
  }

  private onDropletHit(drop: Droplet, germ: Germ): void {
    if (!drop.active || !germ.active) return;
    const time = this.time.now;
    const mult = this.sprayer.def.effectiveness[germ.def.tag] ?? 1;
    const damage = drop.damage * mult;
    const killed = germ.hurt(damage, drop.rotation, drop.knockback, time);
    if (this.boss?.germ === germ) this.boss.onHurt(damage, time);
    this.fx.dropletSplash(drop.x, drop.y);
    drop.retire();
    sfx.hit();

    // Batch damage into one number every ~180 ms per germ so the screen stays readable
    if (killed || time - germ.lastNumberAt > 180) {
      this.fx.number(germ.x, germ.y - germ.def.radius, `${Math.round(germ.pendingDamage)}`);
      germ.pendingDamage = 0;
      germ.lastNumberAt = time;
    }

    if (germ.def.boss) {
      events.emit(GameEvents.BossHealth, { name: germ.def.name, hp: Math.max(0, germ.hp), maxHp: germ.maxHp });
    }

    if (killed) {
      this.kills++;
      this.score += germ.def.points;
      this.fx.germSplat(germ.x, germ.y, germ.def.color);
      this.fx.number(germ.x, germ.y - germ.def.radius - 24, `+${germ.def.points}`, '#ffe66d', germ.def.boss ? 34 : 18);
      sfx.pop();
      if (germ.def.boss) {
        // Extra-large mess and a proper camera kick
        for (let i = 0; i < 4; i++) {
          this.fx.germSplat(germ.x + Phaser.Math.Between(-40, 40), germ.y + Phaser.Math.Between(-40, 40), germ.def.color);
        }
        this.cameras.main.shake(300, 0.01);
        if (this.boss?.germ === germ) this.boss.onDefeated();
        events.emit(GameEvents.BossDefeated, { name: germ.def.name, hp: 0, maxHp: germ.maxHp });
      }
      events.emit(GameEvents.GermKilled, { germId: germ.def.id, x: germ.x, y: germ.y, totalKills: this.kills });
      events.emit(GameEvents.ScoreChanged, { score: this.score });
      germ.kill();
    }
  }

  private onGermBump(germ: Germ): void {
    if (this.runOver) return;
    const time = this.time.now;
    if (this.boss?.germ === germ && this.boss.ignoresContact) return;
    germ.bounceFrom(this.player.x, this.player.y, time);
    this.hurtPlayer(germ.def.contactDamage, germ.def.id);
  }

  /** Every way Eugene gets hurt goes through here: sound, shake, HUD, and death. */
  private hurtPlayer(amount: number, source: string): void {
    if (this.runOver || !this.player.takeDamage(amount, this.time.now)) return;
    sfx.hurt();
    this.cameras.main.shake(120, 0.006);
    events.emit(GameEvents.PlayerBumped, { germId: source });
    events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
    if (this.player.dead) this.endRun();
  }

  /** Places one germ at a spawn point away from Eugene. Returns false if the pool is full. */
  private spawnGerm(id: string, scaling: GermScaling): boolean {
    const def = GERMS[id];
    const germ = this.germs.get() as Germ | null;
    if (!def || !germ) return false;
    const far = this.room.germSpawns.filter(
      (p) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) >= BALANCE.spawning.minSpawnDistance,
    );
    const spot = Phaser.Utils.Array.GetRandom(far.length ? far : this.room.germSpawns);
    germ.spawn(def, spot.x, spot.y, scaling);
    if (def.brain === 'diamond') {
      this.boss?.destroy();
      this.boss = new DiamondBrain(this.bossHost(), germ);
    }
    if (def.boss) {
      sfx.bossArrives();
      events.emit(GameEvents.BossSpawned, { name: def.name, hp: germ.hp, maxHp: germ.maxHp });
    }
    return true;
  }

  /** What a boss brain is allowed to touch. */
  private bossHost(): BossHost {
    return {
      scene: this,
      player: this.player,
      exit: this.room.exit,
      spawnMinion: (id, x, y, vx, vy) => {
        const def = GERMS[id];
        const germ = this.germs.get() as Germ | null;
        if (!def || !germ) return;
        germ.spawn(def, x, y);
        germ.setVelocity(vx, vy);
      },
      damagePlayer: (amount) => this.hurtPlayer(amount, 'diamond'),
    };
  }

  /** Eugene is down: freeze the room, save the high score, show the game over screen. */
  private endRun(): void {
    this.runOver = true;
    inputState.firing = false;
    this.player.collapse();
    this.boss?.onPlayerDown();
    for (const g of this.germs.getChildren() as Germ[]) if (g.active) g.freeze();
    sfx.gameOver();
    events.emit(GameEvents.PlayerDied);

    const round = this.waves.round;
    const record = recordRun(this.score, round);
    const result: RunResult = {
      score: this.score, round, kills: this.kills,
      bestScore: Math.max(record.previous.bestScore, this.score),
      bestRound: Math.max(record.previous.bestRound, round),
      newBestScore: record.newBestScore, newBestRound: record.newBestRound,
    };
    this.time.delayedCall(1600, () => {
      this.scene.stop('Hud');
      this.scene.launch('GameOver', result);
    });
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
