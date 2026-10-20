import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { runRng } from '../core/rng';
import { sfx } from '../core/sfx';
import type { Obstacle, RoomArea } from '../data/rooms';
import { SCRIBES, type ScribeId } from '../data/scribes';
import { VENT_WORDS } from '../data/vents';
import type { FlowField } from './FlowField';
import type { Fx } from './Fx';
import type { CureStation } from './MiracleCure';

/** What the vents need from the game scene. */
export interface VentHost {
  readonly scene: Phaser.Scene;
  readonly flow: FlowField;
  readonly fx: Fx;
  /** Every room of the clinic (a room can be several boxes sharing one id). */
  readonly rooms: RoomArea[];
  isOpen(roomId: string): boolean;
  /** Footprints of everything with a USE button, so vents stay clear of them. */
  stationFootprints(): Obstacle[];
  copays(): number;
  pay(cost: number): void;
  /** Helpers on the floor right now. */
  helpers(): { id: ScribeId; x: number; y: number; say(lines: string[]): void }[];
  sameFloor(x0: number, y0: number, x1: number, y1: number): boolean;
}

/** A PRIOR AUTH barricade over a vent. */
interface Barricade {
  until: number;
  pushes: number;
  nextPushAt: number;
  art: Phaser.GameObjects.Container;
  bar: Phaser.GameObjects.Graphics;
}

export interface Vent {
  roomId: string;
  x: number;
  y: number;
  /** USE footprint (moves with the vent). */
  o: Obstacle;
  art: Phaser.GameObjects.Image;
  block?: Barricade;
}

/** What a station needs (GameScene's Station; `roomId` keeps BLOCK off in a room Construction has closed). */
export type VentStation = CureStation & { roomId?: string };

/**
 * GERM VENTS: the spots germs come in through. Each open room has a few, at random places on its floor, and the ones
 * that aren't blocked move every round. Pay at one (BLOCK) and a PRIOR AUTH barricade holds germs back: a germ that
 * would have come through it pushes on it instead and comes in elsewhere, and after enough pushes (or time) it gives way.
 */
export class Vents {
  private readonly cfg = BALANCE.vents;
  readonly list: Vent[] = [];
  /** When each scribe may barricade again. */
  private readonly scribeReadyAt = new Map<ScribeId, number>();

  constructor(private readonly host: VentHost, private readonly addStation: (st: VentStation) => void) {}

  /** Gives every open room its vents (call at the start and whenever a room opens). */
  sync(): void {
    const ids = new Set(this.host.rooms.filter((r) => !r.secret && this.host.isOpen(r.id)).map((r) => r.id));
    for (const id of ids) {
      if (this.list.some((v) => v.roomId === id)) continue;
      const planned = this.host.rooms.filter((r) => r.id === id).flatMap((r) => r.germSpawns);
      for (const p of planned) this.add(id, p);
    }
  }

  /** New round: every vent that isn't blocked moves to a new random spot in its room. */
  shuffle(): void {
    for (const v of this.list) {
      if (v.block) continue;
      const p = this.spot(v);
      if (!p) continue;
      this.moveTo(v, p.x, p.y);
      v.art.setAlpha(0);
      this.host.scene.tweens.add({ targets: v.art, alpha: 0.9, duration: 500 });
    }
  }

  /**
   * Where the next germ comes in. `rooms` says which rooms may be used; `rank` orders the candidates (best first is
   * picked from by the caller's own preference); `ignoreBlocks` lets bosses walk straight through.
   * Returns undefined while every candidate is barricaded (the germ waits and pushes).
   */
  pick(time: number, rooms: (id: string) => boolean, choose: (spots: Vent[]) => Vent, ignoreBlocks = false): { x: number; y: number } | undefined {
    const all = this.list.filter((v) => rooms(v.roomId));
    if (!all.length) return undefined;
    const first = choose(all);
    if (!first.block || ignoreBlocks) return first;
    // It was going to come through a barricade: it leans on it, then tries an open vent
    this.push(first, time);
    const open = all.filter((v) => !v.block);
    return open.length ? choose(open) : undefined;
  }

