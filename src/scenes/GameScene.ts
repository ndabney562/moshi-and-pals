import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { CONTROLS } from '../config/controls';
import { COLORS } from '../config/theme';
import { DEBUG } from '../core/debug';
import { useGameTime } from '../core/gameClock';
import { damp } from '../core/math';
import { events, GameEvents, type RoomPayload, type RoundPayload, type RunResult, type StationPayload, type StreakPayload } from '../core/events';
import { inputState } from '../core/inputState';
import { settings } from '../core/settings';
import { recordRun } from '../core/save';
import { initSfx, sfx } from '../core/sfx';
import { CRATE_POOL, EQUIPMENT, STARTING_EQUIPMENT } from '../data/equipment';
import { GERMS } from '../data/germs';
import { WAVES } from '../data/waves';
import { CLINIC } from '../data/clinic';
import type { FloorArea, Obstacle, RoomArea, RoomLayout, Stairway } from '../data/rooms';
import { Droplet } from '../entities/Droplet';
import { Glob } from '../entities/Glob';
import { Germ, type GermScaling } from '../entities/Germ';
import type { Patient } from '../entities/Patient';
import { Player } from '../entities/Player';
import { FlowField } from '../systems/FlowField';
import { steerSpitter, type BehaviorHost } from '../systems/GermBehaviors';
import { Puddles } from '../systems/Puddles';
import { Fx } from '../systems/Fx';
import { DiamondBrain, type BossHost } from '../systems/DiamondBrain';
import { PatientDirector } from '../systems/PatientDirector';
import { Sprayer } from '../systems/Sprayer';
import { WaveDirector } from '../systems/WaveDirector';

/** A door still waiting to be bought open, with the pieces to remove when it is. */
interface LockedDoor {
  o: Obstacle;
  zone: Phaser.GameObjects.Zone;
  art: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

/** What the USE button would act on right now. */
type Interactable = { kind: 'cart'; o: Obstacle } | { kind: 'door'; door: LockedDoor } | { kind: 'crate'; o: Obstacle };

/** How far (x, y) is from the edge of a rectangle; 0 inside it. */
const rectDistance = (o: Obstacle, x: number, y: number): number =>
  Math.hypot(Math.max(o.x - x, 0, x - (o.x + o.w)), Math.max(o.y - y, 0, y - (o.y + o.h)));

/** The playable world: the clinic, Eugene, his equipment, and the germs. */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private room: RoomLayout = CLINIC;
  /** No stairs again until then (so Eugene doesn't bounce straight back). */
  private stairsReadyAt = 0;
  private currentFloor?: FloorArea;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  /** Rooms bought open so far this run (starts with the waiting room). */
  private unlocked = new Set<string>();
  private lockedDoors: LockedDoor[] = [];
  /** Dark overlay on each locked room, faded out when it opens. */
  private fog = new Map<string, Phaser.GameObjects.GameObject[]>();
  private currentRoom?: RoomArea;
  private interactTarget?: Interactable;
  private germs!: Phaser.Physics.Arcade.Group;
  private droplets!: Phaser.Physics.Arcade.Group;
  /** Sneezer mucus globs in flight, and the puddles they leave. */
  private globs!: Phaser.Physics.Arcade.Group;
  private puddles!: Puddles;
  private behaviorHost!: BehaviorHost;
  /** Tools carried: the bottle, plus one from a supply crate. */
  private loadout: Sprayer[] = [];
  private slot = 0;
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
  private carts: Obstacle[] = [];
  private crates: Obstacle[] = [];
  private station: StationPayload = { near: false, label: '', affordable: false, hold: false, note: '' };
  private lastJugWarningAt = -Infinity;
  /** The current boss's behavior, if a boss with a brain is (or was last) in the room. */
  private boss?: DiamondBrain;
  private readonly mouseWorld = new Phaser.Math.Vector2();
  /** SANITATION STREAK: kills in a row (each within BALANCE.streak.windowMs of the last). */
  private streak = 0;
  private streakUntil = 0;
  private lastStreakLeft = -1;
  /** Eugene got hurt this round (no Spotless bonus). */
  private hurtThisRound = false;
  /** Auto-aim's current target; kept unless another visible germ is clearly closer (no flip-flopping). */
  private aimLock?: Germ;
  private readonly nozzle = new Phaser.Math.Vector2();

  constructor() {
    super('Game');
  }

