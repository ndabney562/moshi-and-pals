/**
 * Adaptive music tuning (core/music.ts). The songs themselves live in data/music.ts.
 */
export const MUSIC = {
  /** Overall music volume, under the sound effects. */
  volume: 0.32,
  /** How far ahead notes are scheduled, and how often the scheduler wakes. */
  lookaheadSec: 0.15,
  tickMs: 25,
  /** Layer fades follow the action this smoothly (seconds to get ~63% of the way). */
  layerFadeSec: 0.8,
  /** The pause menu turns the music down to this fraction of its volume. */
  pausedDuck: 0.3,
  /** Eugene goes down: the music fades out over this long. */
  stopFadeSec: 1.2,
  /** How the pressure layer (drums, arpeggio) follows the round. */
  pressure: {
    /** Always at least this loud while a round is on, so a round never sounds like the break. */
    roundFloor: 0.35,
    /** Germs alive as a share of the round's cap: the layer starts climbing at `crowdFrom` and is full at `crowdFull`. */
    crowdFrom: 0.2,
    crowdFull: 0.7,
    /** At or below BALANCE.player.lowHealth the layer goes full too. */
  },
};