  /** Expires barricades and lets the scribes put new ones up. */
  update(time: number): void {
    for (const v of this.list) {
      if (!v.block) continue;
      if (time >= v.block.until) this.breakThrough(v);
      else this.drawBar(v, time);
    }
    this.scribesBlock(time);
  }

  /** How much a barricade has left, 0..1 (0 = not blocked). */
  strength(v: Vent, time: number): number {
    const b = v.block;
    if (!b) return 0;
    const { holdMs, pushes } = this.cfg.block;
    return Phaser.Math.Clamp(Math.min((b.until - time) / holdMs, 1 - b.pushes / pushes), 0, 1);
  }

  /** Puts up a barricade (already paid for). */
  barricade(v: Vent, time: number): void {
    if (v.block) return;
    const scene = this.host.scene;
    const sign = scene.add.text(0, -19, VENT_WORDS.sign, { fontFamily: 'sans-serif', fontSize: '8px', fontStyle: 'bold', color: '#d62828', align: 'center', wordWrap: { width: 34 } })
      .setOrigin(0.5).setResolution(3);
    const art = scene.add.container(v.x, v.y - 6, [scene.add.image(0, 0, 'vent-block'), sign]).setDepth(6);
    const bar = scene.add.graphics().setDepth(6);
    v.block = { until: time + this.cfg.block.holdMs, pushes: 0, nextPushAt: 0, art, bar };
    art.setScale(0.2);
    scene.tweens.add({ targets: art, scale: 1, duration: 220, ease: 'Back.out' });
    v.art.setAlpha(0.35);
    sfx.stamp();
    this.host.fx.number(v.x, v.y - 50, VENT_WORDS.blocked, '#ffe66d', 18);
    this.drawBar(v, time);
  }

