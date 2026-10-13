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
  /** Germ bumps into Eugene */
  bump: () => play('bump', 150, (c, o, t) => tone(c, o, t, 0.12, 140, 70, 0.3, 'sawtooth')),
};
