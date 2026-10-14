import Phaser from 'phaser';

type GameClock = Phaser.Time.Clock & { gameNow?: number; tick?: (time: number, delta: number) => void };

/**
 * Makes `scene.time.now` count only time the scene actually ran.
 *
 * Phaser's scene clock follows the real clock, so after a pause `time.now`
 * jumps ahead by however long the game sat paused, and every cooldown, refill,
 * intermission and boss timer (all stored as `time.now + ms`) would finish
 * "in the background". With this, paused time simply doesn't exist for the game.
 * Call at the top of the scene's create(); safe on every restart.
 */
export function useGameTime(scene: Phaser.Scene): void {
  const clock = scene.time as GameClock;
  const events = scene.sys.events;
  clock.gameNow = clock.now;
  if (!clock.tick) {
    const original = Phaser.Time.Clock.prototype.update;
    clock.tick = (_time: number, delta: number) => {
      clock.gameNow = (clock.gameNow ?? 0) + delta;
      original.call(clock, clock.gameNow, delta);
    };
  }
  // Swap whatever the clock registered on start for the game-time version
  events.off(Phaser.Scenes.Events.UPDATE, clock.update, clock);
  events.off(Phaser.Scenes.Events.UPDATE, clock.tick, clock);
  clock.update = clock.tick;
  events.on(Phaser.Scenes.Events.UPDATE, clock.tick, clock);
}
