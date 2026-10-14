import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { events, GameEvents } from '../core/events';
import { POWERUPS, type PowerupDef, type PowerupId } from '../data/powerups';

const MAX_PILLS = 6;

interface Pill { img: Phaser.GameObjects.Image; id: PowerupId; until: number; }

/**
 * Power-up pills on the floor and the effects running now. The pills bob, blink before they vanish,
 * and are picked up by walking over them. What each effect does is up to the game scene (`onPickup`);
 * this keeps the timers and tells the HUD.
 */
export class Powerups {
  private readonly pills: Pill[] = [];
  private next = 0;
  private readonly active = new Map<PowerupId, number>();
  private nextEmitAt = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly onPickup: (def: PowerupDef, time: number) => void) {
    for (let i = 0; i < MAX_PILLS; i++) {
      this.pills.push({ img: scene.add.image(0, 0, 'pill').setDepth(8.5).setVisible(false), id: 'statClean', until: 0 });
    }
  }

  /** Drops a pill (a random one unless `id` is given). */
  drop(x: number, y: number, time: number, id?: PowerupId): void {
    const ids = Object.keys(POWERUPS) as PowerupId[];
    const pick = id ?? Phaser.Utils.Array.GetRandom(ids);
    const p = this.pills[this.next];
    this.next = (this.next + 1) % MAX_PILLS;
    p.id = pick;
    p.until = time + BALANCE.powerups.lifeMs;
    this.scene.tweens.killTweensOf(p.img);
    p.img.setPosition(x, y).setVisible(true).setAlpha(1).setScale(0.2).setTint(POWERUPS[pick].color);
    this.scene.tweens.add({ targets: p.img, scale: 1.2, duration: 260, ease: 'Back.out' });
  }

  isActive(id: PowerupId, time: number): boolean {
    return (this.active.get(id) ?? 0) > time;
  }

  /** When an effect ends (0 if it isn't running). */
  until(id: PowerupId): number {
    return this.active.get(id) ?? 0;
  }

  /** Bobs and blinks pills, picks them up when Eugene walks over one, and ends effects that ran out. */
  update(time: number, px: number, py: number): void {
    const cfg = BALANCE.powerups;
    for (const p of this.pills) {
      if (!p.img.visible) continue;
      const left = p.until - time;
      if (left <= 0) {
        p.img.setVisible(false);
        continue;
      }
      p.img.setRotation(Math.sin(time / 260) * 0.25);
      p.img.setAlpha(left < cfg.blinkMs && Math.sin(time / 70) < 0 ? 0.25 : 1);
      if ((p.img.x - px) ** 2 + (p.img.y - py) ** 2 < cfg.pickupRadius ** 2) {
        p.img.setVisible(false);
        const def = POWERUPS[p.id];
        if (def.ms > 0) this.active.set(def.id, time + def.ms);
        this.onPickup(def, time);
        events.emit(GameEvents.PowerupPicked, { name: def.name, blurb: def.blurb, color: def.color });
        this.nextEmitAt = 0;
      }
    }
    if (time >= this.nextEmitAt) {
      this.nextEmitAt = time + 100;
      const list = [...this.active.entries()].filter(([, until]) => until > time).map(([id, until]) => ({
        id, name: POWERUPS[id].name, color: POWERUPS[id].color, left: (until - time) / POWERUPS[id].ms,
      }));
      for (const [id, until] of this.active) if (until <= time) this.active.delete(id);
      events.emit(GameEvents.PowerupsChanged, { active: list });
    }
  }

  /** Pills on the floor (tests). */
  get onFloor(): number {
    return this.pills.filter((p) => p.img.visible).length;
  }
}
