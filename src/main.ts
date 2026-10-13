import Phaser from 'phaser';
import { DISPLAY } from './config/display';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { TitleScene } from './scenes/TitleScene';

/** Logical width that matches the screen's shape at our fixed logical height. */
function logicalWidth(): number {
  const aspect = Phaser.Math.Clamp(window.innerWidth / window.innerHeight, DISPLAY.minAspect, DISPLAY.maxAspect);
  return Math.round(DISPLAY.logicalHeight * aspect);
}

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
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { activePointers: 3 },
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [BootScene, TitleScene, GameScene, HudScene, GameOverScene],
});

// Keep the game's shape matched to the screen when the phone rotates
// or Safari's toolbars appear/disappear.
const resize = () => game.scale.setGameSize(logicalWidth(), DISPLAY.logicalHeight);
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 300));

// Stop iOS pinch-zoom and double-tap gestures from hijacking the game.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Handy for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
