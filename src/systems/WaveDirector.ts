import { BALANCE } from '../config/balance';
import { events, GameEvents } from '../core/events';
import { runRng } from '../core/rng';
import type { ShiftMode } from '../core/shift';
import { GERMS } from '../data/germs';
import { SPECIAL_ROUNDS, WAVES, type SpecialRound } from '../data/waves';
import type { GermScaling } from '../entities/Germ';

/**
 * Runs the rounds: decides what spawns, when, and how tough it is, then
 * hands out spawn orders. The game scene does the actual spawning and tells
 * the director how many germs are still alive.
 */
export class WaveDirector {
  round = 0;
  private phase: 'intermission' | 'active' = 'intermission';
  private nextRoundAt: number;
  private nextSpawnAt = 0;
  private emptyQueueAt = 0;
  /** Germ ids still to spawn this round, in order. */
  private queue: string[] = [];
  private scaling: GermScaling = { hpMult: 1, speedMult: 1 };
  /** Spawn-interval multiplier the game sets each frame (1 = normal, more = a breather). */
  pacing = 1;
  /** This round's special rules, if it's a special round. */
  special?: SpecialRound;
  /** Spawn-interval multiplier for the whole shift (difficulty). */
  intervalMult = 1;
  /** Reweights a round's germ mix (modifiers like Flu Season). */
  adjustMix?: (mix: Record<string, number>, round: number) => Record<string, number>;

  /** `firstRound` > 1 skips ahead (debug/stress testing). */
  constructor(startTime: number, firstRound = 1, readonly mode: ShiftMode = 'standard') {
    const delay = mode === 'fluSeason' ? BALANCE.fluSeasonMode.firstRoundDelayMs : WAVES.firstRoundDelayMs;
    this.nextRoundAt = startTime + delay;
    this.round = Math.max(0, firstRound - 1);
  }

  /** True while germs are spawning or still alive this round (not during the break). */
  get roundActive(): boolean {
    return this.phase === 'active';
  }

  /** True while this round still has germs left to send in. Patients only commit violations then (see PatientDirector). */
  get spawning(): boolean {
    return this.phase === 'active' && this.queue.length > 0;
  }

  get isBossRound(): boolean {
    return this.round > 0 && this.round % WAVES.bossEvery === 0;
  }

  /** Pushes the next round back by `ms` while in a break (the Miracle Cure's Records Room is fought between rounds). */
  holdBreak(ms: number): void {
    if (this.phase === 'intermission') this.nextRoundAt += ms;
  }

  /** Germs left to spawn plus those alive: what the player still has to clear. */
  remaining(alive: number): number {
    return this.queue.length + alive;
  }

  /**
   * Call every frame. `spawn` is asked to place one germ and returns false if it couldn't
   * (pool full); the director will retry next frame.
   */
  update(time: number, alive: number, spawn: (germId: string, scaling: GermScaling) => boolean, aliveOf: (germId: string) => number = () => 0): void {
    if (this.phase === 'intermission') {
      if (time >= this.nextRoundAt) this.startRound(time);
      return;
    }
    const r = this.round;
    const maxAliveLimit = this.mode === 'fluSeason'
      ? BALANCE.fluSeasonMode.outbreakPressure.maxAlive(r)
      : WAVES.maxAlive(r);
    if (this.queue.length > 0 && time >= this.nextSpawnAt && alive < maxAliveLimit + (this.special?.maxAliveAdd ?? 0)) {
      // A type at its alive limit waits its turn: send in the next germ that isn't
      const atLimit = (id: string) => !!WAVES.aliveLimit[id] && aliveOf(id) >= WAVES.aliveLimit[id](r);
      if (atLimit(this.queue[0])) {
        const next = this.queue.findIndex((id) => !atLimit(id));
        if (next > 0) [this.queue[0], this.queue[next]] = [this.queue[next], this.queue[0]];
      }
      if (!atLimit(this.queue[0]) && spawn(this.queue[0], this.scaling)) {
        this.queue.shift();
        const baseInterval = this.mode === 'fluSeason'
          ? BALANCE.fluSeasonMode.outbreakPressure.spawnIntervalMs(r)
          : WAVES.spawnIntervalMs(r);
        this.nextSpawnAt = time + baseInterval * this.pacing * this.intervalMult * (this.special?.spawnMult ?? 1) * runRng.wave.float(0.7, 1.3);
        if (this.queue.length === 0) {
          this.emptyQueueAt = time;
        }
      }
    }

    let roundEnded = false;
    if (this.queue.length === 0) {
      if (alive === 0) {
        roundEnded = true;
      } else if (this.mode === 'fluSeason') {
        // Continuous wave flow: advance if only 1-2 germs remain or breather cap reached
        if (alive <= 2 || (this.emptyQueueAt > 0 && time >= this.emptyQueueAt + BALANCE.fluSeasonMode.maxWaveBreatherMs)) {
          roundEnded = true;
        }
      }
    }

    if (roundEnded) {
      this.phase = 'intermission';
      const intermission = this.mode === 'fluSeason' ? BALANCE.fluSeasonMode.supplyWindowMs : WAVES.intermissionMs;
      this.nextRoundAt = time + intermission;
      this.emptyQueueAt = 0;
      events.emit(GameEvents.RoundCompleted, { round: r, mode: this.mode });
    }
  }