  create(): void {
    // time.now stops while paused, so cooldowns and timers don't run out in the background
    useGameTime(this);
    const room = this.room;
    this.kills = 0;
    this.score = 0;
    this.runOver = false;
    this.boss = undefined;
    this.copays = DEBUG.copays;
    this.purgeReadyAt = 0;
    this.lastPurgeProgress = -1;
    this.station = { near: false, label: '', affordable: false, hold: false, note: '' };
    inputState.purgeRequested = false;
    inputState.interactRequested = false;
    this.carts = room.obstacles.filter((o) => o.kind === 'supplyCart');
    this.crates = room.obstacles.filter((o) => o.kind === 'crate');
    inputState.swapRequested = false;
    this.unlocked = new Set(room.rooms.filter((r) => r.start).map((r) => r.id));
    this.lockedDoors = [];
    this.fog = new Map();
    this.currentRoom = undefined;
    this.interactTarget = undefined;
    this.aimLock = undefined;
    this.streak = 0;
    this.streakUntil = 0;
    this.lastStreakLeft = -1;
    this.hurtThisRound = false;
    inputState.firing = false;
    inputState.refillRequested = false;
    this.physics.world.setBounds(0, 0, room.width, room.height);
    this.add.tileSprite(0, 0, room.width, room.height, 'floor').setOrigin(0);

    this.drawFloors();
    const solids = (this.solids = this.physics.add.staticGroup());
    const art = this.add.graphics().setDepth(5);
    for (const o of room.obstacles) {
      const zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
      solids.add(zone);
      if (o.opens) this.lockedDoors.push(this.drawLockedDoor(o, zone));
      else this.drawObstacle(art, o);
    }

    this.fx = new Fx(this);
    this.flow = new FlowField(room.width, room.height, this.blockingObstacles());
    this.player = new Player(this, room.playerSpawn.x, room.playerSpawn.y);

    // Pools: created once, reused all game
    this.droplets = this.physics.add.group({ classType: Droplet, maxSize: 90, runChildUpdate: true, defaultKey: 'droplet' });
    this.germs = this.physics.add.group({ classType: Germ, maxSize: 60, defaultKey: 'germ-basic' });
    this.globs = this.physics.add.group({ classType: Glob, maxSize: 16, defaultKey: 'glob' });
    this.puddles = new Puddles(this);
    this.behaviorHost = {
      player: this.player,
      flow: this.flow,
      telegraphSneeze: (g) => {
        sfx.sneezeWindup();
        this.fx.number(g.x, g.y - g.def.radius - 14, 'AH... AH...', '#ffb3b3', 16);
      },
      fireGlob: (g, angle) => this.fireGlob(g, angle),
    };
    this.loadout = [new Sprayer(EQUIPMENT[STARTING_EQUIPMENT], this.droplets)];
    this.slot = 0;
    this.waves = new WaveDirector(this.time.now, DEBUG.startRound);
    this.patients = new PatientDirector({
      scene: this,
      player: this.player,
      room,
      // Patients wander the biggest part of the starting room
      area: room.rooms.filter((r) => r.start).sort((a, b) => b.w * b.h - a.w * a.h)[0] ?? room.rooms[0],
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
    this.physics.add.collider(this.globs, solids, (gl) => this.globLands(gl as Glob));
    this.physics.add.overlap(this.player, this.globs, (_p, gl) => {
      const glob = gl as Glob;
      if (!glob.active) return;
      this.hurtPlayer(glob.damage, 'sneezer');
      this.globLands(glob, this.player.x, this.player.y);
    });
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
    this.currentFloor = undefined;
    this.stairsReadyAt = 0;
    this.fitCameraToFloor(true);
    this.flow.setPortals(this.stairLinks());
    cam.startFollow(this.player, true, BALANCE.camera.followLerp, BALANCE.camera.followLerp);

    initSfx(this);
    const sounds: [string, () => void][] = [
      [GameEvents.EquipmentEmpty, sfx.empty],
      [GameEvents.EquipmentRefilled, sfx.refill],
      [GameEvents.RoundStarted, sfx.roundStart],
      [GameEvents.RoundCompleted, sfx.roundEnd],
    ];
    for (const [name, fn] of sounds) events.on(name, fn);
    const onRoundStart = () => { this.hurtThisRound = false; };
    const onRoundDone = (p: RoundPayload) => this.onRoundCompleted(p.round);
    events.on(GameEvents.RoundStarted, onRoundStart);
    events.on(GameEvents.RoundCompleted, onRoundDone);
    this.events.once('shutdown', () => {
      events.off(GameEvents.RoundStarted, onRoundStart);
      events.off(GameEvents.RoundCompleted, onRoundDone);
      for (const [name, fn] of sounds) events.off(name, fn);
      this.boss?.destroy();
      this.boss = undefined;
    });

    this.scene.launch('Hud');
    events.emit(GameEvents.RunStarted, { roomId: room.id });
  }

  /** Eugene is down and the game over screen is on its way. */
  get isRunOver(): boolean {
    return this.runOver;
  }

  /** Re-sends current health, score and equipment so a freshly started HUD can draw them. */
  broadcastState(): void {
    events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
    events.emit(GameEvents.ScoreChanged, { score: this.score });
    events.emit(GameEvents.CopaysChanged, { copays: this.copays });
    this.emitStreak(Math.max(0, this.lastStreakLeft));
    events.emit(GameEvents.PurgeChanged, { progress: this.purgeProgress(this.time.now) });
    events.emit(GameEvents.StationNearby, this.station);
    if (this.currentRoom) events.emit(GameEvents.RoomEntered, { id: this.currentRoom.id, name: this.currentRoom.name });
    this.sprayer.emitChanged(this.time.now);
  }

  update(_loopTime: number, delta: number): void {
    if (this.runOver) return;
    // Game time (excludes pauses), not the loop's wall-clock time; see core/gameClock
    const time = this.time.now;
    let aimTarget: { x: number; y: number } | undefined;
    if (inputState.mouseActive) {
      aimTarget = this.cameras.main.getWorldPoint(inputState.mouseX, inputState.mouseY, this.mouseWorld);
    } else if (CONTROLS.scheme === 'sprayButton' && settings.autoAim) {
      const { x, y } = this.player;
      aimTarget = this.nearestGerm(CONTROLS.autoAimRange)
        ?? this.patients.nearestViolator(x, y, CONTROLS.autoAimRange, (p) => this.flow.lineClear(x, y, p.x, p.y));
    }
    this.player.drive(inputState, delta, aimTarget);
    // Camera follow eases per frame in Phaser; keep it the same at any frame rate
    const follow = damp(BALANCE.camera.followLerp, delta);
    this.cameras.main.setLerp(follow, follow);
    if (this.player.regen(time, delta)) {
      events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
    }

    // Equipment
    if (inputState.refillRequested) {
      inputState.refillRequested = false;
      this.refillPressed(time);
    }
    if (inputState.purgeRequested) {
      inputState.purgeRequested = false;
      this.sinusPurge(time);
    }
    this.updateStairs(time);
    this.fitCameraToFloor();
    this.updateRoom();
    this.updateInteract();
    if (inputState.interactRequested) {
      inputState.interactRequested = false;
      this.interact(time);
    }
    const purge = this.purgeProgress(time);
    if (Math.abs(purge - this.lastPurgeProgress) >= 0.01 || (purge === 1 && this.lastPurgeProgress !== 1)) {
      this.lastPurgeProgress = purge;
      events.emit(GameEvents.PurgeChanged, { progress: purge });
    }
    if (inputState.swapRequested) {
      inputState.swapRequested = false;
      this.swapTool(time);
    }
    for (const tool of this.loadout) tool.update(time);
    if (inputState.firing) {
      this.player.nozzle(this.nozzle);
      // Spray where Eugene is actually facing, so the stream follows his turn
      const shot = this.sprayer.tryFire(this.nozzle.x, this.nozzle.y, this.player.rotation, time);
      if (shot === 'fired') {
        const d = this.sprayer.def;
        this.fx.nozzleMist(this.nozzle.x, this.nozzle.y, this.player.rotation, d.spreadDeg, d.color, d.mistPuffs);
        sfx.spray();
      } else if (shot === 'empty' && settings.autoRefill) {
        this.startRefill(time);
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
      if (g.def.spit) {
        steerSpitter(g, this.behaviorHost, time, delta, this.step);
        continue;
      }
      // Close in directly when near; otherwise follow the path around furniture
      const near = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y) < BALANCE.germs.directChaseDistance;
      g.chase(near || !this.flow.nextStep(g.x, g.y, this.step) ? this.player : this.step, time, delta);
    }
    this.waves.update(time, this.germs.countActive(true), (id, scaling) => this.spawnGerm(id, scaling), (id) => this.aliveOf(id));
    // Globs that fly their full range splat where they stop; puddles slow Eugene
    for (const gl of this.globs.getChildren() as Glob[]) if (gl.active && time >= gl.expiresAt) this.globLands(gl);
    const slow = this.puddles.update(time, this.player.x, this.player.y);
    this.player.setSpeedMod('puddle', slow < 1 ? slow : null);
    this.patients.update(time, delta, this.waves.round, this.waves.spawning, this.waves.isBossRound);
    this.updateStreak(time);
  }

  /** Living germs of one type (for WAVES.aliveLimit). */
  private aliveOf(id: string): number {
    let n = 0;
    for (const g of this.germs.getChildren() as Germ[]) if (g.active && g.def.id === id) n++;
    return n;
  }

  /** CHOO! A Sneezer launches a mucus glob. */
  private fireGlob(g: Germ, angle: number): void {
    const s = g.def.spit;
    const glob = this.globs.get() as Glob | null;
    if (!s || !glob) return;
    const r = g.def.radius + 10;
    glob.fire(g.x + Math.cos(angle) * r, g.y + Math.sin(angle) * r, angle, s.globSpeed, s.globRange, this.time.now);
    glob.damage = s.damage;
    glob.puddleMs = s.puddleMs;
    glob.puddleRadius = s.puddleRadius;
    glob.puddleSlow = s.puddleSlow;
    sfx.sneeze();
    this.fx.number(g.x, g.y - g.def.radius - 14, 'CHOO!', '#d7e88a', 22);
  }

  /** A glob hits something (or runs out of range) and leaves a slippery puddle. */
  private globLands(glob: Glob, x = glob.x, y = glob.y): void {
    if (!glob.active) return;
    glob.retire();
    this.puddles.add(x, y, glob.puddleRadius, glob.puddleMs, glob.puddleSlow, this.time.now);
    this.fx.germSplat(x, y, 0xa8c94a);
    sfx.splat();
  }

  /**
   * Armor (Spore Pod): damage multiplier for a hit travelling at `travelAngle`. Hits on its front arc
   * are mostly blocked, hits on its back hurt extra. Piercing tools (UV) and a flipped pod ignore the armor.
   */
  armorMult(germ: Germ, travelAngle: number, piercing: boolean, time: number): number {
    const a = germ.def.armor;
    if (!a || piercing) return 1;
    if (germ.isFlipped(time)) return a.back;
    // Direction from the germ back toward whoever sprayed it, compared with the way it faces
    const diff = Math.abs(Phaser.Math.Angle.Wrap(travelAngle + Math.PI - germ.rotation));
    if (diff <= Phaser.Math.DegToRad(a.frontArcDeg / 2)) return a.front;
    if (diff >= Math.PI - Phaser.Math.DegToRad(60)) return a.back;
    return 1;
  }

  /** Copay multiplier from the current Sanitation Streak. */
  private get streakMult(): number {
    const c = BALANCE.streak;
    return Math.min(c.maxMult, 1 + c.multPerStep * Math.floor(this.streak / c.killsPerStep));
  }

  private emitStreak(left: number): void {
    events.emit(GameEvents.StreakChanged, { count: this.streak, mult: this.streakMult, left } satisfies StreakPayload);
  }

  /** Counts the streak's clock down (for the HUD bar) and ends it when time runs out. */
  private updateStreak(time: number): void {
    if (this.streak === 0) return;
    const left = (this.streakUntil - time) / BALANCE.streak.windowMs;
    if (left > 0) {
      if (Math.abs(left - this.lastStreakLeft) >= 0.03) {
        this.lastStreakLeft = left;
        this.emitStreak(left);
      }
      return;
    }
    if (this.streak >= BALANCE.streak.announceFrom) {
      this.fx.number(this.player.x, this.player.y - 80, `STREAK OF ${this.streak}!`, '#ffe66d', 26);
    }
    this.streak = 0;
    this.lastStreakLeft = -1;
    this.emitStreak(0);
  }

  /** SPOTLESS: a round finished without a scratch pays a bonus. */
  private onRoundCompleted(round: number): void {
    if (this.hurtThisRound || this.runOver) return;
    const bonus = BALANCE.economy.spotlessPerRound * round;
    this.addCopays(bonus);
    sfx.spotless();
    this.fx.number(this.player.x, this.player.y - 90, `SPOTLESS! +$${bonus}`, '#7fffd4', 30);
    events.emit(GameEvents.SpotlessRound, { round, copays: bonus });
  }

  /** For the HUD's off-screen arrows: every germ (check `active`) and Eugene. */
  get threatSources(): { germs: Germ[]; player: Player; floor?: FloorArea } {
    return { germs: this.germs.getChildren() as Germ[], player: this.player, floor: this.currentFloor };
  }

  /** Live entity counts for the debug perf overlay. */
  stats(): { germs: number; droplets: number; particles: number; patients: number } {
    return {
      germs: this.germs.countActive(true),
      droplets: this.droplets.countActive(true),
      particles: this.fx.aliveParticles(),
      patients: this.patients.group.countActive(true),
    };
  }

  /** REFILL pressed: start pouring, or (mid-pour) try for a Perfect Pour. */
  refillPressed(time: number): void {
    const result = this.sprayer.pourTap(time);
    if (result === 'perfect') {
      sfx.spotless();
      this.cameras.main.shake(90, 0.003);
      this.fx.number(this.player.x, this.player.y - 64, 'PERFECT POUR! FRESH BOTTLE', '#ffe66d', 24);
    } else if (result === 'spill') {
      sfx.denied();
      this.fx.number(this.player.x, this.player.y - 64, 'SPILLED!', '#ffb3b3', 22);
    } else {
      this.startRefill(time);
    }
  }

  /** Starts a refill from the jug, warning (now and then) when the jug is dry. */
  private startRefill(time: number): void {
    if (!this.sprayer.startRefill(time) && time - this.lastJugWarningAt > 1500) {
      this.lastJugWarningAt = time;
      sfx.denied();
      this.fx.number(this.player.x, this.player.y - 60, 'JUG EMPTY! Restock at a SUPPLIES cart', '#ffb3b3', 20);
    }
  }

  /**
   * Auto-aim: the closest living germ within `range` that Eugene can actually see (no aiming at walls).
   * Sticks with its current target unless another is clearly closer, so Eugene doesn't twitch between two.
   */
  private nearestGerm(range: number): Germ | undefined {
    const { x, y } = this.player;
    const priority = this.boss?.priorityTarget;
    if (priority && Phaser.Math.Distance.Between(priority.x, priority.y, x, y) < range) return priority;
    const r2 = range * range;
    let best: Germ | undefined;
    let bestDist = r2;
    for (const g of this.germs.getChildren() as Germ[]) {
      if (!g.active) continue;
      const d = Phaser.Math.Distance.Squared(g.x, g.y, x, y);
      if (d < bestDist && this.flow.lineClear(x, y, g.x, g.y)) { bestDist = d; best = g; }
    }
    const lock = this.aimLock;
    if (lock && lock !== best && lock.active) {
      const d = Phaser.Math.Distance.Squared(lock.x, lock.y, x, y);
      const k = CONTROLS.aimStickiness * CONTROLS.aimStickiness;
      if (d < r2 && (!best || bestDist > d * k) && this.flow.lineClear(x, y, lock.x, lock.y)) best = lock;
    }
    this.aimLock = best;
    return best;
  }

  private onDropletHit(drop: Droplet, germ: Germ): void {
    if (!drop.active || !germ.active) return;
    if (drop.hit.has(germ)) return; // a piercing beam already hit this one
    const def = drop.def;
    const mult = def.effectiveness[germ.def.tag] ?? 1;
    this.fx.dropletSplash(drop.x, drop.y);
    if (drop.pierceLeft > 0) {
      drop.pierceLeft--;
      drop.hit.add(germ);
    } else {
      drop.retire();
    }
    // STAT! critical hit
    const fb = BALANCE.feedback;
    const crit = Math.random() < fb.critChance;
    if (crit) {
      germ.pendingCrit = true;
      sfx.crit();
    } else {
      sfx.hit();
    }
    if (def.slow && !germ.def.boss) germ.slow(this.time.now, def.slow.factor, def.slow.ms);
    const time = this.time.now;
    const armor = this.armorMult(germ, drop.rotation, (def.pierce ?? 0) > 0, time);
    if (armor < 1 && time - germ.lastBlockAt > 350) {
      germ.lastBlockAt = time;
      sfx.tink();
      this.fx.number(germ.x, germ.y - germ.def.radius - 10, 'TINK! GET BEHIND IT', '#c8d6e5', 15);
    }
    this.damageGerm(germ, drop.damage * mult * armor * (crit ? fb.critMult : 1), drop.rotation, drop.knockback * (armor < 1 ? 0.3 : 1));
  }

  /** Every way a germ gets hurt goes through here: numbers, boss bar, kills, score and Copays. */
  private damageGerm(germ: Germ, damage: number, fromAngle: number, knockback: number): void {
    const time = this.time.now;
    const killed = germ.hurt(damage, fromAngle, knockback, time);
    if (this.boss?.germ === germ) this.boss.onHurt(damage, time);

    // Batch damage into one number every ~180 ms per germ so the screen stays readable
    if (killed || time - germ.lastNumberAt > 180) {
      const n = Math.round(germ.pendingDamage);
      if (germ.pendingCrit) this.fx.number(germ.x, germ.y - germ.def.radius, `STAT! ${n}`, '#ffe66d', 24);
      else this.fx.number(germ.x, germ.y - germ.def.radius, `${n}`);
      germ.pendingCrit = false;
      germ.pendingDamage = 0;
      germ.lastNumberAt = time;
    }

    if (germ.def.boss) {
      events.emit(GameEvents.BossHealth, { name: germ.def.name, hp: Math.max(0, germ.hp), maxHp: germ.maxHp });
    }

    if (killed) {
      this.kills++;
      this.score += germ.def.points;
      // Sanitation Streak: each kill extends it and may raise the Copay multiplier
      this.streak++;
      this.streakUntil = time + BALANCE.streak.windowMs;
      this.lastStreakLeft = 1;
      this.emitStreak(1);
      this.addCopays(Math.round(germ.def.copays * this.streakMult));
      this.fx.germSplat(germ.x, germ.y, germ.def.color);
      this.fx.germPop(germ.texture.key, germ.x, germ.y, germ.rotation, germ.scaleX, germ.y - germ.def.radius - 8, !!germ.def.boss);
      this.fx.number(germ.x, germ.y - germ.def.radius - 24, `+${germ.def.points}`, '#ffe66d', germ.def.boss ? 34 : 18);
      sfx.pop(this.streak);
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
      // Spore Pods get knocked onto their backs: no armor, no moving
      if (g.active && g.def.armor) {
        g.flip(time, g.def.armor.flipMs);
        sfx.flip();
        this.fx.number(g.x, g.y - g.def.radius - 10, 'FLIPPED!', '#ffe66d', 18);
      }
    }
    events.emit(GameEvents.PurgeUsed);
  }

  /** The floor of the building a point is on. */
  floorOf(x: number, y: number): FloorArea | undefined {
    return this.room.floors?.find((f) => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h);
  }

  /** Keeps the camera inside the floor Eugene is on (snapping there right after taking the stairs). */
  private fitCameraToFloor(snap = false): void {
    const f = this.floorOf(this.player.x, this.player.y);
    const cam = this.cameras.main;
    if (!f) {
      cam.setBounds(0, 0, this.room.width, this.room.height);
      return;
    }
    if (f === this.currentFloor) return;
    this.currentFloor = f;
    cam.setBounds(f.x, f.y, f.w, f.h);
    if (snap) cam.centerOn(this.player.x, this.player.y);
  }

  private stairsOpen(s: Stairway): boolean {
    return s.requires.every((id) => this.unlocked.has(id));
  }

  /** Flow-field links for the open staircases: stand in one end, come out at the other. */
  private stairLinks(): { from: { x: number; y: number }; to: { x: number; y: number } }[] {
    const links: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
    const mid = (z: { x: number; y: number; w: number; h: number }) => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 });
    for (const s of this.room.stairs ?? []) {
      if (!this.stairsOpen(s)) continue;
      links.push({ from: mid(s.a.zone), to: s.a.arrive }, { from: mid(s.b.zone), to: s.b.arrive });
    }
    return links;
  }

