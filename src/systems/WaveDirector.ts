import Phaser from 'phaser';
import { events, GameEvents } from '../core/events';
import { GERMS } from '../data/germs';
import { WAVES } from '../data/waves';
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
  /** Germ ids still to spawn this round, in order. */
  private queue: string[] = [];
  private scaling: GermScaling = { hpMult: 1, speedMult: 1 };

  /** `firstRound` > 1 skips ahead (debug/stress testing). */
  constructor(startTime: number, firstRound = 1) {
    this.nextRoundAt = startTime + WAVES.firstRoundDelayMs;
    this.round = Math.max(0, firstRound - 1);
  }

  /** True while germs are spawning or still alive this round (not during the break). */
  get roundActive(): boolean {
    return this.phase === 'active';
  }

  get isBossRound(): boolean {
    return this.round > 0 && this.round % WAVES.bossEvery === 0;
  }

  /** Germs left to spawn plus those alive: what the player still has to clear. */
  remaining(alive: number): number {
    return this.queue.length + alive;
  }

  /**
   * Call every frame. `spawn` is asked to place one germ and returns false if it couldn't
   * (pool full); the director will retry next frame.
   */
  update(time: number, alive: number, spawn: (germId: string, scaling: GermScaling) => boolean): void {
    if (this.phase === 'intermission') {
      if (time >= this.nextRoundAt) this.startRound(time);
      return;
    }
    const r = this.round;
    if (this.queue.length > 0 && time >= this.nextSpawnAt && alive < WAVES.maxAlive(r)) {
      if (spawn(this.queue[0], this.scaling)) {
        this.queue.shift();
        this.nextSpawnAt = time + WAVES.spawnIntervalMs(r) * Phaser.Math.FloatBetween(0.7, 1.3);
      }
    }
    if (this.queue.length === 0 && alive === 0) {
      this.phase = 'intermission';
      this.nextRoundAt = time + WAVES.intermissionMs;
      events.emit(GameEvents.RoundCompleted, { round: r });
    }
  }

  private startRound(time: number): void {
    const r = ++this.round;
    this.phase = 'active';
    this.scaling = { hpMult: WAVES.hpMult(r), speedMult: WAVES.speedMult(r) };

    let count = WAVES.count(r);
    this.queue = [];
    if (this.isBossRound) {
      this.queue.push(WAVES.bossId);
      count = Math.round(count * WAVES.bossEscortFraction);
    }
    // Weighted random mix of normal germs
    const weights = Object.entries(WAVES.composition(r)).filter(([id]) => GERMS[id]);
    const total = weights.reduce((sum, [, w]) => sum + w, 0);
    for (let i = 0; i < count; i++) {
      let pick = Math.random() * total;
      const entry = weights.find(([, w]) => (pick -= w) <= 0) ?? weights[0];
      this.queue.push(entry[0]);
    }

    this.nextSpawnAt = time + 600;
    const titles = WAVES.titles;
    const title = this.isBossRound ? `BOSS ROUND: ${GERMS[WAVES.bossId].name} has arrived` : titles[Math.min(r - 1, titles.length - 1)];
    events.emit(GameEvents.RoundStarted, { round: r, title });
  }
}
