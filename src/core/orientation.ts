import Phaser from 'phaser';
import { viewportSize } from './viewport';

/**
 * Keeps the game in landscape no matter how the phone is held. Safari can't
 * lock orientation, so when a touch screen is taller than it is wide we turn
 * the game's container 90° with CSS and translate touches to match.
 */

/** A phone (touch screen) currently taller than it is wide. */
export function isPortrait(): boolean {
  const { width, height } = viewportSize();
  return window.matchMedia('(pointer: coarse)').matches && height > width;
}

/** Sizes and rotates #game for the current orientation. */
export function applyOrientation(): void {
  const el = document.getElementById('game');
  if (!el) return;
  const portrait = isPortrait();
  const { width, height } = viewportSize();
  document.body.classList.toggle('portrait', portrait);
  // Explicit pixels also avoid stale 100dvh dimensions during WKWebView rotation.
  el.style.width = `${portrait ? height : width}px`;
  el.style.height = `${portrait ? width : height}px`;
  el.style.left = portrait ? `${width}px` : '';
}

/**
 * Phaser measures with getBoundingClientRect, which reports the rotated box.
 * While turned, measure the unrotated container instead and map touches from
 * screen space back into the game's sideways frame.
 */
export function patchForPortrait(game: Phaser.Game): void {
  const scale = game.scale as Phaser.Scale.ScaleManager & {
    getParentBounds(): boolean;
    updateCenter(): void;
    parentSize: Phaser.Structs.Size;
  };
  const originalBounds = scale.getParentBounds.bind(scale);
  scale.getParentBounds = () => {
    if (!isPortrait() || !scale.parent) return originalBounds();
    const w = scale.parent.clientWidth;
    const h = scale.parent.clientHeight;
    if (scale.parentSize.width === w && scale.parentSize.height === h) return false;
    scale.parentSize.setSize(w, h);
    return true;
  };

  const originalCenter = scale.updateCenter.bind(scale);
  scale.updateCenter = () => {
    if (!isPortrait()) return originalCenter();
    const { style, offsetWidth, offsetHeight } = game.canvas;
    style.marginLeft = `${Math.floor((scale.parentSize.width - offsetWidth) / 2)}px`;
    style.marginTop = `${Math.floor((scale.parentSize.height - offsetHeight) / 2)}px`;
  };

  const input = game.input as Phaser.Input.InputManager & {
    transformPointer(pointer: Phaser.Input.Pointer, pageX: number, pageY: number, wasMove: boolean): void;
  };
  const originalTransform = input.transformPointer.bind(input);
  input.transformPointer = (pointer, pageX, pageY, wasMove) => {
    if (!isPortrait()) return originalTransform(pointer, pageX, pageY, wasMove);
    // Turned 90° clockwise: the game's x runs down the screen, its y runs right to left
    const rect = game.canvas.getBoundingClientRect();
    const k = scale.width / game.canvas.offsetWidth; // game pixels per CSS pixel (unrotated)
    pointer.prevPosition.copy(pointer.position);
    pointer.position.set((pageY - window.scrollY - rect.top) * k, (rect.right - (pageX - window.scrollX)) * k);
  };
}

/** Safe-area insets (notch, home bar) as the turned game sees them. */
export function rotateInsets<T extends { top: number; right: number; bottom: number; left: number }>(css: T): T {
  if (!isPortrait()) return css;
  return { ...css, left: css.top, top: css.right, right: css.bottom, bottom: css.left };
}