  private startRound(time: number): void {
    const r = ++this.round;
    this.phase = 'active';
    this.emptyQueueAt = 0;
    const specialId = this.isBossRound ? undefined : WAVES.specialFor(r);
    this.special = specialId ? SPECIAL_ROUNDS[specialId] : undefined;
    const sp = this.special;

    const hpMult = this.mode === 'fluSeason'
      ? BALANCE.fluSeasonMode.outbreakPressure.hpMult(r)
      : WAVES.hpMult(r);
    const speedMult = this.mode === 'fluSeason'
      ? BALANCE.fluSeasonMode.outbreakPressure.speedMult(r)
      : WAVES.speedMult(r);

    this.scaling = { hpMult: hpMult * (sp?.hpMult ?? 1), speedMult };

    const baseCount = this.mode === 'fluSeason'
      ? BALANCE.fluSeasonMode.outbreakPressure.count(r)
      : WAVES.count(r);
    let count = Math.round(baseCount * (sp?.countMult ?? 1));
    this.queue = [];
    if (this.isBossRound) {
      this.queue.push(WAVES.bossFor(r));
      count = Math.round(count * WAVES.bossEscortFraction);
    }
    // Weighted random mix of normal germs
    const base = sp?.mix ? { ...sp.mix } : { ...WAVES.composition(r) };
    if (this.mode === 'fluSeason') {
      base.sprinter = (base.sprinter ?? 0.1) + BALANCE.fluSeasonMode.outbreakPressure.sprinterWeightBoost;
      base.sneezer = (base.sneezer ?? 0.05) + BALANCE.fluSeasonMode.outbreakPressure.sneezerWeightBoost;
    }
    const weights = Object.entries(this.adjustMix ? this.adjustMix({ ...base }, r) : base).filter(([id]) => GERMS[id]);
    const total = weights.reduce((sum, [, w]) => sum + w, 0);
    for (let i = 0; i < count; i++) {
      let pick = runRng.wave.next() * total;
      const entry = weights.find(([, w]) => (pick -= w) <= 0) ?? weights[0];
      this.queue.push(entry[0]);
    }

    this.nextSpawnAt = time + (this.mode === 'fluSeason' ? 300 : 600);
    const titles = WAVES.titles;
    const boss = this.isBossRound ? GERMS[WAVES.bossFor(r)] : undefined;
    const title = boss ? `BOSS ROUND: ${boss.bossTitle ?? boss.name} ${boss.partner ? 'have' : 'has'} arrived`
      : sp ? `${sp.name}: ${sp.blurb}`
      : this.mode === 'fluSeason' ? `OUTBREAK PRESSURE: WAVE ${r}`
      : titles[Math.min(r - 1, titles.length - 1)];
    events.emit(GameEvents.RoundStarted, { round: r, title, special: sp?.name, mode: this.mode });
  }
}
