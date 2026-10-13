import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { CONTROLS } from '../config/controls';
import { COLORS } from '../config/theme';
import { events, GameEvents, type RunResult, type StationPayload } from '../core/events';
import { inputState } from '../core/inputState';
import { settings } from '../core/settings';
import { recordRun } from '../core/save';
import { initSfx, sfx } from '../core/sfx';
import { EQUIPMENT, STARTING_EQUIPMENT } from '../data/equipment';
import { GERMS } from '../data/germs';
import { WAVES } from '../data/waves';
import { WAITING_ROOM, type Obstacle, type RoomLayout } from '../data/rooms';
import { Droplet } from '../entities/Droplet';
import { Germ, type GermScaling } from '../entities/Germ';
import type { Patient } from '../entities/Patient';
import { Player } from '../entities/Player';
import { FlowField } from '../systems/FlowField';
import { Fx } from '../systems/Fx';
import { DiamondBrain, type BossHost } from '../systems/DiamondBrain';
import { PatientDirector } from '../systems/PatientDirector';
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
  private patients!: PatientDirector;
  private kills = 0;
  private score = 0;
  private runOver = false;
  /** Currency for this run. */
  private copays = 0;
  private purgeReadyAt = 0;
  private lastPurgeProgress = -1;
  private cart?: Obstacle;
  private station: StationPayload = { near: false, cost: 0, affordable: false };
  private lastJugWarningAt = -Infinity;
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
    this.copays = 0;
    this.purgeReadyAt = 0;
    this.lastPurgeProgress = -1;
    this.station = { near: false, cost: BALANCE.economy.restockCost, affordable: false };
    inputState.purgeRequested = false;
    inputState.restockRequested = false;
    this.cart = room.obstacles.find((o) => o.kind === 'supplyCart');
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
    this.patients = new PatientDirector({
      scene: this,
      player: this.player,
      room,
      spawnGermAt: (id, x, y) => this.spawnGermAt(id, x, y),
      onCleaned: (p) => this.onPatientCleaned(p),
    });

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
    // Patients are moving obstacles: solid to everyone, and they can be sprayed
    const patients = this.patients.group;
    this.physics.add.collider(patients, solids);
    this.physics.add.collider(this.player, patients);
    this.physics.add.collider(this.germs, patients);
    this.physics.add.overlap(this.droplets, patients, (d, p) => {
      const drop = d as Droplet;
      if (!drop.active) return;
      this.fx.dropletSplash(drop.x, drop.y);
      drop.retire();
      this.patients.sprayed(p as Patient);
    });

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
    events.emit(GameEvents.CopaysChanged, { copays: this.copays });
    events.emit(GameEvents.PurgeChanged, { progress: this.purgeProgress(this.time.now) });
    events.emit(GameEvents.StationNearby, this.station);
    this.sprayer.emitChanged(this.time.now);
  }

  update(time: number, delta: number): void {
    if (this.runOver) return;
    let aimTarget: { x: number; y: number } | undefined;
    if (inputState.mouseActive) {
      aimTarget = this.cameras.main.getWorldPoint(inputState.mouseX, inputState.mouseY, this.mouseWorld);
    } else if (CONTROLS.scheme === 'sprayButton' && settings.autoAim) {
      aimTarget = this.nearestGerm(CONTROLS.autoAimRange) ?? this.patients.nearestViolator(this.player.x, this.player.y, CONTROLS.autoAimRange);
    }
    this.player.drive(inputState, delta, aimTarget);
    if (this.player.regen(time, delta)) {
      events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
    }

    // Equipment
    if (inputState.refillRequested) {
      inputState.refillRequested = false;
      if (!this.sprayer.startRefill(time) && time - this.lastJugWarningAt > 1500) {
        this.lastJugWarningAt = time;
        sfx.denied();
        this.fx.number(this.player.x, this.player.y - 60, 'JUG EMPTY! Restock at SUPPLIES', '#ffb3b3', 20);
      }
    }
    if (inputState.purgeRequested) {
      inputState.purgeRequested = false;
      this.sinusPurge(time);
    }
    this.updateStation();
    if (inputState.restockRequested) {
      inputState.restockRequested = false;
      this.restock(time);
    }
    const purge = this.purgeProgress(time);
    if (Math.abs(purge - this.lastPurgeProgress) >= 0.01 || (purge === 1 && this.lastPurgeProgress !== 1)) {
      this.lastPurgeProgress = purge;
      events.emit(GameEvents.PurgeChanged, { progress: purge });
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
    this.patients.update(time, delta, this.waves.round, this.waves.roundActive, this.waves.isBossRound);
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
    const mult = this.sprayer.def.effectiveness[germ.def.tag] ?? 1;
    this.fx.dropletSplash(drop.x, drop.y);
    drop.retire();
    sfx.hit();
    this.damageGerm(germ, drop.damage * mult, drop.rotation, drop.knockback);
  }

  /** Every way a germ gets hurt goes through here: numbers, boss bar, kills, score and Copays. */
  private damageGerm(germ: Germ, damage: number, fromAngle: number, knockback: number): void {
    const time = this.time.now;
    const killed = germ.hurt(damage, fromAngle, knockback, time);
    if (this.boss?.germ === germ) this.boss.onHurt(damage, time);

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
      this.addCopays(germ.def.copays);
      this.fx.germSplat(germ.x, germ.y, germ.def.color);
      this.fx.number(germ.x, germ.y - germ.def.radius - 24, `+${germ.def.points}`, '#ffe66d', germ.def.boss ? 34 : 18);
      sfx.pop();
      if (germ.def.boss) {
        // Extra-large mess and a proper camera kick
        for (let i = 0; i < 4; i++) {
          this.fx.germSplat(germ.x + Phaser.Math.Between(-40, 40), germ.y + Phaser.Math.Between(-40, 40), germ.def.color);
        }
        this.cameras.main.shake(300, 0.01);
        this.fx.number(germ.x, germ.y + germ.def.radius, `+$${germ.def.copays} COPAYS`, '#7fffd4', 28);
        if (this.boss?.germ === germ) this.boss.onDefeated();
        events.emit(GameEvents.BossDefeated, { name: germ.def.name, hp: 0, maxHp: germ.maxHp });
      }
      events.emit(GameEvents.GermKilled, { germId: germ.def.id, x: germ.x, y: germ.y, totalKills: this.kills });
      events.emit(GameEvents.ScoreChanged, { score: this.score });
      germ.kill();
    }
  }

  private addCopays(amount: number): void {
    this.copays += amount;
    events.emit(GameEvents.CopaysChanged, { copays: this.copays });
  }

  /** 0..1 while recharging, 1 when ready. */
  private purgeProgress(time: number): number {
    const cd = BALANCE.purge.cooldownMs;
    return time >= this.purgeReadyAt ? 1 : 1 - (this.purgeReadyAt - time) / cd;
  }

  /** SINUS PURGE: a honking shockwave that hurts and blasts away every germ nearby. */
  private sinusPurge(time: number): void {
    if (time < this.purgeReadyAt || this.player.dead) return;
    const cfg = BALANCE.purge;
    this.purgeReadyAt = time + cfg.cooldownMs;
    const { x, y } = this.player;
    sfx.purge();
    this.cameras.main.shake(260, 0.012);
    this.tweens.add({ targets: this.player, scale: 1.3, duration: 90, yoyo: true });
    this.fx.number(x, y - 70, 'HRRRNNNKKK!', '#c8ff6b', 30);
    const ring = this.add.circle(x, y, cfg.radius).setStrokeStyle(14, 0xc8ff6b, 0.9).setFillStyle(0xc8ff6b, 0.15).setDepth(13).setScale(0.1);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 420, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    for (const g of this.germs.getChildren() as Germ[]) {
      if (!g.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, g.x, g.y);
      if (d > cfg.radius + g.def.radius) continue;
      const angle = Phaser.Math.Angle.Between(x, y, g.x, g.y);
      this.damageGerm(g, cfg.damage, angle, cfg.knockback);
      if (g.active) g.stun(time, cfg.stunMs);
    }
    events.emit(GameEvents.PurgeUsed);
  }

  /** Shows the RESTOCK button while Eugene stands at the supply cart. */
  private updateStation(): void {
    const c = this.cart;
    const near = !!c && !this.player.dead &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x + c.w / 2, c.y + c.h / 2) < BALANCE.economy.stationRange + c.w / 2;
    const affordable = this.copays >= BALANCE.economy.restockCost;
    if (near !== this.station.near || affordable !== this.station.affordable) {
      this.station = { near, cost: BALANCE.economy.restockCost, affordable };
      events.emit(GameEvents.StationNearby, this.station);
    }
  }

  private restock(time: number): void {
    if (!this.station.near) return;
    const cost = BALANCE.economy.restockCost;
    if (this.sprayer.reserveFull) {
      this.fx.number(this.player.x, this.player.y - 60, 'JUG ALREADY FULL', '#e8fff9', 20);
      return;
    }
    if (this.copays < cost) {
      sfx.denied();
      this.fx.number(this.player.x, this.player.y - 60, `NEED $${cost} COPAYS`, '#ffb3b3', 22);
      return;
    }
    this.addCopays(-cost);
    this.sprayer.restock(time);
    sfx.cash();
    this.fx.number(this.player.x, this.player.y - 60, `JUG RESTOCKED -$${cost}`, '#7fffd4', 22);
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

  /** A germ let loose by a patient's health code violation, at this round's toughness. */
  private spawnGermAt(id: string, x: number, y: number): void {
    const def = GERMS[id];
    const germ = this.germs.get() as Germ | null;
    if (!def || !germ) return;
    const r = Math.max(1, this.waves.round);
    germ.spawn(def, x, y, { hpMult: WAVES.hpMult(r), speedMult: WAVES.speedMult(r) });
  }

  private onPatientCleaned(p: Patient): void {
    const points = BALANCE.patients.cleanPoints;
    this.score += points;
    this.addCopays(BALANCE.economy.cleanPatientCopays);
    this.fx.number(p.x, p.y - 40, `+${points} CLEAN  +$${BALANCE.economy.cleanPatientCopays}`, '#7fffd4', 22);
    sfx.refill();
    events.emit(GameEvents.ScoreChanged, { score: this.score });
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
      case 'supplyCart': {
        // A rolling cart of alcohol jugs
        g.fillStyle(0x8f9ba3).fillRoundedRect(o.x, o.y, o.w, o.h, 6);
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 6);
        for (let i = 0; i < 3; i++) {
          g.fillStyle(0x7fd3ff).fillRoundedRect(o.x + 8 + i * 27, o.y + 8, 20, o.h - 16, 4);
          g.fillStyle(0x1565c0).fillRect(o.x + 13 + i * 27, o.y + 4, 10, 6);
        }
        this.add.text(o.x + o.w / 2, o.y - 6, `🧴 ${o.label ?? ''} $${BALANCE.economy.restockCost}`, {
          fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
          backgroundColor: '#0d2b2ecc', padding: { x: 6, y: 2 },
        }).setOrigin(0.5, 1).setDepth(6);
        break;
      }
      case 'waterCooler':
        g.fillStyle(0xeeeeee).fillRect(o.x, o.y, o.w, o.h);
        g.fillStyle(0x7fd3ff, 0.9).fillCircle(o.x + o.w / 2, o.y + o.h / 2, o.w / 2.8);
        g.lineStyle(2, outline).strokeRect(o.x, o.y, o.w, o.h);
        break;
    }
  }
}
