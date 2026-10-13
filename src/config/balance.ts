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
  /** Babushka Bacillus, boss #1. Moves are in systems/BabushkaBrain.ts. */
  babushka: {
    /** Something whiny every this often while she waddles after Eugene. */
    chatterMs: [5500, 8500] as [number, number],
    speechMs: 2400,

    /** HOMESICK HAUL: she lassos Eugene with yarn and drags him to the EXIT door. */
    haulFirstMs: 5000,
    haulCooldownMs: 10000,
    haulRange: 320,
    haulWindupMs: 800,
    /** Eugene is dragged toward the door at this speed... */
    haulPullSpeed: 150,
    /** ...and can only walk at this fraction of his normal speed. */
    haulMoveScale: 0.35,
    /** Her own walking speed toward the door while hauling. */
    haulWalkSpeed: 110,
    /** Spray this much damage into her during the haul to snap the yarn. */
    haulBreakDamage: 80,
    haulMaxMs: 7000,
    /** Reaching the door: damage and a shove back into the room. */
    haulDoorDistance: 120,
    haulDoorDamage: 30,
    haulDoorShove: 650,

    /** LITTLE COUSINS: each time she loses this fraction of her health, she sobs out cousins. */
    cousinsEvery: 0.2,
    cousinsPerSob: 3,
    cousinsBurstSpeed: 260,

    /** GUILT TRIP: below this health fraction she wails, knocking Eugene back. */
    guiltBelow: 0.4,
    guiltCooldownMs: 7000,
    guiltWindupMs: 1000,
    guiltRadius: 280,
    guiltShove: 750,
    guiltShoveMs: 320,
    guiltDamage: 8,
  },
};