  private add(roomId: string, planned: { x: number; y: number }): void {
    const size = this.cfg.size;
    const v: Vent = {
      roomId, x: planned.x, y: planned.y,
      o: { kind: 'vent', x: 0, y: 0, w: size, h: size },
      art: this.host.scene.add.image(planned.x, planned.y, 'germ-vent').setDepth(4.5).setAlpha(0.9),
    };
    this.list.push(v);
    const p = this.spot(v);
    this.moveTo(v, p?.x ?? planned.x, p?.y ?? planned.y);
    this.host.scene.tweens.add({ targets: v.art, scale: { from: 0.94, to: 1.06 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const cost = this.cfg.block.cost;
    this.addStation({
      o: v.o, roomId,
      info: () => v.block
        ? { verb: VENT_WORDS.heldVerb, cost: 0, note: VENT_WORDS.heldNote(Math.ceil(this.strength(v, this.host.scene.time.now) * 100)), blocked: true }
        : { verb: VENT_WORDS.verb, cost, note: VENT_WORDS.note(this.cfg.block.holdMs / 1000) },
      use: (t) => {
        if (v.block) return;
        if (this.host.copays() < cost) {
          sfx.denied();
          this.host.fx.number(v.x, v.y - 60, `NEED $${cost} COPAYS`, '#ffb3b3', 22);
          return;
        }
        this.host.pay(cost);
        this.barricade(v, t);
      },
    });
  }

  private moveTo(v: Vent, x: number, y: number): void {
    v.x = x;
    v.y = y;
    v.o.x = x - v.o.w / 2;
    v.o.y = y - v.o.h / 2;
    v.art.setPosition(x, y);
  }

  /** A random open spot in the vent's room: room for a germ, apart from other vents, clear of every USE button. */
  private spot(v: Vent): { x: number; y: number } | undefined {
    const { flow } = this.host;
    const boxes = this.host.rooms.filter((r) => r.id === v.roomId);
    const area = boxes.reduce((s, r) => s + r.w * r.h, 0);
    const stations = this.host.stationFootprints();
    const rng = runRng.vents;
    // Small rooms (a bathroom with its door and hand dryer) can't keep clear of every USE button: then just find room
    for (let i = 0; i < this.cfg.tries * 2; i++) {
      const strict = i < this.cfg.tries;
      // A box picked by its size, then a point inside it
      let roll = rng.float(0, area);
      const box = boxes.find((r) => (roll -= r.w * r.h) < 0) ?? boxes[0];
      const x = rng.float(box.x + 30, box.x + box.w - 30);
      const y = rng.float(box.y + 30, box.y + box.h - 30);
      if (!flow.roomy(x, y)) continue;
      if (this.list.some((o) => o !== v && Math.hypot(o.x - x, o.y - y) < this.cfg.spacing * (strict ? 1 : 0.5))) continue;
      if (strict && stations.some((o) => rectDistance(o, x, y) < this.cfg.stationClearance)) continue;
      return { x, y };
    }
    return undefined;
  }

  private push(v: Vent, time: number): void {
    const b = v.block;
    if (!b || time < b.nextPushAt) return;
    b.nextPushAt = time + this.cfg.block.pushEveryMs;
    b.pushes++;
    if (b.pushes >= this.cfg.block.pushes) {
      this.breakThrough(v);
      return;
    }
    this.host.scene.tweens.add({ targets: b.art, x: v.x + 4, duration: 50, yoyo: true, repeat: 2 });
    this.host.fx.number(v.x, v.y - 40, VENT_WORDS.pushed, '#ffb3b3', 16);
    this.drawBar(v, time);
  }

  /** The germs got through: the barricade falls apart and the vent is open again. */
  private breakThrough(v: Vent): void {
    const b = v.block;
    if (!b) return;
    v.block = undefined;
    b.bar.destroy();
    this.host.scene.tweens.add({ targets: b.art, alpha: 0, scale: 1.4, angle: 25, duration: 300, onComplete: () => b.art.destroy() });
    v.art.setAlpha(0.9);
    sfx.bump();
    this.host.fx.germSplat(v.x, v.y, 0x9bbf3a);
    this.host.fx.number(v.x, v.y - 50, VENT_WORDS.broken, '#ff8a80', 18);
  }

  private drawBar(v: Vent, time: number): void {
    const b = v.block;
    if (!b) return;
    const s = this.strength(v, time);
    const w = 52;
    b.bar.clear();
    b.bar.fillStyle(0x0d2b2e, 0.8).fillRect(v.x - w / 2 - 2, v.y + 26, w + 4, 8);
    b.bar.fillStyle(s > 0.5 ? 0xffe66d : s > 0.25 ? 0xffb74d : 0xff6b6b).fillRect(v.x - w / 2, v.y + 28, w * s, 4);
  }

  /** SCRIBES on shift tape off a vent near them, with your Copays, if you can spare it. */
  private scribesBlock(time: number): void {
    const { cost } = this.cfg.block;
    const { range, everyMs, reserve } = this.cfg.scribes;
    for (const h of this.host.helpers()) {
      if (time < (this.scribeReadyAt.get(h.id) ?? 0)) continue;
      if (this.host.copays() < cost + reserve) return;
      let best: Vent | undefined;
      let bestD = range;
      for (const v of this.list) {
        if (v.block || !this.host.isOpen(v.roomId) || !this.host.sameFloor(h.x, h.y, v.x, v.y)) continue;
        const d = Math.hypot(v.x - h.x, v.y - h.y);
        if (d < bestD) { bestD = d; best = v; }
      }
      if (!best) continue;
      this.scribeReadyAt.set(h.id, time + everyMs);
      this.host.pay(cost);
      this.barricade(best, time);
      const def = SCRIBES.find((s) => s.id === h.id);
      if (def?.lines.block) h.say(def.lines.block);
    }
  }
}

/** How far (x, y) is from the edge of a rectangle; 0 inside it. */
const rectDistance = (o: Obstacle, x: number, y: number): number =>
  Math.hypot(Math.max(o.x - x, 0, x - (o.x + o.w)), Math.max(o.y - y, 0, y - (o.y + o.h)));
