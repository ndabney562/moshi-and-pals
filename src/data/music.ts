/**
 * The soundtrack, written as step patterns that core/music.ts plays with
 * synthesized instruments. Each bar has 16 steps; a pattern may be any
 * multiple of 16 long and loops. Spaces and | are just for reading.
 *
 * Patterns:
 * - drums (kick, snare, hat, shaker, rim): x hit, X accent, g ghost, . rest
 * - pad: x plays the whole chord, - holds it
 * - bass, keys, arp, lead: 0-9 pick a note of the current chord, counting up
 *   (0 root, 1 next chord tone, ... wrapping up an octave), - holds, . rest
 *
 * Layers: `base` always plays; `pressure` fades in as the round gets busy.
 */
export type Instrument = 'pad' | 'bass' | 'keys' | 'arp' | 'lead' | 'kick' | 'snare' | 'hat' | 'shaker' | 'rim';
export type Layer = 'base' | 'pressure';

export interface TrackDef {
  layer: Layer;
  inst: Instrument;
  pattern: string;
  /** Octave of note 0 (melodic instruments only). */
  octave?: number;
  /** Volume multiplier. */
  gain?: number;
}

export interface SongDef {
  name: string;
  bpm: number;
  /** 0 = straight; up to ~0.2 lets every other 16th lag for a lazy swing. */
  swing: number;
  /** One chord per bar, looping: C, Fm7, Bbmaj7, A7, Gsus4, Bdim, Em7b5, F6... */
  chords: string[];
  tracks: TrackDef[];
}

export type SongId = 'clinic' | 'boss';

export const SONGS: Record<SongId, SongDef> = {
  /** Between rounds and in quiet moments: the waiting room's on-hold bossa nova. Drums kick in as the germs pile up. */
  clinic: {
    name: 'Please Continue to Hold',
    bpm: 108,
    swing: 0.08,
    chords: ['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Am7', 'Dm7', 'Gm7', 'C7'],
    tracks: [
      { layer: 'base', inst: 'pad', pattern: 'x---------------', octave: 4, gain: 0.8 },
      { layer: 'base', inst: 'bass', pattern: '0-....2-0-....2-', octave: 2 },
      { layer: 'base', inst: 'rim', pattern: 'x..x..x...x..x.. ..x..x...x..x...' },
      { layer: 'base', inst: 'shaker', pattern: 'x.g.x.g.x.g.x.g.' },
      {
        layer: 'base', inst: 'keys', octave: 5,
        pattern: '4-..3.2-....1.2. 3-..2.1-....0--- 2.3.4.5-..4.3... 2-..1.0.........',
      },
      { layer: 'pressure', inst: 'kick', pattern: 'x...x...x...x...' },
      { layer: 'pressure', inst: 'snare', pattern: '....x.......x..g' },
      { layer: 'pressure', inst: 'hat', pattern: 'gxgxgxgxgxgxgxgx' },
      { layer: 'pressure', inst: 'arp', pattern: '0.1.2.3.4.3.2.1.', octave: 4 },
    ],
  },
  /** Boss rounds: the fire-alarm theme, in D minor and twice as rude. */
  boss: {
    name: 'Code Brown',
    bpm: 140,
    swing: 0,
    chords: ['Dm', 'Dm', 'Bb', 'C', 'Gm', 'Gm', 'A7', 'A7'],
    tracks: [
      { layer: 'base', inst: 'kick', pattern: 'X...x...X...x.x.' },
      { layer: 'base', inst: 'bass', pattern: '0.0.0.0.0.0.0.1.', octave: 2, gain: 1.1 },
      { layer: 'base', inst: 'pad', pattern: 'x-------x-------', octave: 4, gain: 0.7 },
      { layer: 'base', inst: 'lead', pattern: '5.5.4.5.6---5.4. 3---4---5------- ................ ................', octave: 4 },
      { layer: 'pressure', inst: 'snare', pattern: '....X.......X.x.' },
      { layer: 'pressure', inst: 'hat', pattern: 'xgxgxgxgxgxgxgxg' },
      { layer: 'pressure', inst: 'arp', pattern: '0123432101234321', octave: 4, gain: 0.8 },
    ],
  },
};
