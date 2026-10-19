import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { CONTROLS } from '../config/controls';
import { DISPLAY } from '../config/display';
import { COLORS } from '../config/theme';
import { DEBUG } from '../core/debug';
import { useGameTime } from '../core/gameClock';
import { damp } from '../core/math';
import { events, GameEvents, type RequisitionPayload, type RoomPayload, type RoundPayload, type RunResult, type StationPayload, type StreakPayload } from '../core/events';
import { inputState } from '../core/inputState';
import { settings } from '../core/settings';
import { recordRun } from '../core/save';
import { runRng, seedRun } from '../core/rng';
import { nextShift, type ShiftSetup } from '../core/shift';
import { CONSTRUCTION_LINES, CONSTRUCTION_SIGN, modifierById, type ModifierId } from '../data/modifiers';
import { difficultyById } from '../data/difficulties';
import { unlockAchievement } from '../core/achievements';
import { activeSpecialty, bankFor, creditsFor, doctorUnlocked, grant, lockerLevel, npsFor, progress, recordShift, scribeUnlocked, unlockScribe } from '../core/progress';
import type { SpecialtyMods } from '../data/residency';
import { newRunStats, type RunStats } from '../core/runStats';
import { initSfx, sfx } from '../core/sfx';
import { initMusic, musicState, setMusicMix, startMusic, stopMusic } from '../core/music';
import { MUSIC } from '../config/music';
import { CRATE_POOL, EQUIPMENT, STARTING_EQUIPMENT, type EquipmentDef } from '../data/equipment';
import { DENIED_ITEMS } from '../data/requisition';
import { GERMS } from '../data/germs';
import { WAVES } from '../data/waves';
import { CLINIC, RECORDS_ROOM } from '../data/clinic';
import { KEY } from '../data/miracleCure';
import type { FloorArea, Obstacle, ObstacleKind, RoomArea, RoomLayout, Stairway } from '../data/rooms';
import { SNACKS, type SnackDef } from '../data/vending';
import { characterById, type CharacterDef } from '../data/characters';
import { Droplet } from '../entities/Droplet';
import { Glob } from '../entities/Glob';
import { Germ, type GermScaling } from '../entities/Germ';
import type { Patient } from '../entities/Patient';
import { Player } from '../entities/Player';
import { Arsenal } from '../systems/Arsenal';
import { FlowField } from '../systems/FlowField';
import { separateGerms, steerCharger, steerHealer, steerSpitter, type BehaviorHost } from '../systems/GermBehaviors';
import { Puddles } from '../systems/Puddles';
import { Powerups } from '../systems/Powerups';
import { ELITE_AFFIXES, type EliteAffix, type PowerupDef } from '../data/powerups';
import { Fx } from '../systems/Fx';
import { DiamondBrain, type BossHost } from '../systems/DiamondBrain';
import { bossOwns, type BossBrain } from '../systems/BossBrain';
import { InfluenzaBrain } from '../systems/InfluenzaBrain';
import { MethicillinBrain } from '../systems/MethicillinBrain';
import { PatientZeroBrain } from '../systems/PatientZeroBrain';
import { FaxMachineBrain } from '../systems/FaxMachineBrain';
import { MiracleCure } from '../systems/MiracleCure';
import { PatientDirector } from '../systems/PatientDirector';
import { Scribes } from '../systems/Scribes';
import { Vents, type Vent } from '../systems/Vents';
import { SCRIBES, scribeById } from '../data/scribes';
import { Sprayer } from '../systems/Sprayer';
import { WaveDirector } from '../systems/WaveDirector';

/** A door still waiting to be bought open, with the pieces to remove when it is. */
interface LockedDoor {
  o: Obstacle;
  zone: Phaser.GameObjects.Zone;
  art: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

/**
 * Something Eugene can USE: a supply cart, a locked door, a crate, the Compounding Station, an exam table.
 * Every station is one of these; adding a new kind of station means adding one entry in buildStations().
 */
interface Station {
  /** Its footprint (USE works within BALANCE.economy.interactRange of its edge). */
  o: Obstacle;
  /** The room it stands in: usable only once that room is open (so nothing is used through a wall). */
  roomId?: string;
  /** What USE shows right now. `cost` 0 with `blocked` = shown but can't be used (maxed out, used up). */
  info(): { verb: string; cost: number; note?: string; hold?: boolean; blocked?: boolean };
  use(time: number): void;
  /** No longer there (a door that was bought open). */
  gone?(): boolean;
}

/** An exam-room privacy curtain across a doorway. While shut it's a wall (`zone`) and snaps the flu strand. */
interface Curtain {
  o: Obstacle;
  art: Phaser.GameObjects.Graphics;
  zone?: Phaser.GameObjects.Zone;
  closedUntil: number;
}

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
  /** Static map drawings per floor; only Eugene's floor is drawn (the other is hidden). */
  private floorStatic = new Map<string, Phaser.GameObjects.GameObject[]>();
  /** One Graphics per floor and depth, so a floor's art can be hidden in one go. */
  private floorGraphics = new Map<string, Phaser.GameObjects.Graphics>();
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  /** Rooms bought open so far this run (starts with the waiting room). */
  private unlocked = new Set<string>();
  private lockedDoors: LockedDoor[] = [];
  /** Dark overlay on each locked room, faded out when it opens. */
  private fog = new Map<string, Phaser.GameObjects.GameObject[]>();
  private currentRoom?: RoomArea;
  private interactTarget?: Station;
  /** GERM VENTS: where germs come in; BLOCK one with Copays. */
  private vents!: Vents;
  private stations: Station[] = [];
  /** This run's statistics (Discharge Summary, records). */
  private runStats: RunStats = newRunStats(0);
  /** Exam tables already rested on, and the round they were used in. */
  private restedAt = new Map<Obstacle, number>();
  private germs!: Phaser.Physics.Arcade.Group;
  private droplets!: Phaser.Physics.Arcade.Group;
  /** Sneezer mucus globs in flight, and the puddles they leave. */
  private globs!: Phaser.Physics.Arcade.Group;
  private puddles!: Puddles;
  private powerups!: Powerups;
  private behaviorHost!: BehaviorHost;
  /** Tools carried: the bottle, plus one from a supply crate. */
  private loadout: Sprayer[] = [];
  /** Wipes, Gel Launcher and Defib Paddles: tools that don't spray. */
  private arsenal!: Arsenal;
  /** Gel Launcher puddles: they slow germs, not Eugene. */
  private gel!: Puddles;
  /** A Supply Requisition being filled in: the crate, the two tools on the form, appeals so far. */
  private requisition?: { crate: Obstacle; options: string[]; appeals: number };
  /** Chance a claim or appeal is denied (tests set it). */
  claimDeniedChance = 0;
  /** When each room trap (hand dryer, autoclave, X-ray) can be used again. */
  private trapReadyAt = new Map<Obstacle, number>();
  /** Exam-room privacy curtains: shut (a wall) until `closedUntil`. */
  private curtains: Curtain[] = [];
  /** Snacks bought this run, the run-long perks they add up to, and the machine's offer while its form is up. */
  private snacks: string[] = [];
  private perks = { refill: 1, purge: 1, crit: 1 };
  private snackSpeed = 1;
  private vendingOffer?: string[];
  /** This shift's Specialty (from the Residency Board), if any. */
  private mods: SpecialtyMods = {};
  private specialtyName = '';
  private bossesDefeated = 0;
  /** Who's on shift (title screen): their art, passive and signature move. */
  character: CharacterDef = characterById('eugene');
  /** PA Lucien's CLEAN FIELD, while it's down. */
  private field?: { x: number; y: number; until: number; gfx: Phaser.GameObjects.Graphics };
  private slot = 0;
  private fx!: Fx;
  private flow!: FlowField;
  private nextFlowAt = 0;
  private readonly step = new Phaser.Math.Vector2();
  private waves!: WaveDirector;
  private patients!: PatientDirector;
  /** Omar and Alan, the scribes (a power-up, once unlocked on the Residency Board). */
  private scribes!: Scribes;
  /** Patients the scribes cleaned up this shift (the Delegation achievement). */
  private scribeCleans = 0;
  /** Rooms where a helper already came out to help this shift (Donald in X-ray). */
  private helperRooms = new Set<string>();
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
  private boss?: BossBrain;
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
  /** M17: this shift's kind (normal or Today's Shift), difficulty, modifiers and seed. */
  shift: ShiftSetup = nextShift();
  /** The difficulty's multipliers (BALANCE.difficulty). */
  diff: (typeof BALANCE.difficulty)['urgent'] = BALANCE.difficulty.urgent;
  /** POWER OUTAGE: the dark, with a hole of light that follows the doctor. */
  private dark?: Phaser.GameObjects.Image;
  /** CONSTRUCTION: the room closed this round (its doors block only the doctor) and what was drawn for it. */
  private closed?: { roomId: string; objects: Phaser.GameObjects.GameObject[] };
  private constructionWalls!: Phaser.Physics.Arcade.StaticGroup;
  /** The Miracle Cure: the secret quest's progress this shift (systems/MiracleCure.ts). */
  private cure!: MiracleCure;

  constructor() {
    super('Game');
  }

  create(): void {
    // time.now stops while paused, so cooldowns and timers don't run out in the background
    useGameTime(this);
    // Today's Shift or a normal one: the seed drives this run's rolls (core/rng)
    this.shift = nextShift();
    seedRun(this.shift.seed);
    this.diff = BALANCE.difficulty[this.shift.difficulty];
    this.closed = undefined;
    // Reduced motion (pause menu): every screen shake goes through here and is skipped
    const mainCam = this.cameras.main as Phaser.Cameras.Scene2D.Camera & { calmed?: boolean };
    if (!mainCam.calmed) {
      mainCam.calmed = true;
      const shake = mainCam.shake.bind(mainCam);
      mainCam.shake = ((...args: Parameters<typeof shake>) => (settings.reducedMotion ? mainCam : shake(...args))) as typeof mainCam.shake;
    }
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
    const floor = this.add.tileSprite(0, 0, room.width, room.height, 'floor').setOrigin(0);
    // FULL MOON: the floor is moonlit
    if (this.hasMod('fullMoon')) floor.setTint(BALANCE.modifiers.fullMoon.floorTint);

    // Everything drawn from here to the end of the map is static scenery, sorted by floor afterwards
    this.floorGraphics = new Map();
    const firstStatic = this.children.list.length;
    this.drawFloors();
    const solids = (this.solids = this.physics.add.staticGroup());
    for (const o of room.obstacles) {
      const zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
      solids.add(zone);
      if (o.opens) this.lockedDoors.push(this.drawLockedDoor(o, zone));
      else this.drawObstacle(this.floorArt(o.x + o.w / 2, o.y + o.h / 2, 5), o);
    }
    this.sortStaticByFloor(firstStatic);
    this.restedAt = new Map();

    this.fx = new Fx(this);
    this.flow = new FlowField(room.width, room.height, this.blockingObstacles());
    // A Pal who hasn't been hired with NPS Scores can't go on shift (?doctor= skips that, for testing)
    this.character = characterById(DEBUG.doctor ?? (doctorUnlocked(settings.character) ? settings.character : 'eugene'));
    // The Miracle Cure's reward: Eugene wears his scrub cap from then on
    const capped = this.character.id === 'eugene' && progress().owned.includes('scrubCap');
    this.player = new Player(this, room.playerSpawn.x, room.playerSpawn.y, capped ? 'eugene-cap' : this.character.id);
    const passive = this.character.passive;
    if (passive.maxHp) this.player.maxHp = this.player.hp = this.player.maxHp + passive.maxHp;
    if (passive.moveSpeed) this.player.setSpeedMod('character', passive.moveSpeed);
    this.field = undefined;

    // Pools: created once, reused all game
    this.droplets = this.physics.add.group({ classType: Droplet, maxSize: 90, runChildUpdate: true, defaultKey: 'droplet' });
    this.germs = this.physics.add.group({ classType: Germ, maxSize: 60, defaultKey: 'germ-basic' });
    this.globs = this.physics.add.group({ classType: Glob, maxSize: 16, defaultKey: 'glob' });
    this.puddles = new Puddles(this);
    this.gel = new Puddles(this, 0x80deea);
    this.arsenal = new Arsenal({
      scene: this,
      germs: () => (this.germs.getChildren() as Germ[]).filter((c) => c.active),
      lineClear: (x1, y1, x2, y2) => this.flow.lineClear(x1, y1, x2, y2),
      hit: (g, def, damage, angle, knockback, pierces) => this.hitGerm(g, def, damage, angle, knockback, pierces),
      gel: this.gel,
      aimTarget: () => (this.aimLock?.active ? this.aimLock : undefined),
      say: (x, y, text, color, size) => this.fx.number(x, y, text, color, size),
    });
    this.requisition = undefined;
    this.claimDeniedChance = BALANCE.economy.claimDeniedChance;
    this.trapReadyAt = new Map();
    this.snacks = [];
    this.perks = { refill: 1, purge: 1, crit: 1 };
    this.snackSpeed = 1;
    this.vendingOffer = undefined;
    // Scribe pills only drop once that scribe is unlocked (or forced with ?scribe=)
    this.powerups = new Powerups(this, (def, t) => this.onPowerup(def, t),
      (def) => !def.scribe || scribeUnlocked(def.scribe) || DEBUG.scribe === def.scribe);
    const telegraphs = this.add.graphics().setDepth(7);
    this.behaviorHost = {
      player: this.player,
      flow: this.flow,
      telegraphs,
      germs: () => (this.germs.getChildren() as Germ[]).filter((c) => c.active),
      chargeHitWall: (g) => {
        sfx.tantrum();
        this.cameras.main.shake(120, 0.004);
        this.fx.number(g.x, g.y - g.def.radius - 12, 'DAZED! ×2 DAMAGE', '#ffe66d', 16);
        this.achieve('wallBanger');
      },
      telegraphSneeze: (g) => {
        sfx.sneezeWindup();
        this.fx.number(g.x, g.y - g.def.radius - 14, 'AH... AH...', '#ffb3b3', 16);
      },
      fireGlob: (g, angle) => this.fireGlob(g, angle),
    };
    this.loadout = [this.makeTool(STARTING_EQUIPMENT)];
    this.curtains = (room.curtains ?? []).map((r) => {
      const c: Curtain = { o: { kind: 'curtain', ...r }, art: this.add.graphics().setDepth(5), closedUntil: 0 };
      this.drawCurtain(c);
      return c;
    });
    this.cure = new MiracleCure(this.cureHost(), DEBUG.secret);
    this.stations = this.buildStations();
    this.runStats = newRunStats(this.time.now);
    this.bossesDefeated = 0;
    this.applyResidency();
    this.slot = 0;
    this.waves = new WaveDirector(this.time.now, DEBUG.startRound);
    this.waves.intervalMult = this.diff.spawnInterval;
    if (this.hasMod('fluSeason')) {
      // FLU SEASON: Viral Sprinters twice as often, and from round 1
      const flu = BALANCE.modifiers.fluSeason;
      this.waves.adjustMix = (mix) => {
        if (mix.basic !== undefined || mix.sprinter !== undefined) mix.sprinter = (mix.sprinter ?? flu.earlyWeight) * flu.sprinterMult;
        return mix;
      };
    }
    this.patients = new PatientDirector({
      scene: this,
      player: this.player,
      room,
      // Patients wander the biggest part of the starting room
      area: room.rooms.filter((r) => r.start).sort((a, b) => b.w * b.h - a.w * a.h)[0] ?? room.rooms[0],
      spawnGermAt: (id, x, y) => this.spawnGermAt(id, x, y),
      onCleaned: (p) => this.onPatientCleaned(p),
      doctor: this.character.id,
      backwards: this.hasMod('fullMoon'),
    });
    this.constructionWalls = this.physics.add.staticGroup();
    this.physics.add.collider(this.player, this.constructionWalls);
    this.dark = this.hasMod('powerOutage') ? this.buildDarkness() : undefined;
    this.scribeCleans = 0;
    this.helperRooms = new Set();
    this.scribes = new Scribes({
      scene: this,
      player: this.player,
      flow: this.flow,
      fx: this.fx,
      patients: this.patients,
      germs: () => this.livingGerms(),
      hit: (g, damage, angle, knockback) => this.damageGerm(g, damage, angle, knockback, 'scribe'),
      sameFloor: (x0, y0, x1, y1) => this.floorOf(x0, y0) === this.floorOf(x1, y1),
      sameRoom: (x0, y0, x1, y1) => {
        const id = (x: number, y: number) => this.room.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)?.id;
        const a = id(x0, y0);
        return a !== undefined && a === id(x1, y1);
      },
      onClean: () => {
        this.scribeCleans++;
        if (this.scribeCleans >= 5) this.achieve('delegation');
      },
    });
    this.vents = new Vents({
      scene: this,
      flow: this.flow,
      fx: this.fx,
      rooms: room.rooms,
      isOpen: (id) => this.unlocked.has(id),
      stationFootprints: () => this.stations.filter((st) => st.o.kind !== 'vent' && !st.gone?.()).map((st) => st.o),
      copays: () => this.copays,
      pay: (cost) => this.addCopays(-cost),
      helpers: () => this.scribes.onShift(),
      sameFloor: (x0, y0, x1, y1) => this.floorOf(x0, y0) === this.floorOf(x1, y1),
    }, (st) => this.stations.push(st));
    this.vents.sync();
    const forced = scribeById(DEBUG.scribe);
    if (forced) {
      // ?scribe=omar: they work the whole shift
      const whole = 1e9;
      this.powerups.start(forced.powerup, this.time.now, whole);
      this.scribes.summon(forced.id, this.time.now, whole);
    }

