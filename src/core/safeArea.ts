import { DISPLAY } from '../config/display';

export interface Insets { top: number; right: number; bottom: number; left: number; }

/**
 * Reads the iPhone safe-area insets (notch, Dynamic Island, home bar) from a
 * hidden CSS probe in index.html and converts them to logical game pixels.
 */
export function readSafeArea(): Insets {
  const probe = document.getElementById('safe-area-probe');
  if (!probe) return { top: 0, right: 0, bottom: 0, left: 0 };
  const style = getComputedStyle(probe);
  const toGame = DISPLAY.logicalHeight / window.innerHeight;
  const px = (v: string) => (parseFloat(v) || 0) * toGame;
  return {
    top: px(style.paddingTop),
    right: px(style.paddingRight),
    bottom: px(style.paddingBottom),
    left: px(style.paddingLeft),
  };
}
