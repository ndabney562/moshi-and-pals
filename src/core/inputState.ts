/**
 * What the player is asking Eugene to do this frame, independent of whether
 * it came from touch joysticks or keyboard/mouse. The HUD writes it; the
 * game reads it.
 */
export interface InputState {
  /** Movement direction, length 0..1 (analog). */
  moveX: number;
  moveY: number;
  /** Aim direction (unit vector) and whether the player is actively aiming. */
  aimX: number;
  aimY: number;
  aiming: boolean;
  /** Desktop testing: last mouse position on screen, when a mouse is in use. */
  mouseX: number;
  mouseY: number;
  mouseActive: boolean;
}

export const inputState: InputState = {
  moveX: 0, moveY: 0,
  aimX: 1, aimY: 0, aiming: false,
  mouseX: 0, mouseY: 0, mouseActive: false,
};