    this.physics.add.collider(this.player, solids);
    this.physics.add.collider(this.germs, solids);
    // Touching germs shove apart by position. (An Arcade collider also scaled both velocities by their bounce every
    // frame they touched, so a pressed-together crowd crawled at a few percent of its speed: germs "stuck together".)
    this.physics.add.overlap(this.germs, this.germs, (a, b) => separateGerms(a as Germ, b as Germ, BALANCE.germs.crowdPush));
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
    initMusic();
    const sounds: [string, () => void][] = [
      [GameEvents.EquipmentEmpty, sfx.empty],
      [GameEvents.EquipmentRefilled, sfx.refill],
      [GameEvents.RoundStarted, sfx.roundStart],
      [GameEvents.RoundCompleted, sfx.roundEnd],
    ];
    for (const [name, fn] of sounds) events.on(name, fn);
    const onRoundStart = (p: RoundPayload) => {
      this.hurtThisRound = false;
      if (p.special) sfx.specialRound();
      if (p.round >= 10) this.achieve('doubleShift');
      if (p.round >= 20) this.achieve('attending');
      if (p.round >= 10 && this.shift.difficulty === 'trauma') this.achieve('traumaTen');
      if (p.round >= 8 && this.hasMod('powerOutage')) this.achieve('darkShift');
      if (this.hasMod('construction')) this.closeForConstruction(p.round);
      this.vents.shuffle();
      this.cure.onRoundStarted();
    };
    const onEscaped = () => this.achieve('ama');
    const onSnack = (p: { id: string }) => this.buySnack(p.id);
    const onWalkAway = () => { this.vendingOffer = undefined; };
    const onRoundDone = (p: RoundPayload) => {
      this.cure.onRoundCompleted(this.waves.isBossRound);
      this.reopenConstruction();
      this.onRoundCompleted(p.round);
    };
    const onPicked = (p: { id: string }) => this.pickRequisition(p.id);
    const onAppealed = () => this.appealRequisition();
    events.on(GameEvents.RoundStarted, onRoundStart);
    events.on(GameEvents.RoundCompleted, onRoundDone);
    events.on(GameEvents.RequisitionPicked, onPicked);
    events.on(GameEvents.BossEscaped, onEscaped);
    events.on(GameEvents.VendingPicked, onSnack);
    events.on(GameEvents.VendingCancelled, onWalkAway);
    events.on(GameEvents.RequisitionAppealed, onAppealed);
    this.events.once('shutdown', () => {
      events.off(GameEvents.RoundStarted, onRoundStart);
      events.off(GameEvents.RoundCompleted, onRoundDone);
      events.off(GameEvents.RequisitionPicked, onPicked);
      events.off(GameEvents.BossEscaped, onEscaped);
      events.off(GameEvents.VendingPicked, onSnack);
      events.off(GameEvents.VendingCancelled, onWalkAway);
      events.off(GameEvents.RequisitionAppealed, onAppealed);
      for (const [name, fn] of sounds) events.off(name, fn);
      this.boss?.destroy();
      this.boss = undefined;
      this.cure.destroy();
      stopMusic(0.3);
    });

