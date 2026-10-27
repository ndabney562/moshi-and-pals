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
  /** Spraying this frame (right stick pushed, or mouse held on desktop). */
  firing: boolean;
  /** Set by the Refill button or R key; the game clears it once handled. */
  refillRequested: boolean;
  /** Set by the PURGE button or Q key. */
  purgeRequested: boolean;
  secondRequested: boolean;
  /** Set by the USE button or E key (shown at supply carts and locked doors). */
  interactRequested: boolean;
  /** Set by the SWAP button or X key (switch between the bottle and a crate tool). */
  swapRequested: boolean;
  /** Desktop testing: last mouse position on screen, when a mouse is in use. */
  mouseX: number;
  mouseY: number;
  mouseActive: boolean;
}

const idleInput = (): InputState => ({
  moveX: 0, moveY: 0,
  aimX: 1, aimY: 0, aiming: false,
  firing: false, refillRequested: false, purgeRequested: false, secondRequested: false, interactRequested: false, swapRequested: false,
  mouseX: 0, mouseY: 0, mouseActive: false,
});

export const inputState: InputState = idleInput();

export function resetInputState(): void { Object.assign(inputState, idleInput()); }
