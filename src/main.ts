import Phaser from 'phaser';
import { ProvidersScene } from './scenes/ProvidersScene';
import { viewportSize } from './core/viewport';
import { DISPLAY } from './config/display';
import { DEBUG } from './core/debug';
import { installNativeBridge, NATIVE, NativeScene } from './core/native';
import { resumeAudio } from './core/sfx';
import { registerOffline, watchForUpdates } from './core/updates';
import { applyOrientation, isPortrait, patchForPortrait } from './core/orientation';
import { BoardScene } from './scenes/BoardScene';
import { LockerScene } from './scenes/LockerScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { TitleScene } from './scenes/TitleScene';

/** Logical width that matches the screen's shape at our fixed logical height. */
function logicalWidth(): number {
  const { width, height } = viewportSize();
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const aspect = Phaser.Math.Clamp((isPortrait() ? long / short : width / height), DISPLAY.minAspect, DISPLAY.maxAspect);
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
  scene: [BootScene, ProvidersScene, TitleScene, GameScene, HudScene, GameOverScene, BoardScene, LockerScene, LeaderboardScene, NativeScene],
});

patchForPortrait(game);

// Keep the game's shape matched to the screen when the phone rotates
// or Safari's toolbars appear/disappear.
let appliedWidth = 0;
let appliedHeight = 0;
const resize = () => {
  const size = viewportSize();
  appliedWidth = size.width;
  appliedHeight = size.height;
  applyOrientation();
  game.scale.setGameSize(logicalWidth(), DISPLAY.logicalHeight);
  game.scale.refresh();
};
let resizeFrame = 0;
const scheduleResize = () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(resize);
};
window.addEventListener('resize', scheduleResize);
window.visualViewport?.addEventListener('resize', scheduleResize);
// WKWebView can wake after native rotation without delivering a resize callback.
// Compare cheap viewport numbers before each frame; only relayout when they changed.
game.events.on(Phaser.Core.Events.PRE_STEP, () => {
  const size = viewportSize();
  if (size.width !== appliedWidth || size.height !== appliedHeight) resize();
});
// Phaser may have measured the page before the portrait patch was in place
resize();
window.addEventListener('orientationchange', () => setTimeout(resize, 300));

// iOS silences audio after calls, Siri or app switches; any touch brings it back.
document.addEventListener('touchend', resumeAudio, { passive: true });
document.addEventListener('pointerdown', resumeAudio, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resumeAudio();
});

// Stop iOS pinch-zoom and double-tap gestures from hijacking the game.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Works offline from the Home Screen, and notices when a newer build is live
// (the iPhone app ships its own copy of the game, so it needs neither)
if (NATIVE) installNativeBridge(game);
else {
  registerOffline();
  watchForUpdates();
}

// Handy for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