    this.scene.launch('Hud');
    this.cameras.main.fadeIn(DISPLAY.fadeInMs, 0, 0, 0);
    events.emit(GameEvents.RunStarted, { roomId: room.id });
    startMusic();
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
    this.updateDarkness();
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
      this.signature(time);
    }
    this.updateStairs(time);
    this.fitCameraToFloor();
    this.updateRoom();
    this.updateCurtains(time);
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
        if (!d.attack) {
          this.fx.nozzleMist(this.nozzle.x, this.nozzle.y, this.player.rotation, d.spreadDeg, d.color, d.mistPuffs);
          sfx.spray();
        }
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
    this.behaviorHost.telegraphs.clear();
    this.gel.update(time, -1e9, -1e9);
    this.updateField(time, delta);
    const gelOn = this.gel.count > 0;
    for (const g of this.germs.getChildren() as Germ[]) {
      if (!g.active) continue;
      // Sticky hand-sanitizer gel slows anything (but a boss) that walks through it
      if (gelOn && !g.def.boss) {
        const f = this.gel.slowAt(g.x, g.y);
        if (f < 1) g.slow(time, f, 250);
      }
      const override = bossOwns(this.boss, g) ? this.boss.movement(g) : undefined;
      if (override) {
        g.chase(override.target, time, delta, override.speed);
        continue;
      }
      if (g.def.spit) {
        steerSpitter(g, this.behaviorHost, time, delta, this.step);
        continue;
      }
      if (g.def.charge) {
        steerCharger(g, this.behaviorHost, time, delta, this.step);
        continue;
      }
      if (g.def.heal) {
        steerHealer(g, this.behaviorHost, time, delta, this.step);
        continue;
      }
      if (g.def.spawner) {
        // MOLD SPOT: stays put and lets out spores
        g.setVelocity(0, 0);
        g.chase(g, time, delta, 0);
        const sp = g.def.spawner;
        if (time >= g.nextSpawnAt && time >= g.frozenUntil && this.aliveOf(sp.id) < sp.max * Math.max(1, this.aliveOf(g.def.id))) {
          g.nextSpawnAt = time + sp.everyMs;
          const a = runRng.spawn.float(0, Math.PI * 2);
          this.spawnGermAt(sp.id, g.x + Math.cos(a) * (g.def.radius + 16), g.y + Math.sin(a) * (g.def.radius + 16), true);
          this.fx.germSplat(g.x, g.y, g.def.color);
        }
        continue;
      }
      // Close in directly when near; otherwise follow the path around furniture
      const near = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y) < BALANCE.germs.directChaseDistance;
      g.chase(near || !this.flow.nextStep(g.x, g.y, this.step) ? this.player : this.step, time, delta);
    }
    // A breather when Eugene is hurting and crowded (pacing, not mercy: nothing already here goes away)
    const b = WAVES.breather;
    const alive = this.germs.countActive(true);
    this.waves.pacing = this.player.hp / this.player.maxHp < b.lowHp && alive >= WAVES.maxAlive(Math.max(1, this.waves.round)) * b.crowd ? b.spawnSlow : 1;
    // The Records Room is fought between rounds: the break waits while the doctor is in there
    if (this.cure.inRecords) this.waves.holdBreak(delta);
    this.waves.update(time, alive, (id, scaling) => this.spawnGerm(id, scaling), (id) => this.aliveOf(id));
    this.cure.update(time);
    this.updateMusic(alive);
    // Globs that fly their full range splat where they stop; puddles slow Eugene
    for (const gl of this.globs.getChildren() as Glob[]) if (gl.active && time >= gl.expiresAt) this.globLands(gl);
    this.powerups.update(time, this.player.x, this.player.y);
    const slow = this.puddles.update(time, this.player.x, this.player.y);
    this.player.setSpeedMod('puddle', slow < 1 ? slow : null);
    this.patients.update(time, delta, this.waves.round, this.waves.spawning, this.waves.isBossRound);
    this.scribes.update(time, delta);
    this.vents.update(time);
    this.updateStreak(time);
  }

  /** Living germs of one type (for WAVES.aliveLimit). */
  private aliveOf(id: string): number {
    // A Colony counts as one per flock of specks still flying
    const as = GERMS[id]?.spawnAs;
    if (as) return Math.ceil(this.aliveOf(as.id) / as.count);
    let n = 0;
    for (const g of this.germs.getChildren() as Germ[]) if (g.active && g.def.id === id) n++;
    return n;
  }

  /** CHOO! A Sneezer launches a mucus glob. */
  private fireGlob(g: Germ, angle: number): void {
    const s = g.def.spit;
    if (!s) return;
    const r = g.def.radius + 10;
    this.launchGlob(g.x + Math.cos(angle) * r, g.y + Math.sin(angle) * r, angle, s.globSpeed, s.globRange, s);
    sfx.sneeze();
    this.fx.number(g.x, g.y - g.def.radius - 14, 'CHOO!', '#d7e88a', 22);
  }

  /** One mucus glob in flight (Sneezers, Patient Zero's sneeze). */
  private launchGlob(x: number, y: number, angle: number, speed: number, range: number,
    s: { damage: number; puddleMs: number; puddleRadius: number; puddleSlow: number }): void {
    const glob = this.globs.get() as Glob | null;
    if (!glob) return;
    glob.fire(x, y, angle, speed, range, this.time.now);
    glob.damage = s.damage;
    glob.puddleMs = s.puddleMs;
    glob.puddleRadius = s.puddleRadius;
    glob.puddleSlow = s.puddleSlow;
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
      // Long streaks score too (skill, not just Copays)
      const bonus = this.streak * BALANCE.streak.scorePerKill;
      this.score += bonus;
      events.emit(GameEvents.ScoreChanged, { score: this.score });
      this.fx.number(this.player.x, this.player.y - 80, `STREAK OF ${this.streak}! +${bonus}`, '#ffe66d', 26);
    }
    this.streak = 0;
    this.lastStreakLeft = -1;
    this.emitStreak(0);
  }

  /** SPOTLESS: a round finished without a scratch pays a bonus. */
  private onRoundCompleted(round: number): void {
    if (this.hurtThisRound || this.runOver) return;
    const inspection = this.hasMod('inspectionDay') ? BALANCE.modifiers.inspectionDay.spotlessMult : 1;
    const bonus = BALANCE.economy.spotlessPerRound * round * (this.waves.special?.spotlessMult ?? 1) * inspection;
    this.addCopays(bonus);
    this.score += BALANCE.economy.spotlessScorePerRound * round;
    events.emit(GameEvents.ScoreChanged, { score: this.score });
    sfx.spotless();
    this.fx.number(this.player.x, this.player.y - 90, `SPOTLESS! +$${bonus}`, '#7fffd4', 30);
    events.emit(GameEvents.SpotlessRound, { round, copays: bonus });
    this.achieve('spotless');
  }

  /** Unlocks an achievement (once per device); remembers it for this run's Discharge Summary. */
  private achieve(id: string): void {
    const def = unlockAchievement(id);
    if (def) this.runStats.achievements.push(def.name);
  }

  /** For the HUD's off-screen arrows: every germ (check `active`) and Eugene. */
  get threatSources(): { germs: Germ[]; player: Player; floor?: FloorArea } {
    return { germs: this.germs.getChildren() as Germ[], player: this.player, floor: this.currentFloor };
  }

  /** What the HUD's teach-as-you-play hints need to know right now. */
  hintState(): { germsNear: number; crowd: number; purgeReady: boolean; refilling: boolean; selfCharging: boolean } {
    const { x, y } = this.player;
    let near = 0, crowd = 0;
    for (const g of this.germs.getChildren() as Germ[]) {
      if (!g.active) continue;
      const d = Phaser.Math.Distance.Between(g.x, g.y, x, y);
      if (d < 420) near++;
      if (d < BALANCE.purge.radius) crowd++;
    }
    return {
      germsNear: near, crowd, purgeReady: this.purgeProgress(this.time.now) >= 1,
      refilling: this.sprayer.refilling, selfCharging: !!this.sprayer.def.rechargePerSecond,
    };
  }

  /** What the music is doing (smoke test). */
  musicState(): ReturnType<typeof musicState> {
    return musicState();
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
      this.runStats.perfectPours++;
      this.achieve('perfectPour');
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
    this.fx.dropletSplash(drop.x, drop.y);
    if (drop.pierceLeft > 0) {
      drop.pierceLeft--;
      drop.hit.add(germ);
    } else {
      drop.retire();
    }
    this.hitGerm(germ, drop.def, drop.damage, drop.rotation, drop.knockback, (drop.def.pierce ?? 0) > 0);
  }

  /** One hit from any tool: effectiveness by germ type, STAT! crits, foam slow, Spore Pod armor, then the damage. */
  private hitGerm(germ: Germ, def: EquipmentDef, damage: number, angle: number, knockback: number, pierces: boolean): void {
    if (!germ.active) return;
    const vs = this.mods.vs;
    const mult = (def.effectiveness[germ.def.tag] ?? 1) * (this.mods.toolDamage ?? 1) * (this.character.passive.toolDamage ?? 1) * (vs && vs.tag === germ.def.tag ? vs.mult : 1);
    // STAT! critical hit
    const fb = BALANCE.feedback;
    const crit = this.powerups.isActive('triage', this.time.now) || runRng.loot.chance(fb.critChance * this.perks.crit);
    if (crit) {
      germ.pendingCrit = true;
      this.runStats.crits++;
      sfx.crit();
    } else {
      sfx.hit();
    }
    if (def.slow && !germ.def.boss) germ.slow(this.time.now, def.slow.factor, def.slow.ms);
    const time = this.time.now;
    const armor = this.armorMult(germ, angle, pierces, time);
    if (armor < 1 && time - germ.lastBlockAt > 350) {
      germ.lastBlockAt = time;
      sfx.tink();
      this.fx.number(germ.x, germ.y - germ.def.radius - 10, 'TINK! GET BEHIND IT', '#c8d6e5', 15);
    }
    this.damageGerm(germ, damage * mult * armor * (crit ? fb.critMult : 1), angle, knockback * (armor < 1 ? 0.3 : 1), def.id);
  }

  /** Every way a germ gets hurt goes through here: numbers, boss bar, kills, score and Copays. */
  private damageGerm(germ: Germ, damage: number, fromAngle: number, knockback: number, source?: string): void {
    const time = this.time.now;
    const boss = bossOwns(this.boss, germ) ? this.boss : undefined;
    if (boss) damage *= (boss.damageTaken ?? 1) * (boss.damageFactor?.(germ, source, time) ?? 1);
    // Ken's passive: everything he does hits Diamond harder
    const vsDiamond = germ.def.brain === 'diamond' && !!this.character.passive.diamondDamage;
    if (vsDiamond) damage *= this.character.passive.diamondDamage!;
    if (germ.chargeState === 'dazed' && germ.def.charge) damage *= germ.def.charge.stunnedDamageTaken;
    let killed = germ.hurt(damage, fromAngle, knockback, time);
    boss?.onHurt(damage, time, germ, source);
    // A twin knocked out goes down instead of dying (InfluenzaBrain)
    if (killed && boss?.interceptKill?.(germ, time)) killed = false;

    // Batch damage into one number every ~180 ms per germ so the screen stays readable
    if (killed || time - germ.lastNumberAt > 180) {
      const n = Math.round(germ.pendingDamage);
      if (germ.pendingCrit) this.fx.number(germ.x, germ.y - germ.def.radius, `STAT! ${n}`, '#ffe66d', 24);
      else if (vsDiamond) this.fx.number(germ.x, germ.y - germ.def.radius, `${n}`, '#ffab40', 24);
      else this.fx.number(germ.x, germ.y - germ.def.radius, `${n}`);
      germ.pendingCrit = false;
      germ.pendingDamage = 0;
      germ.lastNumberAt = time;
    }

    if (germ.def.boss) {
      events.emit(GameEvents.BossHealth, boss?.bar?.() ?? { name: germ.def.name, hp: Math.max(0, germ.hp), maxHp: germ.maxHp });
    }

    if (killed) {
      this.kills++;
      this.score += germ.def.points;
      this.runStats.kills[germ.def.id] = (this.runStats.kills[germ.def.id] ?? 0) + 1;
      // Sanitation Streak: each kill extends it and may raise the Copay multiplier
      this.streak++;
      this.runStats.bestStreak = Math.max(this.runStats.bestStreak, this.streak);
      this.streakUntil = time + BALANCE.streak.windowMs;
      this.lastStreakLeft = 1;
      this.emitStreak(1);
      this.achieve('firstKill');
      if (this.streak >= 25) this.achieve('streak25');
      if (germ.def.id === 'healer') this.achieve('cultureShock');
      if (germ.def.id === 'moldSpot') this.achieve('remediation');
      if (germ.def.brain === 'diamond') this.achieve('meetingAdjourned');
      if (germ.def.brain === 'diamond' && this.character.id === 'ken') this.achieve('exitInterview');
      if (germ.def.brain === 'patientZero') this.achieve('discharged');
      if (germ.def.brain === 'faxMachine') this.cure.onFaxDefeated();
      if (germ.def.brain === 'methicillin') this.achieve('sensitivityReport');
      if (germ.def.brain === 'influenza') this.achieve('herdImmunity');
      if ((this.runStats.kills.sneezer ?? 0) >= 10) this.achieve('gesundheit');
      const el = BALANCE.elites;
      const eliteMult = germ.elite ? el.copaysMult : 1;
      const doubled = this.powerups.isActive('doubleCopay', time) ? 2 : 1;
      const special = this.waves.special?.copayMult ?? 1;
      this.addCopays(Math.round(germ.def.copays * this.streakMult * eliteMult * doubled * special * this.diff.copays));
      if (germ.elite) this.score += germ.def.points * (el.pointsMult - 1);
      // Power-ups: elites always drop one; any other germ now and then
      if (germ.elite || (!germ.def.boss && runRng.loot.chance(BALANCE.powerups.dropChance))) this.powerups.drop(germ.x, germ.y, time);
      if (germ.def.splitInto) {
        const s = germ.def.splitInto;
        for (let i = 0; i < s.count; i++) {
          const a = (i / s.count) * Math.PI * 2 + runRng.spawn.next();
          this.spawnGermAt(s.id, germ.x + Math.cos(a) * germ.def.radius, germ.y + Math.sin(a) * germ.def.radius, true);
        }
      }
      if (germ.elite === 'splitting') {
        for (let i = 0; i < el.splitInto; i++) {
          const a = runRng.spawn.float(0, Math.PI * 2);
          this.spawnGermAt('basic', germ.x + Math.cos(a) * 30, germ.y + Math.sin(a) * 30, true);
        }
      }
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
        const bar = boss?.bar?.();
        boss?.onDefeated();
        this.bossesDefeated++;
        // Rewards: the twins always leave a Flu Shot, Methicillin a Prescription
        if (germ.def.brain === 'influenza') this.powerups.drop(germ.x, germ.y, time, 'fluShot');
        if (germ.def.brain === 'methicillin') this.powerups.drop(germ.x, germ.y, time, 'prescription');
        events.emit(GameEvents.BossDefeated, { name: bar?.name ?? germ.def.name, hp: 0, maxHp: bar?.maxHp ?? germ.maxHp });
      }
      events.emit(GameEvents.GermKilled, { germId: germ.def.id, x: germ.x, y: germ.y, totalKills: this.kills });
      events.emit(GameEvents.ScoreChanged, { score: this.score });
      germ.kill();
    }
  }

  private addCopays(amount: number): void {
    this.copays += amount;
    if (amount > 0) this.runStats.copaysEarned += amount;
    events.emit(GameEvents.CopaysChanged, { copays: this.copays });
  }

  /** The signature move's recharge (Sinus Purge, Code Blue, Clean Field), after snacks. */
  private get signatureCooldown(): number {
    const sig = this.character.signature;
    const base = sig === 'codeBlue' ? BALANCE.codeBlue.cooldownMs : sig === 'cleanField' ? BALANCE.cleanField.cooldownMs
      : sig === 'grievance' ? BALANCE.grievance.cooldownMs : BALANCE.purge.cooldownMs;
    return base * this.perks.purge;
  }

  /** The big green button: whoever is on shift does their move. */
  private signature(time: number): void {
    if (this.character.signature === 'codeBlue') this.codeBlue(time);
    else if (this.character.signature === 'cleanField') this.cleanField(time);
    else if (this.character.signature === 'grievance') this.fileGrievance(time);
    else this.sinusPurge(time);
  }

  /**
   * KEN'S FILE A GRIEVANCE: he slams a form down and paperwork flies everywhere, hitting and stunning
   * every germ nearby. If Diamond is anywhere close, she's summoned to HR: frozen, no meetings, no tantrums.
   */
  private fileGrievance(time: number): void {
    if (time < this.purgeReadyAt || this.player.dead) return;
    const cfg = BALANCE.grievance;
    this.purgeReadyAt = time + this.signatureCooldown;
    this.runStats.purges++;
    const { x, y } = this.player;
    sfx.stamp();
    this.cameras.main.shake(160, 0.006);
    this.fx.number(x, y - 70, 'GRIEVANCE FILED!', '#fff3c4', 28);
    const ring = this.add.circle(x, y, cfg.radius).setStrokeStyle(10, 0xfff3c4, 0.9).setFillStyle(0xffffff, 0.12).setDepth(13).setScale(0.1);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    // Sheets of paper flying out
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const sheet = this.add.rectangle(x, y, 14, 18, 0xffffff).setStrokeStyle(2, 0x90a4ae).setDepth(13).setRotation(a);
      this.tweens.add({
        targets: sheet, x: x + Math.cos(a) * cfg.radius, y: y + Math.sin(a) * cfg.radius, rotation: a + 4, alpha: 0,
        duration: 480, ease: 'Cubic.out', onComplete: () => sheet.destroy(),
      });
    }
    let hit = 0;
    for (const g of this.livingGerms()) {
      if (Phaser.Math.Distance.Between(x, y, g.x, g.y) > cfg.radius + g.def.radius) continue;
      hit++;
      this.damageGerm(g, cfg.damage, Phaser.Math.Angle.Between(x, y, g.x, g.y), cfg.knockback, 'signature');
      if (g.active) g.stun(time, cfg.stunMs);
    }
    const boss = this.boss;
    if (boss?.summonToHr && boss.germ.active && Phaser.Math.Distance.Between(x, y, boss.germ.x, boss.germ.y) < cfg.hrRange) {
      boss.summonToHr(time, cfg.hrMs);
      this.fx.number(boss.germ.x, boss.germ.y - boss.germ.def.radius - 30, 'SUMMONED TO HR!', '#ffab40', 26);
    }
    if (hit >= 5) this.achieve('honk');
    events.emit(GameEvents.PurgeUsed);
  }

  /**
   * DR. KAYA'S CODE BLUE: a flat-out sprint where he's headed (or facing). He can't be hurt on the way,
   * and every germ he runs through is bowled over.
   */
  private codeBlue(time: number): void {
    if (time < this.purgeReadyAt || this.player.dead) return;
    const cfg = BALANCE.codeBlue;
    this.purgeReadyAt = time + this.signatureCooldown;
    this.runStats.purges++;
    const p = this.player;
    const moving = Math.hypot(inputState.moveX, inputState.moveY) > 0.2;
    const a = moving ? Math.atan2(inputState.moveY, inputState.moveX) : p.rotation;
    // Stop short of walls
    let dist = cfg.distance;
    for (let d = 20; d <= cfg.distance; d += 20) {
      if (!this.flow.lineClear(p.x, p.y, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d)) { dist = Math.max(0, d - 30); break; }
    }
    const x0 = p.x;
    const y0 = p.y;
    const x1 = x0 + Math.cos(a) * dist;
    const y1 = y0 + Math.sin(a) * dist;
    const speed = (dist / cfg.ms) * 1000;
    p.shove(Math.cos(a) * speed, Math.sin(a) * speed, cfg.ms);
    p.guard(cfg.ms + cfg.guardMs);
    p.rotation = a;
    sfx.dash();
    this.cameras.main.shake(140, 0.005);
    this.fx.number(x0, y0 - 70, 'CODE BLUE!', '#7fd3ff', 28);
    const streak = this.add.graphics().setDepth(9.5);
    streak.lineStyle(cfg.width, 0x7fd3ff, 0.45).lineBetween(x0, y0, x1, y1);
    streak.lineStyle(6, 0xffffff, 0.8).lineBetween(x0, y0, x1, y1);
    this.tweens.add({ targets: streak, alpha: 0, duration: 420, onComplete: () => streak.destroy() });
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    let bowled = 0;
    for (const g of this.livingGerms()) {
      // Closest point of the lane to this germ
      const t = Phaser.Math.Clamp(((g.x - x0) * dx + (g.y - y0) * dy) / len2, 0, 1);
      const sx = x0 + dx * t;
      const sy = y0 + dy * t;
      if (Phaser.Math.Distance.Between(g.x, g.y, sx, sy) > cfg.width / 2 + g.def.radius) continue;
      // Shoved off to the side of the lane
      const away = Phaser.Math.Angle.Between(sx, sy, g.x, g.y);
      bowled++;
      this.damageGerm(g, cfg.damage, Number.isFinite(away) ? away : a + Math.PI / 2, cfg.knockback, 'signature');
      if (g.active) g.stun(time, cfg.stunMs);
    }
    if (bowled >= 5) this.achieve('honk');
    events.emit(GameEvents.PurgeUsed);
  }

  /** PA LUCIEN'S CLEAN FIELD: a sterile zone where he stands. Germs inside crawl, and burn. */
  private cleanField(time: number): void {
    if (time < this.purgeReadyAt || this.player.dead) return;
    const cfg = BALANCE.cleanField;
    this.purgeReadyAt = time + this.signatureCooldown;
    this.runStats.purges++;
    this.field?.gfx.destroy();
    const { x, y } = this.player;
    this.field = { x, y, until: time + cfg.ms, gfx: this.add.graphics().setDepth(1.6) };
    sfx.field();
    this.fx.number(x, y - 70, 'CLEAN FIELD!', '#b2fab4', 28);
    const ring = this.add.circle(x, y, cfg.radius).setStrokeStyle(10, 0xb2fab4, 0.9).setScale(0.2).setDepth(13);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 360, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    events.emit(GameEvents.PurgeUsed);
  }

  /** Runs the Clean Field each frame: draws it, slows and burns the germs inside. */
  private updateField(time: number, dtMs: number): void {
    const f = this.field;
    if (!f) return;
    const cfg = BALANCE.cleanField;
    if (time >= f.until) {
      f.gfx.destroy();
      this.field = undefined;
      return;
    }
    const left = (f.until - time) / cfg.ms;
    const pulse = 0.5 + 0.5 * Math.sin(time / 160);
    f.gfx.clear()
      .fillStyle(0xb2fab4, 0.12 + 0.06 * pulse).fillCircle(f.x, f.y, cfg.radius)
      .lineStyle(5, 0x66bb6a, 0.5 + 0.4 * Math.min(1, left * 3)).strokeCircle(f.x, f.y, cfg.radius * (0.97 + 0.03 * pulse));
    for (const g of this.livingGerms()) {
      if ((g.x - f.x) ** 2 + (g.y - f.y) ** 2 > (cfg.radius + g.def.radius) ** 2) continue;
      if (!g.def.boss) g.slow(time, cfg.slow, 250);
      this.damageGerm(g, cfg.dps * (dtMs / 1000), 0, 0, 'signature');
    }
  }

  /** 0..1 while recharging, 1 when ready. */
  private purgeProgress(time: number): number {
    const cd = this.signatureCooldown;
    return time >= this.purgeReadyAt ? 1 : 1 - (this.purgeReadyAt - time) / cd;
  }

  /** SINUS PURGE: a honking shockwave that hurts and blasts away every germ nearby. */
  private sinusPurge(time: number): void {
    if (time < this.purgeReadyAt || this.player.dead) return;
    const cfg = BALANCE.purge;
    this.purgeReadyAt = time + this.signatureCooldown;
    this.runStats.purges++;
    const { x, y } = this.player;
    sfx.purge();
    this.cameras.main.shake(260, 0.012);
    this.tweens.add({ targets: this.player, scale: 1.3, duration: 90, yoyo: true });
    this.fx.number(x, y - 70, 'HRRRNNNKKK!', '#c8ff6b', 30);
    const radius = cfg.radius * (this.mods.purgeRadius ?? 1);
    const ring = this.add.circle(x, y, radius).setStrokeStyle(14, 0xc8ff6b, 0.9).setFillStyle(0xc8ff6b, 0.15).setDepth(13).setScale(0.1);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 420, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    let purged = 0;
    for (const g of this.germs.getChildren() as Germ[]) {
      if (!g.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, g.x, g.y);
      if (d > radius + g.def.radius) continue;
      const angle = Phaser.Math.Angle.Between(x, y, g.x, g.y);
      purged++;
      this.damageGerm(g, cfg.damage, angle, cfg.knockback, 'signature');
      if (g.active) g.stun(time, cfg.stunMs);
      // Spore Pods get knocked onto their backs: no armor, no moving
      if (g.active && g.def.armor) {
        g.flip(time, g.def.armor.flipMs);
        sfx.flip();
        this.fx.number(g.x, g.y - g.def.radius - 10, 'FLIPPED!', '#ffe66d', 18);
        this.achieve('flipper');
      }
    }
    if (purged >= 5) this.achieve('honk');
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
    this.showFloor(f.id);
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
      // Take the stairs to reach Eugene's floor, or when the way to him runs over the other floor
      if (end && (this.floorOf(g.x, g.y) !== here || this.flow.takesStairs(g.x, g.y))) (g.body as Phaser.Physics.Arcade.Body).reset(end.arrive.x, end.arrive.y);
    }
  }

  /** Tracks which room Eugene is in, for the HUD and Diamond. */
  private updateRoom(): void {
    const { x, y } = this.player;
    const here = this.room.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    if (here && here !== this.currentRoom) {
      this.currentRoom = here;
      events.emit(GameEvents.RoomEntered, { id: here.id, name: here.name } satisfies RoomPayload);
      this.helperRoom(here.id);
    }
  }

  /** DONALD: the first visit to X-ray each shift brings him out to help (and unlocks him the first time ever). */
  private helperRoom(id: string): void {
    if (this.helperRooms.has(id) || this.player.dead) return;
    this.helperRooms.add(id);
    for (const def of SCRIBES) {
      if (def.unlockRoom !== id) continue;
      if (unlockScribe(def.id) && def.unlockBanner) events.emit(GameEvents.SecretFound, def.unlockBanner);
      this.scribes.summon(def.id, this.time.now, BALANCE.scribes.ms);
    }
  }

  /** Every station in the clinic. */
  private buildStations(): Station[] {
    const eco = BALANCE.economy;
    const list: Station[] = [];
    for (const o of this.carts) list.push({ o, info: () => ({ verb: 'RESTOCK', cost: this.restockCost }), use: (t) => this.restock(t) });
    for (const door of this.lockedDoors) {
      list.push({
        o: door.o, info: () => ({ verb: 'OPEN', cost: door.o.cost ?? 0 }), use: () => this.buyDoor(door),
        gone: () => !!door.o.opens && this.unlocked.has(door.o.opens),
      });
    }
    for (const o of this.crates) {
      list.push({
        o, use: (t) => this.openCrate(o, t),
        info: () => {
          // A crate replaces the crate tool you're carrying; say so (and it's a press-and-hold)
          const replaces = this.loadout[1]?.def.name;
          return { verb: 'TOOLS', cost: eco.crateCost, note: replaces ? `Pick 1 of 2. Replaces your ${replaces}` : 'Pick 1 of 2 tools', hold: !!replaces };
        },
      });
    }
    for (const o of this.room.obstacles.filter((ob) => ob.kind === 'compounder')) {
      list.push({
        o, use: (t) => this.compound(t),
        info: () => {
          const next = this.sprayer.nextTier;
          if (!next) return { verb: 'MAXED', cost: 0, note: `${this.sprayer.def.name}: Prescription Strength`, blocked: true };
          return { verb: 'UPGRADE', cost: this.upgradeCost(next.cost), note: `${next.name}: ${next.blurb}` };
        },
      });
    }
    // Room traps: use them at their station, then they recharge
    const traps = BALANCE.traps;
    const trap = (kind: ObstacleKind, verb: string, cost: number, cooldownMs: number, note: string, fire: (o: Obstacle, t: number) => void) => {
      for (const o of this.room.obstacles.filter((ob) => ob.kind === kind)) {
        list.push({
          o, use: (t) => this.useTrap(o, cost, cooldownMs, t, fire),
          info: () => {
            const left = (this.trapReadyAt.get(o) ?? 0) - this.time.now;
            return left > 0 ? { verb: 'RECHARGING', cost: 0, note: `Ready in ${Math.ceil(left / 1000)} s`, blocked: true } : { verb, cost, note };
          },
        });
      }
    };
    trap('handDryer', 'DRY', traps.dryer.cost, traps.dryer.cooldownMs, 'Jet hand dryer: blasts germs back', (o, t) => this.blastDryer(o, t));
    trap('autoclave', 'STEAM', traps.autoclave.cost, traps.autoclave.cooldownMs, 'Steam cycle: cooks every germ nearby', (o) => this.steamCycle(o));
    trap('xrayControls', 'X-RAY', traps.xray.cost, traps.xray.cooldownMs, 'A pulse through the walls (you are behind the lead)', () => this.xrayPulse());
    for (const o of this.room.obstacles.filter((ob) => ob.kind === 'vending')) {
      list.push({
        o, use: () => this.openVending(),
        info: () => ({ verb: 'SNACKS', cost: 0, note: 'Break-time snacks. They stack.' }),
      });
    }
    const curtain = traps.curtain;
    for (const c of this.curtains) {
      list.push({
        o: c.o, use: (t) => this.useTrap(c.o, curtain.cost, curtain.cooldownMs, t, () => this.closeCurtain(c, t)),
        info: () => {
          const now = this.time.now;
          if (c.zone) return { verb: 'CURTAIN SHUT', cost: 0, note: `Opens in ${Math.ceil((c.closedUntil - now) / 1000)} s`, blocked: true };
          const left = (this.trapReadyAt.get(c.o) ?? 0) - now;
          return left > 0 ? { verb: 'RECHARGING', cost: 0, note: `Ready in ${Math.ceil(left / 1000)} s`, blocked: true }
            : { verb: 'CURTAIN', cost: curtain.cost, note: `Privacy curtain: a wall for ${curtain.closedMs / 1000} s` };
        },
      });
    }
    for (const o of this.room.obstacles.filter((ob) => ob.kind === 'examTable')) {
      list.push({
        o, use: () => this.rest(o),
        info: () => this.restedAt.get(o) === this.waves.round
          ? { verb: 'RESTED', cost: 0, note: 'Fresh paper next round', blocked: true }
          : { verb: 'REST', cost: eco.restCost, note: `Lie down: +${eco.restHeal} health` },
      });
    }
    // The Miracle Cure's stations (each hidden until the step before it is done)
    list.push(...this.cure.stations());
    // Everything but doors belongs to the room it stands in
    for (const st of list) {
      if (st.gone) continue;
      const cx = st.o.x + st.o.w / 2, cy = st.o.y + st.o.h / 2;
      st.roomId = this.room.rooms.find((r) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h)?.id;
    }
    return list;
  }

  /** Shows the USE button while Eugene stands at a station (cart, door, crate, Compounding Station, exam table). */
  private updateInteract(): void {
    const { x, y } = this.player;
    let target: Station | undefined;
    let best = BALANCE.economy.interactRange;
    if (!this.player.dead) {
      for (const st of this.stations) {
        if (st.gone?.() || (st.roomId && (!this.unlocked.has(st.roomId) || st.roomId === this.closed?.roomId))) continue;
        const d = rectDistance(st.o, x, y);
        if (d < best) { best = d; target = st; }
      }
    }
    this.interactTarget = target;
    const eco = BALANCE.economy;
    const info = target?.info();
    const cost = info?.cost ?? 0;
    const label = info ? (info.blocked || cost === 0 ? info.verb : `${info.verb}\n$${cost}`) : '';
    const station: StationPayload = {
      near: !!info, label, affordable: !!info && !info.blocked && this.copays >= cost,
      hold: !!info && !info.blocked && (cost >= eco.holdToBuyFrom || !!info.hold),
      note: info?.note ?? '',
    };
    const s = this.station;
    if (station.near !== s.near || station.label !== s.label || station.affordable !== s.affordable || station.hold !== s.hold || station.note !== s.note) {
      this.station = station;
      events.emit(GameEvents.StationNearby, station);
    }
  }

  private interact(time: number): void {
    const t = this.interactTarget;
    if (!t || t.gone?.()) return;
    if (t.info().blocked) {
      sfx.denied();
      return;
    }
    t.use(time);
  }

  /** Not enough Copays: buzz and say how many. Returns true if Eugene can afford `cost`. */
  private canAfford(cost: number): boolean {
    if (this.copays >= cost) return true;
    sfx.denied();
    this.fx.number(this.player.x, this.player.y - 60, `NEED $${cost} COPAYS`, '#ffb3b3', 22);
    return false;
  }

  /** COMPOUNDING STATION: upgrades the tool in Eugene's hands to its next tier. */
  private compound(time: number): void {
    const next = this.sprayer.nextTier;
    if (!next || !this.canAfford(this.upgradeCost(next.cost))) return;
    this.addCopays(-this.upgradeCost(next.cost));
    this.sprayer.upgrade(time);
    sfx.spotless();
    this.cameras.main.shake(140, 0.005);
    this.fx.number(this.player.x, this.player.y - 70, `${next.name.toUpperCase()}!`, '#ffe66d', 28);
    this.fx.number(this.player.x, this.player.y - 40, next.blurb, '#e8fff9', 18);
    this.runStats.upgrades++;
    if (!this.sprayer.nextTier) this.achieve('rxStrength');
  }

  /**
   * METHICILLIN'S REWARD: the tool in hand is compounded all the way to Prescription Strength for free
   * (or the other tool, if this one is maxed). Both maxed: the Copays a top tier would have cost.
   */
  private prescribe(time: number): void {
    const tool = [this.sprayer, ...this.loadout].find((t) => t.nextTier);
    if (!tool) {
      const refund = BALANCE.economy.prescriptionMaxedCopays;
      this.addCopays(refund);
      this.fx.number(this.player.x, this.player.y - 40, `ALREADY MAXED: +$${refund}`, '#7fffd4', 20);
      return;
    }
    while (tool.nextTier) {
      tool.upgrade(time);
      this.runStats.upgrades++;
    }
    this.fx.number(this.player.x, this.player.y - 40, `${tool.def.name}: PRESCRIPTION STRENGTH`, '#ffb74d', 20);
    this.achieve('rxStrength');
  }

  /** EXAM TABLE: lie down for a moment and get patched up. Once per table per round. */
  private rest(o: Obstacle): void {
    const eco = BALANCE.economy;
    if (this.player.hp >= this.player.maxHp) {
      this.fx.number(this.player.x, this.player.y - 60, 'YOU ARE PERFECTLY HEALTHY', '#e8fff9', 20);
      return;
    }
    if (!this.canAfford(eco.restCost)) return;
    this.addCopays(-eco.restCost);
    this.restedAt.set(o, this.waves.round);
    const healed = this.player.heal(eco.restHeal);
    this.runStats.rests++;
    this.achieve('doctorsOrders');
    sfx.refill();
    this.fx.number(this.player.x, this.player.y - 64, `+${Math.round(healed)} HEALTH  -$${eco.restCost}`, '#7fffd4', 22);
    events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
  }

  /** A cart restock's price (Short-Staffed: overtime rates). */
  private get restockCost(): number {
    return BALANCE.economy.restockCost * (this.hasMod('shortStaffed') ? BALANCE.modifiers.shortStaffed.restockCostMult : 1);
  }

  private restock(time: number): void {
    const cost = this.restockCost;
    if (this.sprayer.reserveFull) {
      this.fx.number(this.player.x, this.player.y - 60, 'JUG ALREADY FULL', '#e8fff9', 20);
      return;
    }
    if (!this.canAfford(cost)) return;
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

  /** A tool, wired to the arsenal for the ones that don't spray. */
  private makeTool(id: string): Sprayer {
    const tool = new Sprayer(EQUIPMENT[id], this.droplets, (def, x, y, a, t, shot, mult) => this.arsenal.fire(def, x, y, a, t, shot, mult), lockerLevel(id));
    tool.refillScale = this.perks.refill;
    if (this.mods.jugSize) tool.scaleJug(this.mods.jugSize);
    return tool;
  }

  /**
   * RESIDENCY BOARD: this shift's Specialty (a perk and its catch) and the Starter Kit tool, chosen between
   * runs with CME Credits.
   */
  private applyResidency(): void {
    const spec = activeSpecialty();
    this.mods = spec?.mods ?? {};
    this.specialtyName = spec?.name ?? '';
    const m = this.mods;
    if (m.maxHp) {
      this.player.maxHp += m.maxHp;
      this.player.hp = this.player.maxHp;
    }
    if (m.moveSpeed) this.player.setSpeedMod('specialty', m.moveSpeed);
    if (m.startCopays) this.copays += m.startCopays;
    if (m.jugSize) for (const t of this.loadout) t.scaleJug(m.jugSize);
    const start = progress().startTool;
    if (start && EQUIPMENT[start] && CRATE_POOL.includes(start)) {
      this.loadout[1] = this.makeTool(start);
      for (const t of this.loadout) t.slots = this.loadout.length;
    }
  }

  /** Germ toughness for a spawn: the difficulty, and the Specialty's catch (Emergency Medicine: faster germs). */
  private scaled(s: GermScaling): GermScaling {
    return { hpMult: s.hpMult * this.diff.germHp, speedMult: s.speedMult * (this.mods.germSpeed ?? 1) };
  }

  /** A Compounding Station price, after Pharmacology. */
  private upgradeCost(cost: number): number {
    return Math.round(cost * (this.mods.upgradeCost ?? 1));
  }

  private livingGerms(): Germ[] {
    return (this.germs.getChildren() as Germ[]).filter((g) => g.active);
  }

  /** Pays for and fires a room trap, then starts its recharge. */
  private useTrap(o: Obstacle, cost: number, cooldownMs: number, time: number, fire: (o: Obstacle, t: number) => void): void {
    if ((this.trapReadyAt.get(o) ?? 0) > time) return;
    if (cost > 0) {
      if (!this.canAfford(cost)) return;
      this.addCopays(-cost);
    }
    this.trapReadyAt.set(o, time + cooldownMs);
    fire(o, time);
  }

  /** Where a wall-mounted trap's effect starts: just in front of it, toward the middle of its room. */
  private trapOrigin(o: Obstacle, extra = 24): { x: number; y: number } {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const room = this.room.rooms.find((r) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h);
    if (!room) return { x: cx, y: cy };
    const a = Phaser.Math.Angle.Between(cx, cy, room.x + room.w / 2, room.y + room.h / 2);
    const d = Math.max(o.w, o.h) / 2 + extra;
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
  }

  /** BATHROOM JET DRYER: VRRRRR. Everything nearby is blown back (and a little dried out). */
  private blastDryer(o: Obstacle, time: number): void {
    const cfg = BALANCE.traps.dryer;
    const { x, y } = this.trapOrigin(o);
    sfx.dryer();
    this.cameras.main.shake(220, 0.006);
    this.fx.number(x, y - 30, 'VRRRRRRRRR!', '#e8fff9', 26);
    const ring = this.add.circle(x, y, cfg.radius).setStrokeStyle(10, 0xe8fff9, 0.8).setFillStyle(0xe8fff9, 0.12).setDepth(13).setScale(0.1);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    let blown = 0;
    for (const g of this.livingGerms()) {
      if (Phaser.Math.Distance.Between(x, y, g.x, g.y) > cfg.radius + g.def.radius || !this.flow.lineClear(x, y, g.x, g.y)) continue;
      blown++;
      this.damageGerm(g, cfg.damage, Phaser.Math.Angle.Between(x, y, g.x, g.y), cfg.knockback, 'dryer');
      if (g.active) g.stun(time, cfg.stunMs);
    }
    if (blown > 0) this.achieve('airDried');
  }

  /** LAB AUTOCLAVE: it hisses (get clear!), then a steam cycle cooks every germ in front of it. Armor doesn't help. */
  private steamCycle(o: Obstacle): void {
    const cfg = BALANCE.traps.autoclave;
    const { x, y } = this.trapOrigin(o, cfg.radius * 0.45);
    sfx.hiss();
    this.fx.number(x, y - 40, 'HSSSSSSS...', '#e8fff9', 24);
    const warn = this.add.circle(x, y, cfg.radius).setStrokeStyle(6, 0xffffff, 0.7).setFillStyle(0xffffff, 0.08).setDepth(7);
    this.tweens.add({ targets: warn, alpha: 0.35, duration: 200, yoyo: true, repeat: -1 });
    this.time.delayedCall(cfg.windupMs, () => {
      this.tweens.killTweensOf(warn);
      warn.destroy();
      if (this.runOver) return;
      const puff = this.add.circle(x, y, cfg.radius).setFillStyle(0xffffff, 0.5).setDepth(13).setScale(0.3);
      this.tweens.add({ targets: puff, scale: 1.15, alpha: 0, duration: 600, ease: 'Cubic.out', onComplete: () => puff.destroy() });
      this.cameras.main.shake(180, 0.006);
      let cooked = 0;
      for (const g of this.livingGerms()) {
        if (Phaser.Math.Distance.Between(x, y, g.x, g.y) > cfg.radius + g.def.radius || !this.flow.lineClear(x, y, g.x, g.y)) continue;
        cooked++;
        this.damageGerm(g, cfg.damage, Phaser.Math.Angle.Between(x, y, g.x, g.y), 200, 'autoclave');
      }
      this.fx.number(x, y - 40, cooked ? `STERILIZED! ×${cooked}` : 'STERILIZED! (the air)', '#ffe66d', 26);
      if (cooked > 0) this.achieve('sterilized');
    });
  }

  /** X-RAY: a pulse from the machine that goes right through the walls. Eugene is behind the lead partition. */
  private xrayPulse(): void {
    const cfg = BALANCE.traps.xray;
    const m = this.room.obstacles.find((ob) => ob.kind === 'xray');
    if (!m) return;
    const x = m.x + m.w / 2;
    const y = m.y + m.h / 2;
    sfx.xray();
    this.cameras.main.shake(260, 0.008);
    for (const [r, a] of [[1, 0.5], [0.7, 0.35], [0.4, 0.25]]) {
      const ring = this.add.circle(x, y, cfg.radius * r).setStrokeStyle(8, 0xb2ff59, a + 0.3).setFillStyle(0xb2ff59, a * 0.25).setDepth(13).setScale(0.05);
      this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 520, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    }
    let zapped = 0;
    for (const g of this.livingGerms()) {
      if (Phaser.Math.Distance.Between(x, y, g.x, g.y) > cfg.radius + g.def.radius) continue;
      zapped++;
      this.damageGerm(g, cfg.damage, Phaser.Math.Angle.Between(x, y, g.x, g.y), 120, 'xray');
    }
    this.fx.number(x, y - 60, zapped ? `IMAGING COMPLETE ×${zapped}` : 'IMAGING COMPLETE', '#b2ff59', 26);
    this.achieve('radiology');
    this.cure.onXray();
  }

  /** VENDING MACHINE: three random snacks, as many times as you like; the game waits while you choose. */
  private openVending(): void {
    this.vendingOffer = runRng.loot.sample(SNACKS, BALANCE.vending.choices).map((s) => s.id);
    this.showVending('');
  }

  /** A snack's price this shift: dearer for every one of it you've already had. */
  private snackPrice(s: SnackDef): number {
    const had = this.snacks.filter((id) => id === s.id).length;
    return Math.round(s.price * (1 + BALANCE.vending.repeatMarkup * had));
  }

  private showVending(note: string): void {
    const offer = this.vendingOffer;
    if (!offer) return;
    events.emit(GameEvents.VendingOpened, {
      note: note || 'Exact change only. Snacks stack; seconds cost more.',
      options: [
        ...offer.map((id) => {
          const s = SNACKS.find((x) => x.id === id)!;
          return { id, name: `${s.name}  $${this.snackPrice(s)}`, blurb: s.blurb, color: s.color };
        }),
        // The Miracle Cure: slot B4, once the X-ray has shown what's in it
        ...(this.cure.keyForSale ? [this.cure.keyOption()] : []),
      ],
    });
  }

  private buySnack(id: string): void {
    if (id === KEY.id && this.vendingOffer) {
      // B4 doesn't count as a snack
      if (this.cure.buyKey()) {
        this.vendingOffer = undefined;
        events.emit(GameEvents.VendingDone);
      } else {
        this.showVending(`INSUFFICIENT FUNDS. You have $${this.copays}.`);
      }
      return;
    }
    const s = SNACKS.find((x) => x.id === id);
    if (!s || !this.vendingOffer?.includes(id)) return;
    const price = this.snackPrice(s);
    if (this.copays < price) {
      sfx.denied();
      this.showVending(`INSUFFICIENT FUNDS. ${s.name} is $${price}; you have $${this.copays}.`);
      return;
    }
    this.addCopays(-price);
    this.snacks.push(id);
    this.vendingOffer = undefined;
    this.applySnack(s);
    sfx.cash();
    this.fx.number(this.player.x, this.player.y - 70, `${s.name.toUpperCase()}!`, '#ffe66d', 26);
    this.achieve('snackBreak');
    events.emit(GameEvents.VendingDone);
  }

  /** Snacks stack: each multiplies its perk again, up to `BALANCE.vending.caps`. */
  private applySnack(s: SnackDef): void {
    const caps = BALANCE.vending.caps;
    switch (s.effect) {
      case 'maxHp':
        this.player.maxHp += s.amount;
        this.player.heal(s.amount);
        events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
        break;
      case 'speed':
        this.snackSpeed = Math.min(caps.speed, this.snackSpeed * s.amount);
        this.player.setSpeedMod('snack', this.snackSpeed);
        break;
      case 'refill':
        this.perks.refill = Math.max(caps.refill, this.perks.refill * s.amount);
        for (const t of this.loadout) t.refillScale = this.perks.refill;
        break;
      case 'purge':
        this.perks.purge = Math.max(caps.purge, this.perks.purge * s.amount);
        break;
      case 'crit':
        this.perks.crit = Math.min(caps.crit, this.perks.crit * s.amount);
        break;
    }
  }

  /**
   * SUPPLY REQUISITION: pay at a crate and fill in the form. Pick one of two tools (never the crate tool
   * you're carrying), or appeal the decision for a new pair at a rising price. Insurance being insurance,
   * now and then the claim is simply denied: a joke item and half the money back.
   */
  private openCrate(o: Obstacle, _time: number): void {
    const eco = BALANCE.economy;
    if (!this.canAfford(eco.crateCost)) return;
    this.addCopays(-eco.crateCost);
    if (runRng.loot.chance(this.claimDeniedChance)) {
      this.denyClaim(o.x + o.w / 2, o.y + o.h / 2, eco.crateCost);
      return;
    }
    sfx.cash();
    this.requisition = { crate: o, options: this.requisitionOptions(), appeals: 0 };
    this.showRequisition('');
  }

  /** Two tools for the form: not one Eugene carries, and (after an appeal) not the pair he just turned down. */
  private requisitionOptions(turnedDown: string[] = []): string[] {
    const held = this.loadout.map((t) => t.def.id);
    let pool = CRATE_POOL.filter((id) => !held.includes(id) && !turnedDown.includes(id));
    if (pool.length < 2) pool = CRATE_POOL.filter((id) => !held.includes(id));
    return runRng.loot.sample(pool, 2);
  }

  private get appealCost(): number {
    const eco = BALANCE.economy;
    return eco.appealCost + eco.appealStep * (this.requisition?.appeals ?? 0);
  }

  private showRequisition(note: string): void {
    const r = this.requisition;
    if (!r) return;
    const payload: RequisitionPayload = {
      options: r.options.map((id) => ({ id, name: EQUIPMENT[id].name, blurb: EQUIPMENT[id].blurb ?? '', color: EQUIPMENT[id].color })),
      appealCost: this.appealCost,
      canAffordAppeal: this.copays >= this.appealCost,
      note,
    };
    events.emit(GameEvents.RequisitionOpened, payload);
  }

  /** APPEAL THE DECISION: pay for a fresh pair. The appeal itself can be denied (half of it comes back). */
  private appealRequisition(): void {
    const r = this.requisition;
    if (!r) return;
    const cost = this.appealCost;
    if (this.copays < cost) {
      sfx.denied();
      return;
    }
    this.addCopays(-cost);
    r.appeals++;
    this.achieve('secondOpinion');
    if (runRng.loot.chance(this.claimDeniedChance)) {
      const refund = Math.round(cost * BALANCE.economy.deniedRefund);
      this.addCopays(refund);
      sfx.stamp();
      this.showRequisition(`APPEAL DENIED. $${refund} refunded. The original decision stands.`);
      return;
    }
    sfx.cash();
    r.options = this.requisitionOptions(r.options);
    this.showRequisition(`Appeal #${r.appeals} approved. New options enclosed.`);
  }

  private pickRequisition(id: string): void {
    const r = this.requisition;
    if (!r || !r.options.includes(id)) return;
    this.requisition = undefined;
    this.giveTool(id, r.crate, this.time.now);
  }

  /** CLAIM DENIED: a joke item and half the money back. */
  private denyClaim(x: number, y: number, cost: number): void {
    const refund = Math.round(cost * BALANCE.economy.deniedRefund);
    this.addCopays(refund);
    sfx.stamp();
    this.cameras.main.shake(120, 0.004);
    this.achieve('claimDenied');
    this.fx.number(x, y - 50, 'CLAIM DENIED', '#ff6b6b', 30);
    events.emit(GameEvents.ClaimDenied, { title: 'CLAIM DENIED', line: `Enclosed: ${runRng.loot.pick(DENIED_ITEMS)}. $${refund} refunded.` });
  }

  /** Hands Eugene a crate tool (it replaces the one he had) and puts it in his hands. */
  private giveTool(id: string, o: Obstacle, time: number): void {
    const def = EQUIPMENT[id];
    const tool = this.makeTool(id);
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
    if (!this.canAfford(cost)) return;
    this.addCopays(-cost);
    this.unlockRoom(door.o.opens!, cost);
  }

  /** Opens every door into a room, lets germs path (and spawn) there, and lifts its fog. */
  unlockRoom(id: string, cost = 0): void {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    this.runStats.roomsOpened++;
    if (id === 'upstairs') this.achieve('upstairs');
    for (const d of this.lockedDoors.filter((d) => d.o.opens === id)) {
      this.solids.remove(d.zone, true, true);
      d.art.destroy();
      d.label.destroy();
      this.fx.number(d.o.x + d.o.w / 2, d.o.y + d.o.h / 2, 'OPEN!', '#7fffd4', 26);
    }
    this.lockedDoors = this.lockedDoors.filter((d) => d.o.opens !== id);
    this.flow.rebuild(this.blockingObstacles());
    this.flow.setPortals(this.stairLinks());
    this.vents.sync();
    for (const obj of this.fog.get(id) ?? []) {
      this.tweens.add({ targets: obj, alpha: 0, duration: 500, onComplete: () => obj.destroy() });
    }
    this.fog.delete(id);
    sfx.cash();
    const area = this.room.rooms.find((r) => r.id === id);
    events.emit(GameEvents.RoomUnlocked, { id, name: area?.name ?? id, cost } satisfies RoomPayload);
  }

  /** Everything solid right now: furniture, walls, doors not yet bought, and curtains pulled shut. */
  private blockingObstacles(): Obstacle[] {
    return [...this.room.obstacles.filter((o) => !(o.opens && this.unlocked.has(o.opens))), ...this.curtains.filter((c) => c.zone).map((c) => c.o)];
  }

  /** EXAM ROOM PRIVACY CURTAIN: pulled across the doorway, it's a wall until it slides back open. */
  private closeCurtain(c: Curtain, time: number): void {
    const { o } = c;
    // Anyone standing in the doorway is nudged out to whichever side they were nearer
    const across = o.w >= o.h ? 'y' : 'x';
    const mid = across === 'y' ? o.y + o.h / 2 : o.x + o.w / 2;
    const half = (across === 'y' ? o.h : o.w) / 2;
    for (const body of [this.player, ...this.livingGerms()] as Phaser.Physics.Arcade.Sprite[]) {
      const r = (body.body as Phaser.Physics.Arcade.Body).halfWidth;
      if (rectDistance(o, body.x, body.y) > r) continue;
      const side = (across === 'y' ? body.y : body.x) < mid ? -1 : 1;
      const to = mid + side * (half + r + 2);
      if (across === 'y') body.setY(to);
      else body.setX(to);
    }
    c.zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
    this.solids.add(c.zone);
    c.closedUntil = time + BALANCE.traps.curtain.closedMs;
    this.flow.rebuild(this.blockingObstacles());
    this.drawCurtain(c);
    sfx.tapeRip();
    this.fx.number(o.x + o.w / 2, o.y - 10, 'SWISH!', '#e8fff9', 22);
  }

  /** Slides shut curtains back open when their time is up. */
  private updateCurtains(time: number): void {
    let changed = false;
    for (const c of this.curtains) {
      if (!c.zone || time < c.closedUntil) continue;
      this.solids.remove(c.zone, true, true);
      c.zone = undefined;
      this.drawCurtain(c);
      changed = true;
    }
    if (changed) this.flow.rebuild(this.blockingObstacles());
  }

  /** Whether a shut curtain lies on the straight line between two points (only those snap the twins' strand). */
  private curtainBetween(ax: number, ay: number, bx: number, by: number): boolean {
    const line = new Phaser.Geom.Line(ax, ay, bx, by);
    return this.curtains.some((c) => c.zone && Phaser.Geom.Intersects.LineToRectangle(line, new Phaser.Geom.Rectangle(c.o.x, c.o.y, c.o.w, c.o.h)));
  }

  /** A curtain: bunched at both ends of the doorway when open, pleated right across it when shut. */
  private drawCurtain(c: Curtain): void {
    const { o, art: g } = c;
    g.clear();
    const along = o.w >= o.h;
    const len = along ? o.w : o.h;
    const thick = along ? o.h : o.w;
    const panel = (from: number, to: number) => {
      const folds = Math.max(2, Math.round((to - from) / 14));
      const step = (to - from) / folds;
      for (let i = 0; i < folds; i++) {
        const a = from + i * step;
        const color = i % 2 ? 0x80cbc4 : 0xb2dfdb;
        if (along) g.fillStyle(color).fillRect(o.x + a, o.y + thick * 0.25, step, thick * 0.5);
        else g.fillStyle(color).fillRect(o.x + thick * 0.25, o.y + a, thick * 0.5, step);
      }
    };
    // The rail
    g.lineStyle(3, 0x90a4ae);
    if (along) g.lineBetween(o.x, o.y + thick / 2, o.x + o.w, o.y + thick / 2);
    else g.lineBetween(o.x + thick / 2, o.y, o.x + thick / 2, o.y + o.h);
    if (c.zone) panel(0, len);
    else {
      panel(0, 18);
      panel(len - 18, len);
    }
  }

  private onGermBump(germ: Germ): void {
    if (this.runOver) return;
    const time = this.time.now;
    const boss = bossOwns(this.boss, germ) ? this.boss : undefined;
    if (boss?.ignoresContact) return;
    const bossContact = boss?.contactDamage?.(germ);
    if (bossContact === 0) return;
    if (germ.chargeState === 'charging' && germ.def.charge) {
      // Run over by a Bulldozer: a big hit and a shove along its path
      const c = germ.def.charge;
      germ.chargeState = 'none';
      germ.nextChargeAt = time + Phaser.Math.Between(...c.cooldownMs);
      germ.setVelocity(0, 0);
      this.player.shove(Math.cos(germ.chargeAngle) * 650, Math.sin(germ.chargeAngle) * 650, 300);
      this.hurtPlayer(c.damage, germ.def.id);
      return;
    }
    germ.bounceFrom(this.player.x, this.player.y, time);
    this.hurtPlayer(bossContact ?? germ.def.contactDamage, germ.def.id);
  }

  /** Every way Eugene gets hurt goes through here: sound, shake, HUD, and death. */
  private hurtPlayer(amount: number, source: string): void {
    if (DEBUG.god) return;
    if (this.runOver || !this.player.takeDamage(amount * this.diff.germDamage, this.time.now)) return;
    this.hurtThisRound = true;
    this.runStats.killer = source;
    sfx.hurt();
    this.cameras.main.shake(120, 0.006);
    events.emit(GameEvents.PlayerBumped, { germId: source });
    events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
    if (this.player.dead) this.endRun();
  }

  /**
   * Places one germ at a germ vent away from Eugene. Returns false if the pool is full, or if every vent it could
   * use is barricaded (it waits, pushing on a barricade, and the wave tries again).
   */
  private spawnGerm(id: string, scaling: GermScaling): boolean {
    const def = GERMS[id];
    if (!def) return false;
    if (def.boss) scaling = { ...scaling, hpMult: Math.min(scaling.hpMult, WAVES.bossHpMultMax) };
    // Germs come in through the vents of every room that's open, but not right on top of Eugene or miles away
    const { minSpawnDistance, maxSpawnDistance } = BALANCE.spawning;
    // Waiting Room Rush: everyone comes in through the front
    const fromStart = !!this.waves.special?.fromStart;
    const start = new Set(this.room.rooms.filter((r) => r.start).map((r) => r.id));
    // (not in a room Construction has closed: germs fit under the door, but they don't start there)
    const usable = (roomId: string) => this.unlocked.has(roomId) && roomId !== this.closed?.roomId && (!fromStart || start.has(roomId));
    const dist = (p: { x: number; y: number }) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y);
    const choose = (spots: Vent[]): Vent => {
      // Mold grows where Eugene isn't: the farthest open vent
      if (def.spawner) return spots.reduce((a, b) => (dist(b) > dist(a) ? b : a));
      const far = spots.filter((p) => dist(p) >= minSpawnDistance);
      const ideal = far.filter((p) => dist(p) <= maxSpawnDistance);
      return runRng.spawn.pick(ideal.length ? ideal : far.length ? far : spots);
    };
    // Bosses don't wait for prior authorization
    const spot = this.vents.pick(this.time.now, usable, choose, !!def.boss);
    if (!spot) return false;
    const germ = this.germs.get() as Germ | null;
    if (!germ) return false;
    if (def.spawnAs) {
      // COLONY: a flock of specks instead of one germ
      const s = def.spawnAs;
      for (let i = 0; i < s.count; i++) {
        const speck = i === 0 ? germ : (this.germs.get() as Germ | null);
        if (!speck) break;
        const a = (i / s.count) * Math.PI * 2;
        speck.spawn(GERMS[s.id], spot.x + Math.cos(a) * 26, spot.y + Math.sin(a) * 26, this.scaled(scaling));
        this.applyOngoingPowerups(speck);
        this.moonSize(speck);
      }
      return true;
    }
    germ.spawn(def, spot.x, spot.y, this.scaled(scaling));
    this.maybeElite(germ);
    this.applyOngoingPowerups(germ);
    this.moonSize(germ);
    if (def.brain === 'diamond') {
      this.boss?.destroy();
      this.boss = new DiamondBrain(this.bossHost(), germ);
    } else if (def.brain === 'patientZero') {
      this.boss?.destroy();
      this.boss = new PatientZeroBrain({
        ...this.bossHost('patientZero'),
        // COUGH: a spray of Viral Sprinters out of his cone
        cough: (x, y, angle) => {
          const n = BALANCE.patientZero.coughGerms;
          for (let i = 0; i < n; i++) {
            const a = angle + (i - (n - 1) / 2) * 0.25;
            this.bossHost().spawnMinion('sprinter', x, y, Math.cos(a) * 320, Math.sin(a) * 320);
          }
        },
        // SNEEZE: a volley of mucus globs down the red line
        sneezeVolley: (x, y, angle) => {
          const spit = GERMS.sneezer.spit!;
          for (let i = 0; i < BALANCE.patientZero.sneezeGlobs; i++) {
            const a = angle + Phaser.Math.FloatBetween(-0.06, 0.06);
            this.launchGlob(x + Math.cos(angle) * 70, y + Math.sin(angle) * 70, a, spit.globSpeed * (1 + i * 0.18), spit.globRange * 1.3, spit);
          }
        },
      }, germ);
    } else if (def.brain === 'methicillin') {
      this.boss?.destroy();
      this.boss = new MethicillinBrain(this.bossHost(def.id), germ);
    } else if (def.brain === 'influenza' && def.partner) {
      // THE INFLUENZA TWINS: H comes in with N right beside it
      const partner = this.germs.get() as Germ | null;
      if (partner) {
        partner.spawn(GERMS[def.partner], spot.x + 90, spot.y, this.scaled(scaling));
        this.boss?.destroy();
        this.boss = new InfluenzaBrain({
          ...this.bossHost(def.id),
          spit: (x, y, angle) => {
            const s = GERMS.sneezer.spit!;
            this.launchGlob(x, y, angle, s.globSpeed, s.globRange, s);
          },
          lineClear: (ax, ay, bx, by) => this.flow.lineClear(ax, ay, bx, by),
          curtainBetween: (ax, ay, bx, by) => this.curtainBetween(ax, ay, bx, by),
          finish: (g) => this.finishGerm(g),
          emitBar: (bar) => events.emit(GameEvents.BossHealth, bar),
        }, germ, partner);
      }
    }
    if (def.boss) {
      sfx.bossArrives();
      events.emit(GameEvents.BossSpawned, this.boss?.bar?.() ?? { name: def.name, hp: germ.hp, maxHp: germ.maxHp });
    }
    return true;
  }

  /** A germ let loose at (x, y) (a patient's violation, a splitting elite), at this round's toughness. */
  private spawnGermAt(id: string, x: number, y: number, ignoreCap = false): void {
    const r = Math.max(1, this.waves.round);
    // Same on-screen cap as wave spawns, so violations can't flood the room
    if (!ignoreCap && this.germs.countActive(true) >= WAVES.maxAlive(r)) return;
    const def = GERMS[id];
    const germ = this.germs.get() as Germ | null;
    if (!def || !germ) return;
    germ.spawn(def, x, y, this.scaled({ hpMult: WAVES.hpMult(r), speedMult: WAVES.speedMult(r) }));
    this.applyOngoingPowerups(germ);
    this.moonSize(germ);
  }

  /** FULL MOON: germs come in odd sizes (looks only; bosses stay boss-sized). */
  private moonSize(germ: Germ): void {
    if (!this.hasMod('fullMoon') || germ.def.boss) return;
    const fm = BALANCE.modifiers.fullMoon;
    germ.setMoonSize(runRng.spawn.float(fm.sizeMin, fm.sizeMax));
  }

  /** RESISTANT: from round 8 some germs arrive as elites with a trait. */
  private maybeElite(germ: Germ, force?: EliteAffix): void {
    const el = BALANCE.elites;
    if (germ.def.boss) return;
    const boost = this.waves.special?.eliteBoost ?? 1;
    if (!force && runRng.spawn.next() >= Math.min(0.6, el.chance(this.waves.round) * boost)) return;
    const affix = force ?? runRng.spawn.pick(Object.keys(ELITE_AFFIXES) as EliteAffix[]);
    germ.makeElite(affix, el.hpMult, { shield: el.shield, speed: el.hastySpeed });
  }

  /** Freezes or slows a germ that arrives while Prior Authorization or ER Wait Time is running. */
  private applyOngoingPowerups(germ: Germ): void {
    const time = this.time.now;
    if (this.powerups.isActive('priorAuth', time)) germ.freezeFor(time, this.powerups.until('priorAuth') - time);
    if (this.powerups.isActive('erWait', time) && !germ.def.boss) germ.slow(time, BALANCE.powerups.erWaitSlow, this.powerups.until('erWait') - time);
  }

  /** A power-up was picked up: start its effect. */
  private onPowerup(def: PowerupDef, time: number): void {
    if (def.id === 'priorAuth') this.achieve('pendingApproval');
    const cfg = BALANCE.powerups;
    const living = (this.germs.getChildren() as Germ[]).filter((g) => g.active);
    sfx.spotless();
    this.cameras.main.shake(120, 0.004);
    this.fx.number(this.player.x, this.player.y - 70, `${def.name}!`, '#ffe66d', 26);
    switch (def.id) {
      case 'priorAuth':
        for (const g of living) g.freezeFor(time, def.ms);
        break;
      case 'erWait':
        for (const g of living) if (!g.def.boss) g.slow(time, cfg.erWaitSlow, def.ms);
        break;
      case 'freeRefills':
        for (const t of this.loadout) t.freeUntil = time + def.ms;
        break;
      case 'statClean': {
        const { x, y } = this.player;
        const ring = this.add.circle(x, y, cfg.statCleanRadius).setStrokeStyle(18, 0xffffff, 0.9).setFillStyle(0xe8fff9, 0.25).setDepth(13).setScale(0.05);
        this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 520, ease: 'Cubic.out', onComplete: () => ring.destroy() });
        this.cameras.main.flash(160, 255, 255, 255);
        for (const g of living) {
          if (Phaser.Math.Distance.Between(x, y, g.x, g.y) > cfg.statCleanRadius) continue;
          const angle = Phaser.Math.Angle.Between(x, y, g.x, g.y);
          this.damageGerm(g, g.def.boss ? g.maxHp * cfg.statCleanBoss : g.hp + g.shield + 1, angle, 300, 'powerup');
        }
        break;
      }
      case 'fluShot': {
        const hp = cfg.fluShotHp;
        this.player.maxHp += hp;
        this.player.heal(hp);
        this.fx.number(this.player.x, this.player.y - 40, `+${hp} MAX HEALTH`, '#80cbc4', 20);
        events.emit(GameEvents.PlayerHealthChanged, { hp: this.player.hp, maxHp: this.player.maxHp });
        break;
      }
      case 'prescription':
        this.prescribe(time);
        break;
      case 'scribeOmar':
      case 'scribeAlan':
      case 'techDonald':
        if (def.scribe) this.scribes.summon(def.scribe, time, def.ms);
        break;
      // triage and doubleCopay are checked where they apply
    }
  }

  private onPatientCleaned(p: Patient): void {
    this.runStats.patientsCleaned++;
    const points = BALANCE.patients.cleanPoints;
    this.score += points;
    this.addCopays(BALANCE.economy.cleanPatientCopays);
    this.fx.number(p.x, p.y - 40, `+${points} CLEAN  +$${BALANCE.economy.cleanPatientCopays}`, '#7fffd4', 22);
    sfx.refill();
    events.emit(GameEvents.ScoreChanged, { score: this.score });
  }

  /** What the Miracle Cure needs from the scene. */
  private cureHost(): ConstructorParameters<typeof MiracleCure>[0] {
    return {
      scene: this,
      player: this.player,
      obstacles: this.room.obstacles,
      say: (x, y, text, color, size) => this.fx.number(x, y, text, color, size),
      banner: (title, line) => events.emit(GameEvents.SecretFound, { title, line }),
      pay: (cost) => {
        if (!this.canAfford(cost)) return false;
        this.addCopays(-cost);
        return true;
      },
      roundActive: () => this.waves.roundActive,
      bossRound: () => this.waves.isBossRound,
      teleport: (x, y) => {
        (this.player.body as Phaser.Physics.Arcade.Body).reset(x, y);
        this.stairsReadyAt = this.time.now + 600;
        this.fitCameraToFloor(true);
        this.flow.update(x, y);
        sfx.refill();
      },
      spawnFax: () => this.spawnFax(),
      clearRecords: () => {
        const f = this.floorOf(RECORDS_ROOM.arrive.x, RECORDS_ROOM.arrive.y);
        for (const g of this.livingGerms()) if (this.floorOf(g.x, g.y) === f) g.kill();
      },
      giveIonizer: () => {
        const { x, y } = this.player;
        this.giveTool('ionizer9000', { kind: 'crate', x: x - 12, y: y - 12, w: 24, h: 24 }, this.time.now);
      },
      clockOut: () => this.endRun(true),
      achieve: (id) => this.achieve(id),
    };
  }

  /** THE LAST FAX MACHINE wakes up in the Records Room (as tough as this round's boss would be). */
  private spawnFax(): void {
    const def = GERMS.faxMachine;
    const germ = this.germs.get() as Germ | null;
    if (!germ || this.runOver) return;
    const r = Math.max(1, this.waves.round);
    const home = RECORDS_ROOM.faxHome;
    germ.spawn(def, home.x, home.y, this.scaled({ hpMult: Math.min(WAVES.hpMult(r), WAVES.bossHpMultMax), speedMult: 1 }));
    this.boss?.destroy();
    this.boss = new FaxMachineBrain(this.bossHost('faxMachine'), germ, home);
    sfx.bossArrives();
    events.emit(GameEvents.BossSpawned, { name: def.name, hp: germ.hp, maxHp: germ.maxHp });
  }

  /** The twin already down when the other fell: counts as a kill, splats, and is gone. */
  private finishGerm(g: Germ): void {
    this.kills++;
    this.runStats.kills[g.def.id] = (this.runStats.kills[g.def.id] ?? 0) + 1;
    this.fx.germSplat(g.x, g.y, g.def.color);
    this.fx.germPop(g.texture.key, g.x, g.y, g.rotation, g.scaleX, g.y - g.def.radius - 8, true);
    events.emit(GameEvents.GermKilled, { germId: g.def.id, x: g.x, y: g.y, totalKills: this.kills });
    g.kill();
  }

  /** What a boss brain is allowed to touch. `killer` is who gets the blame on the Discharge Summary. */
  private bossHost(killer = 'diamond'): BossHost {
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
      damagePlayer: (amount) => this.hurtPlayer(amount, killer),
      surname: this.character.surname,
      doctor: this.character.id,
      canMeet: () => !!this.currentRoom?.start,
    };
  }

  /** Whether a modifier is in play this shift. */
  hasMod(id: ModifierId): boolean {
    return this.shift.mods.includes(id);
  }

  /**
   * POWER OUTAGE: one pre-drawn dark texture with a soft hole of light in the middle, drawn at a fraction
   * of its size and scaled up (the blur doesn't matter in the dark). It's twice the widest screen in each
   * direction, so moving it to the doctor's screen position always covers the view. No per-frame drawing.
   */
  private buildDarkness(): Phaser.GameObjects.Image {
    const cfg = BALANCE.modifiers.powerOutage;
    const key = 'power-outage-dark';
    const k = cfg.texScale;
    if (!this.textures.exists(key)) {
      const w = Math.ceil((2 * 2400) / k);
      const h = Math.ceil((2 * 720) / k);
      const tex = this.textures.createCanvas(key, w, h)!;
      const ctx = tex.getContext();
      ctx.fillStyle = '#05080f';
      ctx.fillRect(0, 0, w, h);
      // Cut the light out: fully clear in the middle, fading back to dark at the edge
      const r = cfg.lightRadius / k;
      const glow = ctx.createRadialGradient(w / 2, h / 2, r * (1 - cfg.softEdge), w / 2, h / 2, r);
      glow.addColorStop(0, 'rgba(0,0,0,1)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      tex.refresh();
    }
    // Above the room, germs and effects; below floating numbers (20) and speech bubbles (30)
    return this.add.image(0, 0, key).setScrollFactor(0).setScale(k).setAlpha(cfg.darkness).setDepth(14);
  }

  /** Keeps the light on the doctor (screen position: the camera follows him, but not always centred). */
  private updateDarkness(): void {
    if (!this.dark) return;
    const cam = this.cameras.main;
    this.dark.setPosition(this.player.x - cam.scrollX, this.player.y - cam.scrollY);
  }

  /** Whether (x, y) is inside room `id` (any of its boxes). */
  private inRoom(id: string, x: number, y: number): boolean {
    return this.room.rooms.some((r) => r.id === id && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  }

  /** Could the doctor still walk back to the waiting room with `extra` in the way? (Coarse, so it errs on "no".) */
  private canWalkHome(extra: Obstacle[]): boolean {
    const field = new FlowField(this.room.width, this.room.height, [...this.blockingObstacles(), ...extra]);
    field.setPortals(this.stairLinks());
    const home = this.room.playerSpawn;
    field.update(home.x, home.y);
    const { x, y } = this.player;
    // His own cell can read as blocked when he hugs furniture: any open cell next to him will do
    for (const [dx, dy] of [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]]) if (field.reaches(x + dx, y + dy)) return true;
    return false;
  }

  /**
   * CONSTRUCTION: at the start of a round, one room that's been opened closes to the doctor for the round
   * (germs fit under the door). Never the waiting room, never the room he's in or a door near him, and only
   * if he can still walk back to the waiting room. If no room qualifies, nothing closes this round.
   */
  private closeForConstruction(round: number): void {
    const cfg = BALANCE.modifiers.construction;
    if (round < cfg.fromRound || this.closed || this.runOver) return;
    const { x, y } = this.player;
    const doorsOf = (id: string) => this.room.obstacles.filter((o) => o.opens === id);
    const start = new Set(this.room.rooms.filter((r) => r.start).map((r) => r.id));
    const candidates = [...this.unlocked].filter((id) => !start.has(id) && !this.inRoom(id, x, y)
      && doorsOf(id).length > 0 && doorsOf(id).every((o) => rectDistance(o, x, y) > cfg.clearance)).sort();
    for (const id of runRng.world.shuffle(candidates)) {
      const doors = doorsOf(id);
      if (!this.canWalkHome(doors)) continue;
      const objects: Phaser.GameObjects.GameObject[] = [];
      for (const o of doors) {
        const zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
        this.constructionWalls.add(zone);
        const art = this.add.graphics().setDepth(5);
        art.fillStyle(0x263238).fillRect(o.x, o.y, o.w, o.h);
        // Hazard stripes
        art.fillStyle(0xffb300);
        const across = o.w >= o.h;
        const len = across ? o.w : o.h;
        for (let i = 0; i < len; i += 24) {
          if (across) art.fillRect(o.x + i, o.y, 12, o.h);
          else art.fillRect(o.x, o.y + i, o.w, 12);
        }
        art.lineStyle(3, 0x1b2b30).strokeRect(o.x, o.y, o.w, o.h);
        objects.push(zone, art, this.doorLabel(o, CONSTRUCTION_SIGN).setColor('#ffffff').setBackgroundColor('#1b2b30cc'));
      }
      this.closed = { roomId: id, objects };
      const area = this.room.rooms.find((r) => r.id === id);
      sfx.stamp();
      this.fx.number(x, y - 80, `${area?.name.toUpperCase() ?? id}: ${CONSTRUCTION_LINES.closed}`, '#ffb300', 22);
      return;
    }
  }

  /** CONSTRUCTION: the round's over, the renovations are (somehow) done. */
  private reopenConstruction(): void {
    if (!this.closed) return;
    for (const obj of this.closed.objects) {
      if (obj instanceof Phaser.GameObjects.Zone) this.constructionWalls.remove(obj, true, true);
      else obj.destroy();
    }
    const area = this.room.rooms.find((r) => r.id === this.closed?.roomId);
    this.closed = undefined;
    if (!this.runOver) this.fx.number(this.player.x, this.player.y - 80, `${area?.name.toUpperCase() ?? ''} ${CONSTRUCTION_LINES.reopened}`, '#7fffd4', 20);
  }

  /** Boss theme while a boss is about; otherwise the pressure layer follows the crowd and Eugene's health (config/music). */
  private updateMusic(alive: number): void {
    const w = this.waves;
    const p = MUSIC.pressure;
    const boss = (w.roundActive && w.isBossRound) || !!this.boss?.germ.active;
    let level = 0;
    if (w.roundActive || boss) {
      const crowd = alive / WAVES.maxAlive(Math.max(1, w.round));
      level = Math.max(p.roundFloor, Phaser.Math.Clamp((crowd - p.crowdFrom) / (p.crowdFull - p.crowdFrom), 0, 1));
      if (this.player.hp / this.player.maxHp <= BALANCE.player.lowHealth) level = 1;
    }
    setMusicMix(boss ? 'boss' : 'clinic', level);
  }

  /**
   * Eugene is down (or, with `clockedOut`, the Miracle Cure's alternate ending: he clocks out): freeze the room,
   * save the high score, show the game over screen.
   */
  private endRun(clockedOut = false): void {
    this.runOver = true;
    inputState.firing = false;
    if (clockedOut) {
      this.achieve('shiftComplete');
      grant('scrubCap');
      this.player.setVelocity(0, 0);
      this.tweens.add({ targets: this.player, alpha: 0, duration: 900 });
      sfx.spotless();
    } else {
      this.player.collapse();
      this.boss?.onPlayerDown();
      sfx.gameOver();
    }
    for (const g of this.germs.getChildren() as Germ[]) if (g.active) g.freeze();
    for (const gl of this.globs.getChildren() as Glob[]) if (gl.active) gl.retire();
    stopMusic();
    events.emit(GameEvents.PlayerDied);

    const round = this.waves.round;
    const st = this.runStats;
    const sh = this.shift;
    if (sh.daily) this.achieve('clockedIn');
    // Records per difficulty; Today's Shift keeps the day's best instead (core/save.ts)
    const record = recordRun(this.score, round, st.bestStreak, this.kills, sh.difficulty, sh.daily);
    // CME Credits for the Residency Board (and lifetime kills for the Atlas); the day's first Today's Shift earns a bonus
    const dailyBonus = sh.daily && record.firstDailyToday ? BALANCE.daily.firstFinishCme : 0;
    const cme = creditsFor(round, st.achievements.length, this.bossesDefeated) + dailyBonus;
    // NPS Scores hire the Pals
    const nps = npsFor(round, st.patientsCleaned, this.bossesDefeated);
    // A share of the shift's Copays goes home to the Equipment Locker
    const bank = bankFor(st.copaysEarned);
    recordShift(cme, st.kills, nps, bank);
    const [favId, favCount] = Object.entries(st.kills).sort((a, b) => b[1] - a[1])[0] ?? [];
    const killer = st.killer ? GERMS[st.killer] : undefined;
    const result: RunResult = {
      score: this.score, round, kills: this.kills,
      bestScore: record.next.bestScore, bestRound: record.next.bestRound,
      newBestScore: record.newBestScore, newBestRound: record.newBestRound,
      causeOfDeath: clockedOut ? 'None. Clocked out on time. Went home. Slept.' : killer?.deathNote ?? 'Exhaustion. Nobody covered your shift.',
      secondsSurvived: Math.round((this.time.now - st.startedAt) / 1000),
      bestStreak: st.bestStreak, newBestStreak: record.newBestStreak, recordStreak: record.next.bestStreak,
      copaysEarned: st.copaysEarned, roomsOpened: st.roomsOpened,
      roomsTotal: new Set(this.room.rooms.filter((r) => !r.start && !r.secret).map((r) => r.id)).size,
      upgrades: st.upgrades, crits: st.crits, perfectPours: st.perfectPours,
      favoriteVictim: favId ? { name: GERMS[favId]?.name ?? favId, count: favCount ?? 0 } : undefined,
      totalKills: record.save.totalKills, runs: record.save.runs,
      newAchievements: [...st.achievements],
      chart: this.character.chart,
      cme,
      nps,
      bank,
      specialty: this.specialtyName,
      difficulty: difficultyById(sh.difficulty).name,
      modifiers: sh.mods.map((id) => modifierById(id)?.name ?? id),
      daily: sh.daily,
      dailyBonus,
      clockedOut,
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
  /** The shared Graphics for static art on the floor containing (x, y), at `depth`. */
  private floorArt(x: number, y: number, depth: number): Phaser.GameObjects.Graphics {
    const key = `${this.floorOf(x, y)?.id ?? 'all'}@${depth}`;
    let gfx = this.floorGraphics.get(key);
    if (!gfx) {
      gfx = this.add.graphics().setDepth(depth);
      this.floorGraphics.set(key, gfx);
    }
    return gfx;
  }

  /** Files every static map object created since `from` under its floor (for hiding the floor Eugene isn't on). */
  private sortStaticByFloor(from: number): void {
    this.floorStatic = new Map();
    const byGfx = new Map<Phaser.GameObjects.GameObject, string>();
    for (const [key, gfx] of this.floorGraphics) byGfx.set(gfx, key.split('@')[0]);
    for (const obj of this.children.list.slice(from)) {
      if (obj.type === 'Zone') continue;
      let id = byGfx.get(obj);
      if (!id) {
        const o = obj as unknown as { x: number; y: number; width?: number; height?: number; originX?: number };
        const cx = o.x + (o.originX === 0 ? (o.width ?? 0) / 2 : 0);
        id = this.floorOf(cx, o.y)?.id ?? 'all';
      }
      if (id === 'all') continue;
      const list = this.floorStatic.get(id) ?? [];
      list.push(obj);
      this.floorStatic.set(id, list);
    }
  }

  /** Shows only the static scenery of `floorId`. */
  private showFloor(floorId: string): void {
    for (const [id, list] of this.floorStatic) {
      for (const obj of list) {
        if (!obj.scene) continue; // destroyed (an opened door, a lifted fog)
        (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(id === floorId);
      }
    }
  }

  private drawFloors(): void {
    const signed = new Set<string>();
    // Staircases: painted steps on the floor
    for (const s of this.room.stairs ?? []) {
      for (const z of [s.a.zone, s.b.zone]) {
        const floor = this.floorArt(z.x + z.w / 2, z.y + z.h / 2, 0.5);
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
      if (r.tint !== undefined) this.floorArt(r.x + r.w / 2, r.y + r.h / 2, 0.5).fillStyle(r.tint, 0.16).fillRect(r.x, r.y, r.w, r.h);
      if (this.unlocked.has(r.id) || r.secret) continue;
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
  /** A small sign over a trap or machine. */
  private trapLabel(o: Obstacle, text: string): void {
    this.add.text(o.x + o.w / 2, o.y - 6, text, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#0d2b2ecc', padding: { x: 6, y: 2 },
    }).setOrigin(0.5, 1).setDepth(6);
  }

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
        this.add.text(o.x + o.w / 2, o.y - 6, `🧴 ${o.label ?? ''} $${this.restockCost}`, {
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
        if (o.label) this.trapLabel(o, o.label);
        break;
      case 'magTable':
        // A low table and a fan of very old magazines
        g.fillStyle(0x8d6e63).fillRoundedRect(o.x, o.y, o.w, o.h, 6);
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 6);
        for (const [dx, c] of [[0.12, 0xef9a9a], [0.38, 0xfff59d], [0.62, 0x90caf9]] as [number, number][]) {
          g.fillStyle(c).fillRect(o.x + o.w * dx, o.y + 8, o.w * 0.24, o.h - 16);
          g.lineStyle(1.5, outline).strokeRect(o.x + o.w * dx, o.y + 8, o.w * 0.24, o.h - 16);
        }
        break;
      case 'microwave':
        g.fillStyle(0xeceff1).fillRoundedRect(o.x, o.y, o.w, o.h, 4);
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 4);
        g.fillStyle(0x37474f).fillRect(o.x + 6, o.y + 6, o.w * 0.6, o.h - 12); // the window
        g.fillStyle(0x90a4ae).fillRect(o.x + o.w * 0.75, o.y + 6, o.w * 0.18, o.h - 12); // buttons
        break;
      case 'recordsDoor':
        g.fillStyle(0x6d4c41).fillRect(o.x, o.y, o.w, o.h);
        g.lineStyle(3, 0xffd166).strokeRect(o.x + 3, o.y + 3, o.w - 6, o.h - 6);
        this.trapLabel(o, o.label ?? '');
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
      case 'handDryer': {
        // A steel jet dryer on the wall, with its slot and a little blue light
        g.fillStyle(0xb0bec5).fillRoundedRect(o.x, o.y, o.w, o.h, 6);
        g.fillStyle(0x37474f).fillRect(o.x + o.w * 0.2, o.y + o.h * 0.4, o.w * 0.6, o.h * 0.2);
        g.fillStyle(0x4fc3f7).fillCircle(o.x + o.w * 0.8, o.y + o.h * 0.2 + 3, 3);
        g.lineStyle(2, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 6);
        this.trapLabel(o, '💨 DRYER');
        break;
      }
      case 'autoclave': {
        // A steel box with a round pressure door and a gauge
        g.fillStyle(0x90a4ae).fillRoundedRect(o.x, o.y, o.w, o.h, 8);
        g.fillStyle(0xcfd8dc).fillCircle(o.x + o.w / 2, o.y + o.h / 2 + 4, Math.min(o.w, o.h) * 0.34);
        g.lineStyle(4, 0x546e7a).strokeCircle(o.x + o.w / 2, o.y + o.h / 2 + 4, Math.min(o.w, o.h) * 0.34);
        g.fillStyle(0xffffff).fillCircle(o.x + o.w - 12, o.y + 10, 6);
        g.lineStyle(2, 0xd32f2f).lineBetween(o.x + o.w - 12, o.y + 10, o.x + o.w - 8, o.y + 6);
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 8);
        this.trapLabel(o, `♨️ AUTOCLAVE $${BALANCE.traps.autoclave.cost}`);
        break;
      }
      case 'xrayControls':
        g.fillStyle(0x8d6e63).fillRect(o.x, o.y, o.w, o.h);
        g.fillStyle(0xd7ccc8).fillRect(o.x + 5, o.y + 5, o.w - 10, o.h - 10);
        g.fillStyle(0x263238).fillRect(o.x + 12, o.y + 8, o.w * 0.45, o.h - 18); // the screen
        g.fillStyle(0xb2ff59).fillRect(o.x + 16, o.y + 12, o.w * 0.45 - 8, 4);
        g.fillStyle(0xd32f2f).fillCircle(o.x + o.w - 18, o.y + o.h / 2, 7); // the big button
        g.lineStyle(3, outline).strokeRect(o.x, o.y, o.w, o.h);
        this.trapLabel(o, `☢️ X-RAY $${BALANCE.traps.xray.cost}`);
        break;
      case 'vending': {
        // A tall snack machine: glass front with rows of colourful snacks, a coin slot
        g.fillStyle(0xc62828).fillRoundedRect(o.x, o.y, o.w, o.h, 6);
        g.fillStyle(0x263238).fillRect(o.x + 6, o.y + 6, o.w - 12, o.h * 0.68);
        const colors = [0xffeb3b, 0x76ff03, 0xff9800, 0x80cbc4, 0xa1887f];
        const rows = 4;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < 3; c++) {
            g.fillStyle(colors[(r * 3 + c) % colors.length]).fillRect(o.x + 10 + c * ((o.w - 20) / 3), o.y + 12 + r * ((o.h * 0.68 - 12) / rows), (o.w - 26) / 3, 8);
          }
        }
        g.fillStyle(0x111111).fillRect(o.x + 8, o.y + o.h * 0.8, o.w - 16, 8);
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 6);
        this.trapLabel(o, '🥤 SNACKS');
        break;
      }
      case 'compounder': {
        // A pharmacy compounding hood: glass front, mortar and pestle, a row of amber bottles
        g.fillStyle(0x5e35b1).fillRoundedRect(o.x, o.y, o.w, o.h, 8);
        g.fillStyle(0xd1c4e9, 0.85).fillRect(o.x + 8, o.y + 8, o.w - 16, o.h * 0.45);
        for (let i = 0; i < 4; i++) g.fillStyle(0xffa000).fillRect(o.x + 14 + i * ((o.w - 28) / 4), o.y + 14, 10, 18);
        g.fillStyle(0xeeeeee).fillCircle(o.x + o.w / 2, o.y + o.h * 0.75, 12);
        g.lineStyle(4, 0x8d6e63).lineBetween(o.x + o.w / 2, o.y + o.h * 0.75, o.x + o.w / 2 + 18, o.y + o.h * 0.58);
        g.lineStyle(3, outline).strokeRoundedRect(o.x, o.y, o.w, o.h, 8);
        this.add.text(o.x + o.w / 2, o.y - 6, '⚗️ UPGRADES', {
          fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
          backgroundColor: '#0d2b2ecc', padding: { x: 6, y: 2 },
        }).setOrigin(0.5, 1).setDepth(6);
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
