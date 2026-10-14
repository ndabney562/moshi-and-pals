/**
 * Display settings. The game renders at a fixed logical height and a width
 * that matches the phone's aspect ratio, then scales to fill the screen.
 * 720 px tall is sharp on iPhones without making the GPU work too hard.
 */
export const DISPLAY = {
  logicalHeight: 720,
  /** Narrowest/widest aspect ratios we lay out for (iPad-ish to an iPhone in Safari with its toolbars showing). */
  minAspect: 4 / 3,
  maxAspect: 3.2,
  backgroundColor: '#0d2b2e',
  /** FPS counter and build label: only with ?debug (the build label is also in the pause menu). */
  showFps: false,
};
