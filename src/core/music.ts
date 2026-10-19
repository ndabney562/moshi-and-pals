import { MUSIC } from '../config/music';
import { SONGS, type Instrument, type Layer, type SongDef, type SongId } from '../data/music';
import { settings } from './settings';
import { audioContext } from './sfx';

/**
 * Adaptive music, synthesized live with Web Audio (no audio files). A small
 * look-ahead sequencer plays the step patterns in data/music.ts. Each song has
 * a `base` layer and a `pressure` layer; the game scene calls `setMusicMix`
 * every frame and the pressure layer fades with the action. Changing song
 * (clinic to boss and back) waits for the next bar so it lands on the beat.
 */

interface Note { idx: number; steps: number; vel: number; }
interface Track { layer: Layer; inst: Instrument; octave: number; gain: number; steps: (Note | null)[]; }
interface Song { def: SongDef; chords: number[][]; tracks: Track[]; }

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9],
  sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], dim: [0, 3, 6], m7b5: [0, 3, 6, 10],
};
const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "Bbmaj7" -> pitch classes from the root, e.g. [10, 14, 17, 21]. */
export function parseChord(name: string): number[] {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  const quality = m ? QUALITIES[m[3]] : undefined;
  if (!m || !quality) throw new Error(`Unknown chord "${name}" in data/music.ts`);
  const root = PITCH[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return quality.map((i) => root + i);
}

function parsePattern(inst: Instrument, pattern: string): (Note | null)[] {
  const chars = pattern.replace(/[\s|]/g, '');
  if (chars.length === 0 || chars.length % 16 !== 0) throw new Error(`A ${inst} pattern in data/music.ts must be a multiple of 16 steps`);
  const steps: (Note | null)[] = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    let note: Note | null = null;
    if (c === 'x' || c === 'X' || c === 'g') note = { idx: 0, steps: 1, vel: c === 'X' ? 1.4 : c === 'g' ? 0.4 : 1 };
    else if (c >= '0' && c <= '9') note = { idx: Number(c), steps: 1, vel: 1 };
    if (note) {
      // Each - after a note holds it one more step
      while (chars[i + note.steps] === '-') note.steps++;
    }
    steps.push(note);
  }
  return steps;
}

function buildSong(def: SongDef): Song {
  return {
    def,
    chords: def.chords.map(parseChord),
    tracks: def.tracks.map((t) => ({ layer: t.layer, inst: t.inst, octave: t.octave ?? 4, gain: t.gain ?? 1, steps: parsePattern(t.inst, t.pattern) })),
  };
}

let songs: Record<SongId, Song> | null = null;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let buses: Record<Layer, GainNode> | null = null;
let noise: AudioBuffer | null = null;
let timer: number | undefined;
/** Set while fading out after stopMusic; the sequencer stops when it fires. */
let stopping: number | undefined;
let current: SongId = 'clinic';
let wanted: SongId = 'clinic';
let step = 0;
let nextTime = 0;
let pressure = -1;
let paused = false;
let notesPlayed = 0;
let stepsPlayed = 0;
/**
 * Automated test browsers keep the sequencer running but make no sound: on the
 * slow CI runner, synthesizing every note took enough CPU to double the smoke
 * test's run time and starve its timing checks.
 */
const SILENT = typeof navigator !== 'undefined' && navigator.webdriver;

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function volume(): number {
  if (!settings.music) return 0;
  return MUSIC.volume * (paused ? MUSIC.pausedDuck : 1);
}