  /** The staircase end whose zone contains (x, y), if its stairs are open. */
  private stairAt(x: number, y: number): { arrive: { x: number; y: number } } | undefined {
    for (const s of this.room.stairs ?? []) {
      if (!this.stairsOpen(s)) continue;
      for (const end of [s.a, s.b]) {
        const z = end.zone;
        if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return end;
      }
    }
    return undefined;
  }

  /** Stairs: Eugene walks into one end and comes out on the other floor; germs follow him the same way. */
  private updateStairs(time: number): void {
    const p = this.player;
    if (!p.dead && time >= this.stairsReadyAt) {
      const end = this.stairAt(p.x, p.y);
      if (end) {
        this.stairsReadyAt = time + 600;
        (p.body as Phaser.Physics.Arcade.Body).reset(end.arrive.x, end.arrive.y);
        this.fitCameraToFloor(true);
        const f = this.floorOf(p.x, p.y);
        this.fx.number(p.x, p.y - 70, f?.id === 'up' ? 'UPSTAIRS' : 'DOWNSTAIRS', '#e8fff9', 24);
        sfx.refill();
      }
    }
    const here = this.floorOf(p.x, p.y);
    for (const g of this.germs.getChildren() as Germ[]) {
      if (!g.active || g.def.boss) continue;
      const end = this.stairAt(g.x, g.y);
      if (end && this.floorOf(g.x, g.y) !== here) (g.body as Phaser.Physics.Arcade.Body).reset(end.arrive.x, end.arrive.y);
    }
  }

