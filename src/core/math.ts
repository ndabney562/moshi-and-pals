/**
 * Frame-rate independent easing. `k` is how much to move toward the target per
 * frame at 60 FPS (the values the game was tuned with); this returns the
 * equivalent for a frame that took `dtMs`, so 30 FPS (iPhone Low Power Mode)
 * and 120 FPS behave the same as 60.
 */
export function damp(k: number, dtMs: number): number {
  return 1 - Math.pow(1 - k, dtMs / (1000 / 60));
}
