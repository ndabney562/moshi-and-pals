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
  },
  sandbox: {
    /** Milestone 2 only: how many germs to keep alive at once (waves replace this in M3). */
    germsAlive: 4,
    respawnDelayMs: 1200,
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