  /** Tracks which room Eugene is in, for the HUD and Diamond. */
  private updateRoom(): void {
    const { x, y } = this.player;
    const here = this.room.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    if (here && here !== this.currentRoom) {
      this.currentRoom = here;
      events.emit(GameEvents.RoomEntered, { id: here.id, name: here.name } satisfies RoomPayload);
    }
  }

  /** Shows the USE button while Eugene stands at a supply cart or a locked door. */
  private updateInteract(): void {
    const { x, y } = this.player;
    let target: Interactable | undefined;
    let best = BALANCE.economy.interactRange;
    if (!this.player.dead) {
      for (const o of this.carts) {
        const d = rectDistance(o, x, y);
        if (d < best) { best = d; target = { kind: 'cart', o }; }
      }
      for (const door of this.lockedDoors) {
        const d = rectDistance(door.o, x, y);
        if (d < best) { best = d; target = { kind: 'door', door }; }
      }
      for (const o of this.crates) {
        const d = rectDistance(o, x, y);
        if (d < best) { best = d; target = { kind: 'crate', o }; }
      }
    }
    this.interactTarget = target;
    const eco = BALANCE.economy;
    const cost = !target ? 0 : target.kind === 'cart' ? eco.restockCost : target.kind === 'crate' ? eco.crateCost : target.door.o.cost ?? 0;
    const verb = !target ? '' : target.kind === 'cart' ? 'RESTOCK' : target.kind === 'crate' ? 'CRATE' : 'OPEN';
    const label = target ? `${verb}\n$${cost}` : '';
    // A crate replaces the crate tool you're carrying; say so, and make it a press-and-hold
    const replaces = target?.kind === 'crate' && this.loadout[1] ? this.loadout[1].def.name : '';
    const station: StationPayload = {
      near: !!target, label, affordable: this.copays >= cost,
      hold: !!target && (cost >= eco.holdToBuyFrom || !!replaces),
      note: replaces ? `Replaces your ${replaces}` : '',
    };
    const s = this.station;
    if (station.near !== s.near || station.label !== s.label || station.affordable !== s.affordable || station.hold !== s.hold || station.note !== s.note) {
      this.station = station;
      events.emit(GameEvents.StationNearby, station);
    }
  }

