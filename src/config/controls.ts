/** Touch control tuning. All sizes are in logical game pixels (see display.ts). */
export const CONTROLS = {
  /**
   * 'sprayButton': left stick moves, hold SPRAY to spray, Eugene auto-aims at the nearest germ.
   * 'twinStick': right stick aims and sprays (original Milestone 2 scheme).
   */
  scheme: 'sprayButton' as 'sprayButton' | 'twinStick',
  /** Auto-aim locks onto germs within this distance (sprayButton scheme). */
  autoAimRange: 240,
  joystick: {
    /** How far the thumb can travel from the joystick's center. */
    radius: 80,
    /** Fraction of the radius ignored around the center, so resting thumbs don't drift. */
    deadZone: 0.15,
    /** Where a joystick rests (shown faintly) before you touch, as fraction of screen. */
    restLeft: { x: 0.14, y: 0.74 },
    restRight: { x: 0.86, y: 0.74 },
    baseAlpha: 0.35,
    thumbAlpha: 0.8,
  },
  buttons: {
    refillRadius: 44,
    sprayRadius: 70,
    purgeRadius: 50,
    interactRadius: 46,
    swapRadius: 40,
    /** Top-right corner, far from both thumbs. */
    pauseRadius: 34,
  },
  /** SPRAY-button scheme: any touch on the right half below this fraction of the screen height sprays (not just the button). */
  sprayZoneTop: 0.22,
  /** ...and dragging that touch this far (logical px) aims by hand until it lifts. */
  dragAimDistance: 28,
  /** Hold USE this long to confirm purchases from `holdToBuyFrom` Copays up, or any that replace a tool. */
  holdToBuyMs: 350,
  /** Auto-aim keeps its current target unless another visible germ is this much closer (0.75 = 25% closer). */
  aimStickiness: 0.75,
  /** The right stick counts as "aiming" only past this fraction of its radius. */
  aimThreshold: 0.3,
  /** Extra space kept clear of the iPhone notch/home bar, on top of the safe area. */
  hudMargin: 16,
};
