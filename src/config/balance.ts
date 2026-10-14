/**
 * Gameplay tuning values. Change numbers here, not inside systems.
 * Speeds are in logical pixels per second.
 */
export const BALANCE = {
  player: {
    moveSpeed: 260,
    /** Radius of Eugene's collision circle. */
    bodyRadius: 22,
    /** How quickly Eugene turns toward his aim direction (0..1 per frame at 60fps). */
    turnSmoothing: 0.35,
    maxHp: 100,
    /** After a hit, Eugene can't be hurt again for this long. */
    invulnerableMs: 700,
    /** Health comes back on its own after this long without being hit... */
    regenDelayMs: 6000,
    /** ...at this many HP per second. */
    regenPerSecond: 6,
    /** Below this fraction of health the screen edges pulse red. */
    lowHealth: 0.3,
  },
  spawning: {
    /** Germs never spawn closer than this to Eugene. */
    minSpawnDistance: 380,
    /** ...and prefer spawn points within this distance, so germs in far-off rooms don't take forever to arrive. */
    maxSpawnDistance: 1600,
  },
  germs: {
    /** How often germ paths are recalculated around furniture. */
    pathRefreshMs: 250,
    /** Within this distance germs stop pathing and lunge straight at Eugene. */
    directChaseDistance: 90,
  },
  feedback: {
    /** How long a germ flashes white when hit. */
    hitFlashMs: 60,
    /** Camera kick on a kill. Kept small on purpose; phones get nauseous fast. */
    killShakeMs: 70,
    killShakeIntensity: 0.003,
    /** How long a hit germ stays squashed (its jelly "boing"). */
    squashMs: 110,
    /** Chance a droplet lands a STAT! critical hit, and its damage multiplier. */
    critChance: 0.1,
    critMult: 2,
  },
  /** SANITATION STREAK: kills in quick succession build a Copay multiplier. */
  streak: {
    /** Each kill keeps the streak alive this long. */
    windowMs: 2000,
    /** +this much Copay multiplier per `killsPerStep` kills... */
    multPerStep: 0.05,
    killsPerStep: 5,
    /** ...up to this. */
    maxMult: 1.5,
    /** Streaks this long get a shout-out when they end, and score this much per kill in them. */
    announceFrom: 10,
    scorePerKill: 5,
  },
  camera: {
    /** How quickly the camera catches up to Eugene (0..1, higher is snappier). */
    followLerp: 0.12,
  },
  /** Diamond the Practice Manager, boss #1. Moves are in systems/DiamondBrain.ts. */
  diamond: {
    /** Something grouchy every this often while she stomps after Eugene. */
    chatterMs: [5500, 8500] as [number, number],
    speechMs: 2400,

    /** MANDATORY MEETING: she ties Eugene up in red tape and drags him out the EXIT door. */
    meetingFirstMs: 5000,
    meetingCooldownMs: 10000,
    meetingRange: 320,
    meetingWindupMs: 800,
    /** Eugene is dragged toward the door at this speed... */
    meetingPullSpeed: 150,
    /** ...and can only walk at this fraction of his normal speed. */
    meetingMoveScale: 0.35,
    /** Her own walking speed toward the door during the meeting. */
    meetingWalkSpeed: 110,
    /** Spray this much damage into her during the meeting to rip the tape. */
    meetingBreakDamage: 80,
    meetingMaxMs: 7000,
    /** Reaching the door: damage and a shove back into the room. */
    meetingDoorDistance: 120,
    meetingDoorDamage: 30,
    meetingDoorShove: 650,

    /** WRITE-UPS: each time she loses this fraction of her health, she flings write-ups. */
    writeUpsEvery: 0.2,
    writeUpsPerBatch: 3,
    writeUpsThrowSpeed: 260,

    /** POLICY TANTRUM: below this health fraction she slams her clipboard, knocking Eugene back. */
    tantrumBelow: 0.4,
    tantrumCooldownMs: 7000,
    tantrumWindupMs: 1000,
    tantrumRadius: 280,
    tantrumShove: 750,
    tantrumShoveMs: 320,
    tantrumDamage: 8,
  },
  /** PATIENT ZERO, boss #2 (systems/PatientZeroBrain.ts). */
  patientZero: {
    firstCoughMs: 3500,
    coughEveryMs: [4200, 6000] as [number, number],
    coughWindupMs: 850,
    coughRange: 330,
    coughConeDeg: 55,
    coughDamage: 14,
    /** Viral Sprinters launched by each cough. */
    coughGerms: 3,
    sneezeBelow: 0.6,
    sneezeEveryMs: 9000,
    sneezeWindupMs: 1000,
    sneezeRange: 520,
    sneezeGlobs: 5,
    /** Spray hits that shame him into a mask, how long it stays on, and the damage he takes meanwhile. */
    complianceHits: 70,
    maskedMs: 8000,
    maskedDamageTaken: 2,
    leaveBelow: 0.25,
    leaveSpeed: 85,
    escapeDistance: 130,
  },
  /** Patients with health code violations (data/patients.ts). */
  patients: {
    /** First round they show up in. Boss rounds stay patient-free so Diamond gets the spotlight. */
    firstRound: 2,
    /** Most patients in the room at once, by round. */
    maxActive: (r: number) => Math.min(1 + Math.floor(r / 3), 3),
    spawnEveryMs: [9000, 16000] as [number, number],
    speed: 60,
    radius: 20,
    /** How long they wander before heading home. */
    stayMs: 30000,
    /** Time between violations (each one lets germs in). */
    violationEveryMs: [5000, 8500] as [number, number],
    /** Droplets it takes to shame a patient into cleaning up and leaving. */
    hitsToClean: 8,
    cleanPoints: 25,
    /** Eugene only grumbles about violations he can actually see. */
    grumbleRange: 650,
  },
  /** Copays (currency). Per-germ payouts live in data/germs.ts. */
  economy: {
    /** Cost to refill the jug at the supply cart. */
    restockCost: 40,
    /** Paid for spraying a health code violator into compliance. */
    cleanPatientCopays: 10,
    /** How close Eugene must be to a supply cart or locked door (from its edge) to use it. Door prices live in data/rooms.ts. */
    interactRange: 80,
    /** Price of a Supply Requisition at a crate (pick 1 of 2 tools). */
    crateCost: 250,
    /** Appealing the decision for a fresh pair: the first appeal, then this much more each time. */
    appealCost: 100,
    appealStep: 50,
    /** Chance a claim or an appeal is CLAIM DENIED, and the share of the money that comes back. */
    claimDeniedChance: 0.05,
    deniedRefund: 0.5,
    /** SPOTLESS: finish a round without getting hurt for this many Copays × the round number. */
    spotlessPerRound: 10,
    /** ...and this much score × the round number. */
    spotlessScorePerRound: 25,
    /** EXAM TABLE: lie down for a moment. Heals this much for this many Copays, once per table per round. */
    restCost: 40,
    restHeal: 50,
    /** Purchases this expensive need a press-and-hold on USE (CONTROLS.holdToBuyMs). */
    holdToBuyFrom: 100,
  },
  /** RESISTANT elites ("antibiotic-resistant" versions of normal germs). */
  elites: {
    firstRound: 8,
    /** Chance a spawning germ is an elite, by round. */
    chance: (r: number) => (r < 8 ? 0 : Math.min(0.05 + 0.01 * (r - 8), 0.14)),
    hpMult: 2.5,
    copaysMult: 3,
    pointsMult: 3,
    /** Shielded: a bubble that soaks this fraction of max health first. */
    shield: 0.5,
    hastySpeed: 1.35,
    /** Regenerating: heals this fraction of max health per second. */
    regenPerSec: 0.04,
    /** Splitting: bursts into this many basic germs. */
    splitInto: 2,
  },
  /** Power-up pickups. */
  powerups: {
    /** Chance any normal germ drops one (elites always do). */
    dropChance: 0.012,
    /** Seconds on the floor before it vanishes; it blinks for the last `blinkMs`. */
    lifeMs: 10000,
    blinkMs: 3000,
    pickupRadius: 46,
    statCleanRadius: 520,
    /** Stat Clean takes this much of a boss's max health instead of killing it. */
    statCleanBoss: 0.15,
    erWaitSlow: 0.3,
  },
  /** PERFECT POUR: tap REFILL again while the pour is in its sweet spot. */
  pour: {
    /** The sweet spot, as a fraction of the refill time. */
    windowStart: 0.45,
    windowEnd: 0.65,
    /** Nailing it: the bottle is full instantly and FRESH BOTTLE boosts damage this much for this long. */
    freshMult: 1.2,
    freshMs: 4000,
    /** Missing it: the pour takes this much longer (once per refill). */
    spillMs: 500,
  },
  /** SINUS PURGE: Eugene's signature honk. A shockwave that damages and blasts germs away. */
  purge: {
    cooldownMs: 18000,
    radius: 240,
    damage: 35,
    knockback: 750,
    /** Germs hit are stunned this long, so the blast buys breathing room. */
    stunMs: 600,
  },
};
