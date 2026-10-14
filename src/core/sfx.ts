import Phaser from 'phaser';
import { settings } from './settings';

/**
 * Placeholder sound effects synthesized on the fly, so the game has feedback
 * before real recordings exist. Each function is a named slot: when Noah's
 * recordings arrive, the slot plays the file instead (see docs/ASSETS.md).
 */
type Voice = (ctx: AudioContext, out: AudioNode, t: number) => void;

const VOLUME = 0.5;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
const lastPlayed: Record<string, number> = {};
/** Pitch multiplier for the sound being played right now (randomized a little each time so repeats don't drone). */
let pitch = 1;

/** Hook into Phaser's audio context. Call once after the first tap. */
export function initSfx(scene: Phaser.Scene): void {
  const manager = scene.sound as Phaser.Sound.WebAudioSoundManager;
  if (!manager.context || ctx) return;
  ctx = manager.context;
  master = ctx.createGain();
  master.gain.value = settings.sound ? VOLUME : 0;
  // Gentle limiter so a room full of pops doesn't clip
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 10;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  master.connect(limiter).connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

export function setSfxMuted(muted: boolean): void {
  if (master) master.gain.value = muted ? 0 : VOLUME;
}

/**
 * iOS suspends (or "interrupts") audio after a phone call, Siri, or switching
 * apps, and it stays silent until resumed from a touch. Call this from touch
 * handlers; it does nothing when audio is already running.
 */
export function resumeAudio(): void {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

/**
 * Plays a voice unless the same one played within `minGapMs` (avoids audio pile-ups).
 * Each play is detuned up to ±8% so repeated sounds stay lively; `pitchMul` shifts it further (streaks).
 */
function play(name: string, minGapMs: number, voice: Voice, pitchMul = 1): void {
  if (!ctx || !master || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? 0) < minGapMs) return;
  lastPlayed[name] = now;
  pitch = pitchMul * (0.92 + Math.random() * 0.16);
  voice(ctx, master, ctx.currentTime);
  pitch = 1;
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
  osc.frequency.setValueAtTime(from * pitch, t);
  osc.frequency.exponentialRampToValueAtTime(to * pitch, t + dur);
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
  /** Germ disinfected: squelchy pop. Climbs 2 semitones every 5 kills of a streak (up to an octave). */
  pop: (streak = 0) => play('pop', 30, (c, o, t) => {
    tone(c, o, t, 0.16, 520, 90, 0.35);
    noiseBurst(c, o, t, 0.12, 900, 0.25, 'lowpass');
  }, Math.pow(2, (Math.min(streak, 30) / 5) * (2 / 12))),
  /** Special round: a two-tone clinic alarm */
  specialRound: () => play('specialRound', 1500, (c, o, t) => {
    for (let i = 0; i < 4; i++) tone(c, o, t + i * 0.18, 0.16, i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.16, 'square');
  }),
  /** Spray bouncing off a Spore Pod's armor */
  tink: () => play('tink', 120, (c, o, t) => {
    tone(c, o, t, 0.06, 2400, 2200, 0.1, 'square');
    tone(c, o, t + 0.03, 0.08, 3100, 2900, 0.06, 'triangle');
  }),
  /** Spore Pod flipped onto its back */
  flip: () => play('flip', 200, (c, o, t) => tone(c, o, t, 0.25, 300, 900, 0.18, 'triangle')),
  /** Sneezer wind-up: a rising, wheezy "ah... AH..." */
  sneezeWindup: () => play('sneezeWindup', 300, (c, o, t) => {
    tone(c, o, t, 0.3, 300, 420, 0.12, 'sawtooth');
    tone(c, o, t + 0.35, 0.3, 360, 560, 0.14, 'sawtooth');
  }),
  /** The sneeze: CHOO! */
  sneeze: () => play('sneeze', 120, (c, o, t) => {
    noiseBurst(c, o, t, 0.25, 1800, 0.45, 'bandpass');
    tone(c, o, t, 0.12, 700, 200, 0.2, 'sawtooth');
  }),
  /** Glob lands: wet splat */
  splat: () => play('splat', 100, (c, o, t) => noiseBurst(c, o, t, 0.15, 500, 0.3, 'lowpass')),
  /** STAT! critical hit: a bright little tick */
  crit: () => play('crit', 80, (c, o, t) => tone(c, o, t, 0.07, 1800, 1400, 0.12, 'square')),
  /** Spotless round: sparkly arpeggio */
  spotless: () => play('spotless', 1000, (c, o, t) => {
    [880, 1109, 1319, 1760].forEach((f, i) => tone(c, o, t + i * 0.07, 0.2, f, f, 0.12, 'triangle'));
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
  /** Diamond grumbles: a low, irritated "hmph" */
  grumble: () => play('grumble', 600, (c, o, t) => {
    tone(c, o, t, 0.12, 240, 200, 0.16, 'sawtooth');
    tone(c, o, t + 0.14, 0.28, 210, 140, 0.18, 'sawtooth');
  }),
  /** Policy Tantrum: clipboard slam and a shout */
  tantrum: () => play('tantrum', 800, (c, o, t) => {
    noiseBurst(c, o, t, 0.18, 400, 0.45, 'lowpass');
    tone(c, o, t, 0.2, 120, 50, 0.4);
    tone(c, o, t + 0.12, 0.4, 330, 260, 0.18, 'sawtooth');
  }),
  /** Red tape pulled tight or ripped */
  tapeRip: () => play('tape', 200, (c, o, t) => {
    tone(c, o, t, 0.12, 300, 1200, 0.18, 'square');
    noiseBurst(c, o, t, 0.06, 2500, 0.2, 'highpass');
  }),
  /** SINUS PURGE placeholder: a long, wet HRRRNNNKKK (Noah's real recording replaces this) */
  purge: () => play('purge', 500, (c, o, t) => {
    for (let i = 0; i < 6; i++) tone(c, o, t + i * 0.07, 0.12, 95 + (i % 2) * 25, 80, 0.35, 'sawtooth');
    noiseBurst(c, o, t, 0.5, 700, 0.35, 'bandpass');
    tone(c, o, t + 0.42, 0.35, 160, 60, 0.4, 'square');
  }),
  /** Copays spent: ka-ching */
  cash: () => play('cash', 150, (c, o, t) => {
    tone(c, o, t, 0.08, 1500, 1500, 0.15, 'square');
    tone(c, o, t + 0.08, 0.3, 2000, 2000, 0.15, 'triangle');
  }),
  /** Disinfectant Wipes: a quick swish (a lower, longer one for a DEEP CLEAN) */
  swipe: (big = false) => play('swipe', 60, (c, o, t) => noiseBurst(c, o, t, big ? 0.18 : 0.1, big ? 1400 : 2400, 0.3, 'bandpass')),
  /** Gel Launcher: a hollow thunk, then a wet splat when it lands (sfx.splat) */
  lob: () => play('lob', 120, (c, o, t) => tone(c, o, t, 0.12, 260, 120, 0.35, 'triangle')),
  /** Defib Paddles: a charge whine and a crackling ZAP */
  zap: () => play('zap', 120, (c, o, t) => {
    tone(c, o, t, 0.08, 600, 2400, 0.12, 'sawtooth');
    noiseBurst(c, o, t + 0.08, 0.12, 4500, 0.3, 'highpass');
  }),
  /** CLAIM DENIED: a sad rubber stamp */
  stamp: () => play('stamp', 300, (c, o, t) => {
    noiseBurst(c, o, t, 0.08, 300, 0.45, 'lowpass');
    tone(c, o, t + 0.1, 0.4, 220, 110, 0.25, 'square');
  }),
  /** Can't afford it / nothing to pour */
  denied: () => play('denied', 300, (c, o, t) => {
    tone(c, o, t, 0.12, 200, 200, 0.2, 'square');
    tone(c, o, t + 0.14, 0.18, 150, 150, 0.2, 'square');
  }),
};
