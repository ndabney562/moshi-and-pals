import Phaser from 'phaser';

/**
 * Placeholder sound effects synthesized on the fly, so the game has feedback
 * before real recordings exist. Each function is a named slot: when Noah's
 * recordings arrive, the slot plays the file instead (see docs/ASSETS.md).
 */
type Voice = (ctx: AudioContext, out: AudioNode, t: number) => void;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
const lastPlayed: Record<string, number> = {};

/** Hook into Phaser's audio context. Call once after the first tap. */
export function initSfx(scene: Phaser.Scene): void {
  const manager = scene.sound as Phaser.Sound.WebAudioSoundManager;
  if (!manager.context || ctx) return;
  ctx = manager.context;
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

export function setSfxMuted(muted: boolean): void {
  if (master) master.gain.value = muted ? 0 : 0.5;
}

/** Plays a voice unless the same one played within `minGapMs` (avoids audio pile-ups). */
function play(name: string, minGapMs: number, voice: Voice): void {
  if (!ctx || !master || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? 0) < minGapMs) return;
  lastPlayed[name] = now;
  voice(ctx, master, ctx.currentTime);
}

function noiseBurst(c: AudioContext, out: AudioNode, t: number, dur: number, freq: number, gain: number, type: BiquadFilterType): void {
  const src = c.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const env = c.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(env).connect(out);
  src.start(t, Math.random() * 0.5, dur);
}

function tone(c: AudioContext, out: AudioNode, t: number, dur: number, from: number, to: number, gain: number, type: OscillatorType = 'sine'): void {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = c.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  /** pssht */
  spray: () => play('spray', 70, (c, o, t) => noiseBurst(c, o, t, 0.07, 3500, 0.25, 'highpass')),
  /** Droplet hits a germ: tiny wet tick */
  hit: () => play('hit', 40, (c, o, t) => tone(c, o, t, 0.05, 900, 500, 0.12, 'triangle')),
  /** Germ disinfected: squelchy pop */
  pop: () => play('pop', 30, (c, o, t) => {
    tone(c, o, t, 0.16, 520, 90, 0.35);
    noiseBurst(c, o, t, 0.12, 900, 0.25, 'lowpass');
  }),
  /** Trigger pulled with an empty bottle */
  empty: () => play('empty', 300, (c, o, t) => tone(c, o, t, 0.08, 180, 160, 0.2, 'square')),
  /** Bottle refilled: glug-glug-ding */
  refill: () => play('refill', 200, (c, o, t) => {
    tone(c, o, t, 0.09, 220, 330, 0.2);
    tone(c, o, t + 0.1, 0.09, 260, 390, 0.2);
    tone(c, o, t + 0.22, 0.25, 1320, 1300, 0.12, 'triangle');
  }),
  /** Eugene takes damage: an indignant "oof" */
  hurt: () => play('hurt', 150, (c, o, t) => {
    tone(c, o, t, 0.18, 260, 110, 0.35, 'sawtooth');
    noiseBurst(c, o, t, 0.1, 600, 0.2, 'lowpass');
  }),
  /** New round: rising three-note sting */
  roundStart: () => play('roundStart', 500, (c, o, t) => {
    [330, 440, 660].forEach((f, i) => tone(c, o, t + i * 0.12, 0.22, f, f, 0.18, 'square'));
  }),
  /** Round cleared: bright ding-ding */
  roundEnd: () => play('roundEnd', 500, (c, o, t) => {
    tone(c, o, t, 0.25, 880, 880, 0.15, 'triangle');
    tone(c, o, t + 0.15, 0.4, 1320, 1320, 0.15, 'triangle');
  }),
  /** Boss enters: low ominous growl */
  bossArrives: () => play('boss', 1000, (c, o, t) => {
    tone(c, o, t, 1.2, 70, 45, 0.45, 'sawtooth');
    noiseBurst(c, o, t, 0.9, 300, 0.25, 'lowpass');
  }),
  /** Eugene goes down: sad trombone-ish slide */
  gameOver: () => play('gameOver', 1000, (c, o, t) => {
    [392, 370, 349].forEach((f, i) => tone(c, o, t + i * 0.32, 0.3, f, f * 0.98, 0.22, 'triangle'));
    tone(c, o, t + 0.96, 0.9, 330, 220, 0.25, 'triangle');
  }),
  /** Germ bumps into Eugene (no damage) */
  bump: () => play('bump', 150, (c, o, t) => tone(c, o, t, 0.12, 140, 70, 0.3, 'sawtooth')),
  /** Babushka complains: a wobbly, descending "oyyy" */
  whine: () => play('whine', 600, (c, o, t) => {
    tone(c, o, t, 0.22, 620, 560, 0.12, 'triangle');
    tone(c, o, t + 0.2, 0.45, 600, 340, 0.14, 'triangle');
  }),
  /** Guilt Trip: a long wavering wail */
  wail: () => play('wail', 800, (c, o, t) => {
    for (let i = 0; i < 5; i++) tone(c, o, t + i * 0.13, 0.16, 760 - i * 40, 680 - i * 50, 0.16, 'sawtooth');
    noiseBurst(c, o, t, 0.5, 1200, 0.12, 'bandpass');
  }),
  /** Yarn pulled tight or snapped */
  yarnSnap: () => play('yarn', 200, (c, o, t) => {
    tone(c, o, t, 0.12, 300, 1200, 0.18, 'square');
    noiseBurst(c, o, t, 0.06, 2500, 0.2, 'highpass');
  }),
};
