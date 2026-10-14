/**
 * Testing switches read from the page address, so a build can be stress-tested
 * on a real iPhone without code changes. Nothing here is active in normal play.
 *
 *   ?debug            perf overlay (frame time, entity counts)
 *   ?round=12         start at round 12
 *   ?copays=2000      start with Copays
 *   ?god              Eugene can't be hurt
 *   ?fps=30           cap the frame rate (simulates iPhone Low Power Mode)
 *
 * Combine them: .../moshi-and-pals/?round=15&god&debug
 */
const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);

const num = (key: string): number | undefined => {
  const raw = params.get(key);
  if (raw === null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

const startRound = num('round');
const copays = num('copays');
const fpsLimit = num('fps');
const god = params.has('god');

export const DEBUG = {
  /** Show the perf overlay. On whenever any debug switch is used, so testers always see they're in a test build. */
  overlay: params.has('debug') || startRound !== undefined || copays !== undefined || fpsLimit !== undefined || god,
  /** First round to play (1 = normal). */
  startRound: startRound !== undefined ? Math.max(1, Math.floor(startRound)) : 1,
  copays: copays !== undefined ? Math.max(0, Math.floor(copays)) : 0,
  god,
  fpsLimit: fpsLimit !== undefined && fpsLimit >= 10 ? Math.floor(fpsLimit) : undefined,
};