/** Sets up the music on the shared audio context. Call once after initSfx. Safe to call again. */
export function initMusic(): void {
  if (ctx) return;
  ctx = audioContext();
  if (!ctx) return;
  songs = { clinic: buildSong(SONGS.clinic), boss: buildSong(SONGS.boss) };
  master = ctx.createGain();
  master.gain.value = 0;
  // Its own gentle compressor, so drums and pads sit together
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -18;
  glue.ratio.value = 3;
  master.connect(glue).connect(ctx.destination);
  buses = { base: ctx.createGain(), pressure: ctx.createGain() };
  buses.pressure.gain.value = 0;
  buses.base.connect(master);
  buses.pressure.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

/** Starts the clinic theme from the top (a new shift). */
export function startMusic(): void {
  if (!ctx || !master) return;
  current = wanted = 'clinic';
  step = 0;
  pressure = -1;
  paused = false;
  nextTime = ctx.currentTime + 0.1;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(volume(), ctx.currentTime, 0.3);
  setMusicMix('clinic', 0);
  window.clearTimeout(stopping);
  stopping = undefined;
  if (timer === undefined) timer = window.setInterval(tick, MUSIC.tickMs);
}

/** Fades the music out and stops the sequencer (game over, leaving the shift). */
export function stopMusic(fadeSec = MUSIC.stopFadeSec): void {
  if (timer === undefined || stopping !== undefined || !ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0, ctx.currentTime, fadeSec / 3);
  stopping = window.setTimeout(() => {
    window.clearInterval(timer);
    timer = undefined;
    stopping = undefined;
  }, fadeSec * 1000);
}

/**
 * Called every frame by the game: which song should play, and how loud the
 * pressure layer is (0..1). Cheap when nothing changed.
 */
export function setMusicMix(song: SongId, pressureLevel: number): void {
  wanted = song;
  if (!ctx || !buses) return;
  const p = Math.max(0, Math.min(1, pressureLevel));
  if (Math.abs(p - pressure) < 0.03) return;
  pressure = p;
  buses.pressure.gain.setTargetAtTime(p, ctx.currentTime, MUSIC.layerFadeSec);
}

/** The pause menu turns the music down; resuming brings it back. */
export function setMusicPaused(on: boolean): void {
  paused = on;
  applyVolume();
}

/** MUSIC toggle in the pause menu. */
export function applyVolume(): void {
  if (!ctx || !master || timer === undefined || stopping !== undefined) return;
  master.gain.setTargetAtTime(volume(), ctx.currentTime, 0.15);
}

/** For the smoke test and the debug overlay. */
export function musicState(): { playing: boolean; song: SongId; pressure: number; steps: number; notes: number; context: string } {
  return { playing: timer !== undefined && stopping === undefined, song: current, pressure: Math.max(0, pressure), steps: stepsPlayed, notes: notesPlayed, context: ctx?.state ?? 'none' };
}

function stepSec(def: SongDef, i: number): number {
  const base = 60 / def.bpm / 4;
  return base * (i % 2 === 0 ? 1 + def.swing : 1 - def.swing);
}

function tick(): void {
  if (!ctx || !songs || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  // Woken late (background tab, slow device): skip ahead rather than play a burst of old notes
  if (nextTime < now) nextTime = now + 0.05;
  const until = now + MUSIC.lookaheadSec;
  while (nextTime < until) {
    if (step % 16 === 0 && wanted !== current) {
      current = wanted;
      step = 0;
    }
    const song = songs[current];
    // Muted: keep time but make no sound (saves battery)
    if (settings.music && !SILENT) playStep(song, step, nextTime);
    stepsPlayed++;
    nextTime += stepSec(song.def, step);
    step++;
  }
}

function playStep(song: Song, i: number, t: number): void {
  const chord = song.chords[Math.floor(i / 16) % song.chords.length];
  for (const tr of song.tracks) {
    const note = tr.steps[i % tr.steps.length];
    if (!note) continue;
    const out = buses![tr.layer];
    // Everything in a pressure layer that's faded right out is skipped, not just silent
    if (tr.layer === 'pressure' && pressure < 0.02) continue;
    const dur = note.steps * stepSec(song.def, i);
    const vel = note.vel * tr.gain;
    const tone = (idx: number) => midiHz(12 * (tr.octave + 1) + chord[idx % chord.length] + 12 * Math.floor(idx / chord.length));
    notesPlayed++;
    switch (tr.inst) {
      case 'pad': chord.forEach((_, k) => pad(out, t, dur, tone(k), vel)); break;
      case 'bass': bass(out, t, dur, tone(note.idx), vel); break;
      case 'keys': keys(out, t, dur, tone(note.idx), vel); break;
      case 'arp': arp(out, t, tone(note.idx), vel); break;
      case 'lead': lead(out, t, dur, tone(note.idx), vel); break;
      case 'kick': kick(out, t, vel); break;
      case 'snare': snare(out, t, vel); break;
      case 'hat': hiss(out, t, 0.04, 7000, 0.07 * vel, 'highpass'); break;
      case 'shaker': hiss(out, t, 0.07, 5000, 0.05 * vel, 'highpass'); break;
      case 'rim': rim(out, t, vel); break;
    }
  }
}

// --- Instruments -----------------------------------------------------------

function env(t: number, attack: number, hold: number, release: number, peak: number): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + Math.max(attack, hold));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, hold) + release);
  return g;
}

