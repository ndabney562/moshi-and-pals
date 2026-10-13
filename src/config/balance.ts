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
    /** How close Eugene must be to use the supply cart. */
    stationRange: 120,
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
