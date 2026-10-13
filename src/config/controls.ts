/** Touch control tuning. All sizes are in logical game pixels (see display.ts). */
export const CONTROLS = {
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
    refillRadius: 46,
  },
  /** The right stick counts as "aiming" only past this fraction of its radius. */
  aimThreshold: 0.3,
  /** Extra space kept clear of the iPhone notch/home bar, on top of the safe area. */
  hudMargin: 16,
};