function osc(type: OscillatorType, hz: number, t: number, end: number, into: AudioNode, detune = 0): OscillatorNode {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.value = hz;
  o.detune.value = detune;
  o.connect(into);
  o.start(t);
  o.stop(end);
  return o;
}

function lowpass(hz: number, into: AudioNode): BiquadFilterNode {
  const f = ctx!.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = hz;
  f.connect(into);
  return f;
}

function pad(out: AudioNode, t: number, dur: number, hz: number, vel: number): void {
  const g = env(t, 0.3, dur, 0.6, 0.035 * vel);
  g.connect(out);
  const f = lowpass(1100, g);
  const end = t + dur + 0.7;
  osc('sawtooth', hz, t, end, f, -7);
  osc('sawtooth', hz, t, end, f, 7);
}

function bass(out: AudioNode, t: number, dur: number, hz: number, vel: number): void {
  const g = env(t, 0.01, dur * 0.9, 0.08, 0.22 * vel);
  g.connect(out);
  const f = lowpass(700, g);
  const end = t + dur + 0.1;
  osc('triangle', hz, t, end, f);
  osc('square', hz, t, end, lowpass(400, f)).detune.value = 3;
}

/** Vibraphone-ish electric piano: the hold-music melody. */
function keys(out: AudioNode, t: number, dur: number, hz: number, vel: number): void {
  const len = Math.max(0.5, dur * 1.4);
  const g = env(t, 0.005, 0.01, len, 0.12 * vel);
  g.connect(out);
  osc('sine', hz, t, t + len + 0.05, g);
  const bell = env(t, 0.003, 0.003, 0.25, 0.03 * vel);
  bell.connect(out);
  osc('sine', hz * 4, t, t + 0.3, bell);
}

function arp(out: AudioNode, t: number, hz: number, vel: number): void {
  const g = env(t, 0.004, 0.01, 0.14, 0.05 * vel);
  g.connect(out);
  osc('square', hz, t, t + 0.2, lowpass(2200, g));
}

function lead(out: AudioNode, t: number, dur: number, hz: number, vel: number): void {
  const g = env(t, 0.01, dur * 0.85, 0.1, 0.06 * vel);
  g.connect(out);
  const end = t + dur + 0.15;
  const o = osc('sawtooth', hz, t, end, lowpass(1800, g));
  // A touch of siren wobble
  const lfo = ctx!.createOscillator();
  const depth = ctx!.createGain();
  lfo.frequency.value = 6;
  depth.gain.value = 12;
  lfo.connect(depth).connect(o.detune);
  lfo.start(t);
  lfo.stop(end);
}

function kick(out: AudioNode, t: number, vel: number): void {
  const g = env(t, 0.002, 0.01, 0.2, 0.5 * Math.min(vel, 1.3));
  g.connect(out);
  const o = osc('sine', 140, t, t + 0.25, g);
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
}

function snare(out: AudioNode, t: number, vel: number): void {
  hiss(out, t, 0.16, 1800, 0.16 * vel, 'bandpass');
  const g = env(t, 0.002, 0.005, 0.08, 0.08 * vel);
  g.connect(out);
  const o = osc('triangle', 220, t, t + 0.1, g);
  o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
}

function rim(out: AudioNode, t: number, vel: number): void {
  const g = env(t, 0.001, 0.002, 0.03, 0.07 * vel);
  g.connect(out);
  osc('triangle', 1700, t, t + 0.05, g);
  hiss(out, t, 0.02, 3000, 0.04 * vel, 'bandpass');
}

function hiss(out: AudioNode, t: number, dur: number, hz: number, peak: number, type: BiquadFilterType): void {
  const src = ctx!.createBufferSource();
  src.buffer = noise;
  const f = ctx!.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  const g = env(t, 0.002, 0.002, dur, peak);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}
