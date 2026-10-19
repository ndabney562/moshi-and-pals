import Phaser from 'phaser';
import { DISPLAY } from './config/display';
import { DEBUG } from './core/debug';
import { resumeAudio } from './core/sfx';
import { registerOffline, watchForUpdates } from './core/updates';
import { applyOrientation, isPortrait, patchForPortrait } from './core/orientation';
import { BoardScene } from './scenes/BoardScene';
import { LockerScene } from './scenes/LockerScene';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { TitleScene } from './scenes/TitleScene';

/** Logical width that matches the screen's shape at our fixed logical height. */
function logicalWidth(): number {
  const long = Math.max(window.innerWidth, window.innerHeight);
  const short = Math.min(window.innerWidth, window.innerHeight);
  const aspect = Phaser.Math.Clamp((isPortrait() ? long / short : window.innerWidth / window.innerHeight), DISPLAY.minAspect, DISPLAY.maxAspect);
  return Math.round(DISPLAY.logicalHeight * aspect);
}

// The game is always landscape. Safari can't lock orientation, so on a phone
// held upright (or with rotation lock on) we turn the whole game sideways.
applyOrientation();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: DISPLAY.backgroundColor,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: logicalWidth(),
    height: DISPLAY.logicalHeight,
  },
  // ?fps=30 caps the frame rate, like iPhone Low Power Mode does
  ...(DEBUG.fpsLimit ? { fps: { limit: DEBUG.fpsLimit } } : {}),
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { activePointers: 3 },
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [BootScene, TitleScene, GameScene, HudScene, GameOverScene, BoardScene, LockerScene],
});

patchForPortrait(game);

// Keep the game's shape matched to the screen when the phone rotates
// or Safari's toolbars appear/disappear.
const resize = () => {
  applyOrientation();
  game.scale.setGameSize(logicalWidth(), DISPLAY.logicalHeight);
  game.scale.refresh();
};
window.addEventListener('resize', resize);
// Phaser may have measured the page before the portrait patch was in place
resize();
window.addEventListener('orientationchange', () => setTimeout(resize, 300));

// iOS silences audio after calls, Siri or app switches; any touch brings it back.
document.addEventListener('touchend', resumeAudio, { passive: true });
document.addEventListener('pointerdown', resumeAudio, { passive: true });

// Stop iOS pinch-zoom and double-tap gestures from hijacking the game.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Works offline from the Home Screen, and notices when a newer build is live
registerOffline();
watchForUpdates();

// Handy for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
