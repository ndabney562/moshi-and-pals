/**
 * Display settings. The game renders at a fixed logical height and a width
 * that matches the phone's aspect ratio, then scales to fill the screen.
 * 720 px tall is sharp on iPhones without making the GPU work too hard.
 */
export const DISPLAY = {
  logicalHeight: 720,
  /** Narrowest/widest aspect ratios we lay out for (iPad-ish to modern iPhone). */
  minAspect: 4 / 3,
  maxAspect: 2.4,
  backgroundColor: '#0d2b2e',
  showFps: true,
};
