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
    regenDelayMs: 4500,
    /** ...at this many HP per second. */
    regenPerSecond: 12,
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
};