  private interact(time: number): void {
    const t = this.interactTarget;
    if (!t) return;
    if (t.kind === 'cart') this.restock(time);
    else if (t.kind === 'crate') this.openCrate(t.o, time);
    else this.buyDoor(t.door);
  }

  private restock(time: number): void {
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

  /** The tool in Eugene's hands. */
  get sprayer(): Sprayer {
    return this.loadout[this.slot];
  }

  /** Switches between the bottle and the crate tool. */
  private swapTool(time: number): void {
    if (this.loadout.length < 2 || this.player.dead) return;
    this.slot = (this.slot + 1) % this.loadout.length;
    sfx.refill();
    this.fx.number(this.player.x, this.player.y - 60, this.sprayer.def.name.toUpperCase(), '#e8fff9', 20);
    this.sprayer.emitChanged(time);
  }

  /** SUPPLY CRATE: pay Copays, get a random tool you don't already have. It replaces your old crate tool. */
  private openCrate(o: Obstacle, time: number): void {
    const cost = BALANCE.economy.crateCost;
    if (this.copays < cost) {
      sfx.denied();
      this.fx.number(this.player.x, this.player.y - 60, `NEED $${cost} COPAYS`, '#ffb3b3', 22);
      return;
    }
    const held = this.loadout.map((t) => t.def.id);
    const options = CRATE_POOL.filter((id) => !held.includes(id));
    const def = EQUIPMENT[Phaser.Utils.Array.GetRandom(options.length ? options : CRATE_POOL)];
    this.addCopays(-cost);
    const tool = new Sprayer(def, this.droplets);
    this.loadout[1] = tool;
    this.slot = 1;
    for (const t of this.loadout) t.slots = this.loadout.length;
    sfx.cash();
    this.cameras.main.shake(160, 0.006);
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    this.fx.germSplat(cx, cy, def.color);
    this.fx.number(cx, cy - 50, def.name.toUpperCase() + '!', '#ffe66d', 30);
    events.emit(GameEvents.ToolUnlocked, { name: def.name });
    tool.emitChanged(time);
  }

  private buyDoor(door: LockedDoor): void {
    const cost = door.o.cost ?? 0;
    if (this.copays < cost) {
      sfx.denied();
      this.fx.number(this.player.x, this.player.y - 60, `NEED $${cost} COPAYS`, '#ffb3b3', 22);
      return;
    }
    this.addCopays(-cost);
    this.unlockRoom(door.o.opens!, cost);
  }

  /** Opens every door into a room, lets germs path (and spawn) there, and lifts its fog. */
  unlockRoom(id: string, cost = 0): void {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    for (const d of this.lockedDoors.filter((d) => d.o.opens === id)) {
      this.solids.remove(d.zone, true, true);
      d.art.destroy();
      d.label.destroy();
      this.fx.number(d.o.x + d.o.w / 2, d.o.y + d.o.h / 2, 'OPEN!', '#7fffd4', 26);
    }
    this.lockedDoors = this.lockedDoors.filter((d) => d.o.opens !== id);
    this.flow.rebuild(this.blockingObstacles());
    this.flow.setPortals(this.stairLinks());
    for (const obj of this.fog.get(id) ?? []) {
      this.tweens.add({ targets: obj, alpha: 0, duration: 500, onComplete: () => obj.destroy() });
    }
    this.fog.delete(id);
    sfx.cash();
    const area = this.room.rooms.find((r) => r.id === id);
    events.emit(GameEvents.RoomUnlocked, { id, name: area?.name ?? id, cost } satisfies RoomPayload);
  }

  /** Everything solid right now: furniture, walls, and doors not yet bought. */
  private blockingObstacles(): Obstacle[] {
    return this.room.obstacles.filter((o) => !(o.opens && this.unlocked.has(o.opens)));
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
    if (DEBUG.god) return;
    if (this.runOver || !this.player.takeDamage(amount, this.time.now)) return;
    this.hurtThisRound = true;
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
    // Germs come in through every room that's open, but not right on top of Eugene or miles away
    const { minSpawnDistance, maxSpawnDistance } = BALANCE.spawning;
    const spots = this.room.rooms.filter((r) => this.unlocked.has(r.id)).flatMap((r) => r.germSpawns);
    const dist = (p: { x: number; y: number }) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y);
    const far = spots.filter((p) => dist(p) >= minSpawnDistance);
    const ideal = far.filter((p) => dist(p) <= maxSpawnDistance);
    const spot = Phaser.Utils.Array.GetRandom(ideal.length ? ideal : far.length ? far : spots);
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
    const r = Math.max(1, this.waves.round);
    // Same on-screen cap as wave spawns, so violations can't flood the room
    if (this.germs.countActive(true) >= WAVES.maxAlive(r)) return;
    const def = GERMS[id];
    const germ = this.germs.get() as Germ | null;
    if (!def || !germ) return;
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
      canMeet: () => !!this.currentRoom?.start,
    };
  }

  /** Eugene is down: freeze the room, save the high score, show the game over screen. */
  private endRun(): void {
    this.runOver = true;
    inputState.firing = false;
    this.player.collapse();
    this.boss?.onPlayerDown();
    for (const g of this.germs.getChildren() as Germ[]) if (g.active) g.freeze();
    for (const gl of this.globs.getChildren() as Glob[]) if (gl.active) gl.retire();
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

  /** A door's sign, turned to read along vertical doors. */
  private doorLabel(o: Obstacle, text: string): Phaser.GameObjects.Text {
    const label = this.add.text(o.x + o.w / 2, o.y + o.h / 2, text, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fff3c4',
    }).setOrigin(0.5).setDepth(8);
    if (o.h > o.w) label.setAngle(o.x < this.room.width / 2 ? 90 : -90);
    return label;
  }

  private furnitureLabel(o: Obstacle): void {
    this.add.text(o.x + o.w / 2, o.y + o.h / 2, o.label ?? '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#1b2b30',
    }).setOrigin(0.5).setDepth(6);
  }

  /** A door that can be bought open, drawn on its own so it can be removed. */
  private drawLockedDoor(o: Obstacle, zone: Phaser.GameObjects.Zone): LockedDoor {
    const art = this.add.graphics().setDepth(5);
    art.fillStyle(COLORS.doorLocked).fillRect(o.x, o.y, o.w, o.h);
    art.lineStyle(3, 0xffd166).strokeRect(o.x + 3, o.y + 3, o.w - 6, o.h - 6);
    const label = this.doorLabel(o, `🔒 ${o.label ?? ''} $${o.cost ?? 0}`);
    return { o, zone, art, label };
  }

  /** Room floor tints, painted signs, and a dark veil over each room still locked. */
  private drawFloors(): void {
    const floor = this.add.graphics().setDepth(0.5);
    const signed = new Set<string>();
    // Staircases: painted steps on the floor
    for (const s of this.room.stairs ?? []) {
      for (const z of [s.a.zone, s.b.zone]) {
        floor.fillStyle(0x8d6e63, 0.5).fillRect(z.x, z.y, z.w, z.h);
        const across = z.w > z.h;
        for (let i = 1; i < 8; i++) {
          floor.lineStyle(3, 0x4e342e, 0.6);
          if (across) floor.lineBetween(z.x + (z.w * i) / 8, z.y, z.x + (z.w * i) / 8, z.y + z.h);
          else floor.lineBetween(z.x, z.y + (z.h * i) / 8, z.x + z.w, z.y + (z.h * i) / 8);
        }
      }
    }
    for (const r of [...this.room.rooms].sort((a, b) => b.w * b.h - a.w * a.h)) {
      if (r.tint !== undefined) floor.fillStyle(r.tint, 0.16).fillRect(r.x, r.y, r.w, r.h);
      if (this.unlocked.has(r.id)) continue;
      const cheapest = Math.min(...this.room.obstacles.filter((o) => o.opens === r.id).map((o) => o.cost ?? 0));
      const veil = this.add.rectangle(r.x, r.y, r.w, r.h, 0x0d1b1e, 0.55).setOrigin(0).setDepth(9);
      const parts: Phaser.GameObjects.GameObject[] = [veil];
      // One price sign per room, on its biggest part
      if (!signed.has(r.id)) {
        signed.add(r.id);
        const size = Math.max(18, Math.min(34, r.w / 9));
        parts.push(this.add.text(r.x + r.w / 2, r.y + r.h / 2, `🔒 ${r.name.toUpperCase()}\n$${cheapest} COPAYS`, {
          fontFamily: 'system-ui, sans-serif', fontSize: `${Math.round(size)}px`, fontStyle: '900', color: '#fff3c4', align: 'center',
        }).setOrigin(0.5).setDepth(9).setAlpha(0.8));
      }
      this.fog.set(r.id, [...(this.fog.get(r.id) ?? []), ...parts]);
    }
    for (const sgn of this.room.signs) {
      this.add.text(sgn.x, sgn.y, sgn.text, {
        fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: '900', color: '#1f4f55',
      }).setOrigin(0.5).setAlpha(0.35).setDepth(1);
    }
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
        // Doors that never open (the exit)
        g.fillStyle(COLORS.doorLocked).fillRect(o.x, o.y, o.w, o.h);
        g.lineStyle(3, 0xffd166).strokeRect(o.x + 3, o.y + 3, o.w - 6, o.h - 6);
        this.doorLabel(o, `🔒 ${o.label ?? ''}`);
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
      case 'stall':
        g.fillStyle(0xcfd8dc).fillRect(o.x, o.y, o.w, o.h);
        g.lineStyle(3, outline).strokeRect(o.x, o.y, o.w, o.h);
        g.fillStyle(0xffffff).fillEllipse(o.x + o.w / 2, o.y + 50, 54, 66); // toilet
        g.lineStyle(2, outline).strokeEllipse(o.x + o.w / 2, o.y + 50, 54, 66);
        g.fillStyle(0x90a4ae).fillRect(o.x + 16, o.y + o.h - 10, o.w - 32, 8); // stall door
        break;
      case 'sink':
        g.fillStyle(0xeceff1).fillRect(o.x, o.y, o.w, o.h);
        g.lineStyle(3, outline).strokeRect(o.x, o.y, o.w, o.h);
        for (let i = 0; i < 2; i++) g.fillStyle(0x90caf9).fillEllipse(o.x + o.w * (0.28 + i * 0.44), o.y + o.h / 2, o.w * 0.3, o.h * 0.6);
        break;
      case 'examTable':
        g.fillStyle(0x4db6ac).fillRoundedRect(o.x, o.y, o.w, o.h, 10);
        g.fillStyle(0xfafafa).fillRect(o.x + o.w * 0.25, o.y + 6, o.w * 0.5, o.h - 12); // paper roll
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 10);
        break;
      case 'counter':
        g.fillStyle(0x8d6e63).fillRect(o.x, o.y, o.w, o.h);
        g.fillStyle(0xd7ccc8).fillRect(o.x + 5, o.y + 5, o.w - 10, o.h - 10);
        g.lineStyle(3, outline).strokeRect(o.x, o.y, o.w, o.h);
        if (o.label) this.furnitureLabel(o);
        break;
      case 'xray':
        g.fillStyle(0x90a4ae).fillRoundedRect(o.x, o.y, o.w, o.h, 14);
        g.fillStyle(0x263238).fillRect(o.x + 30, o.y + 30, o.w - 60, o.h - 60); // the plate
        g.fillStyle(0xffd166).fillRect(o.x, o.y + o.h - 14, o.w, 8); // caution stripe
        g.lineStyle(4, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 14);
        if (o.label) this.furnitureLabel(o);
        break;
      case 'couch':
        g.fillStyle(0x6d4c7d).fillRoundedRect(o.x, o.y, o.w, o.h, 16);
        for (let i = 0; i < 3; i++) g.fillStyle(0x9575cd).fillRoundedRect(o.x + 14 + i * ((o.w - 28) / 3), o.y + 24, (o.w - 28) / 3 - 6, o.h - 34, 8);
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 16);
        break;
      case 'fridge':
        g.fillStyle(0xf5f5f5).fillRoundedRect(o.x, o.y, o.w, o.h, 6);
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 6);
        g.lineStyle(2, outline).lineBetween(o.x + 4, o.y + o.h * 0.35, o.x + o.w - 4, o.y + o.h * 0.35);
        g.fillStyle(0x607d8b).fillRect(o.x + o.w - 16, o.y + o.h * 0.45, 6, 22); // handle
        break;
      case 'crate': {
        // Wooden supply crate with a big "?" stencil
        g.fillStyle(0xa0703c).fillRect(o.x, o.y, o.w, o.h);
        g.lineStyle(4, 0x6b4423).strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);
        g.lineBetween(o.x + 4, o.y + 4, o.x + o.w - 4, o.y + o.h - 4).lineBetween(o.x + o.w - 4, o.y + 4, o.x + 4, o.y + o.h - 4);
        this.add.text(o.x + o.w / 2, o.y + o.h / 2, '?', {
          fontFamily: 'system-ui, sans-serif', fontSize: '34px', fontStyle: '900', color: '#ffe66d',
        }).setOrigin(0.5).setDepth(6).setShadow(0, 2, '#000', 4);
        this.add.text(o.x + o.w / 2, o.y - 6, `📦 TOOLS $${BALANCE.economy.crateCost}`, {
          fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
          backgroundColor: '#0d2b2ecc', padding: { x: 6, y: 2 },
        }).setOrigin(0.5, 1).setDepth(6);
        break;
      }
      case 'cabinet': {
        g.fillStyle(0xb0bec5).fillRect(o.x, o.y, o.w, o.h);
        g.lineStyle(3, outline).strokeRect(o.x, o.y, o.w, o.h);
        const tall = o.h > o.w;
        for (let i = 1; i < 3; i++) {
          if (tall) g.lineBetween(o.x + 4, o.y + (o.h * i) / 3, o.x + o.w - 4, o.y + (o.h * i) / 3);
          else g.lineBetween(o.x + (o.w * i) / 3, o.y + 4, o.x + (o.w * i) / 3, o.y + o.h - 4);
        }
        break;
      }
      case 'railing': {
        // Upstairs "open to below": a drop to the waiting room, fenced off
        g.fillStyle(0x10262a).fillRect(o.x, o.y, o.w, o.h);
        g.fillStyle(0x1d3d43, 0.8);
        for (let yy = o.y + 40; yy < o.y + o.h; yy += 80) g.fillRect(o.x + 20, yy, o.w - 40, 6);
        g.lineStyle(10, 0xb0bec5).strokeRect(o.x + 5, o.y + 5, o.w - 10, o.h - 10);
        g.lineStyle(3, 0x607d8b).strokeRect(o.x + 12, o.y + 12, o.w - 24, o.h - 24);
        break;
      }
      case 'lounge':
        g.fillStyle(0x2f7a6d).fillRoundedRect(o.x, o.y, o.w, o.h, 12);
        g.fillStyle(0x3fa08f).fillRoundedRect(o.x + 10, o.y + 10, o.w - 20, o.h - 20, 8);
        g.lineStyle(2, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 12);
        break;
      case 'bench':
        g.fillStyle(0x9c7a5a).fillRoundedRect(o.x, o.y, o.w, o.h, 8);
        for (let i = 1; i < 4; i++) g.lineStyle(2, 0x6b4f37).lineBetween(o.x + 6, o.y + (o.h * i) / 4, o.x + o.w - 6, o.y + (o.h * i) / 4);
        g.lineStyle(2, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 8);
        break;
      case 'elevator':
        g.fillStyle(0x78909c).fillRect(o.x, o.y, o.w, o.h);
        g.fillStyle(0xb0bec5).fillRect(o.x + 12, o.y + 12, o.w / 2 - 16, o.h - 24).fillRect(o.x + o.w / 2 + 4, o.y + 12, o.w / 2 - 16, o.h - 24);
        g.lineStyle(3, outline).strokeRect(o.x, o.y, o.w, o.h);
        if (o.label) this.furnitureLabel(o);
        break;
      case 'waterCooler':
        g.fillStyle(0xeeeeee).fillRect(o.x, o.y, o.w, o.h);
        g.fillStyle(0x7fd3ff, 0.9).fillCircle(o.x + o.w / 2, o.y + o.h / 2, o.w / 2.8);
        g.lineStyle(2, outline).strokeRect(o.x, o.y, o.w, o.h);
        break;
    }
  }
}
