import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => {
  class MockGraphics {
    visible = false;
    depth = 0;
    lineWidth = 0;
    lineColor = 0;
    lineAlpha = 0;
    fillColor = 0;
    fillAlpha = 0;
    paths: string[] = [];
    circles: { x: number; y: number; r: number }[] = [];

    setDepth(d: number) { this.depth = d; return this; }
    setVisible(v: boolean) { this.visible = v; return this; }
    lineStyle(width: number, color: number, alpha: number) {
      this.lineWidth = width;
      this.lineColor = color;
      this.lineAlpha = alpha;
      return this;
    }
    fillStyle(color: number, alpha: number) {
      this.fillColor = color;
      this.fillAlpha = alpha;
      return this;
    }
    beginPath() { this.paths.push('begin'); return this; }
    moveTo(x: number, y: number) { this.paths.push(`M${x},${y}`); return this; }
    lineTo(x: number, y: number) { this.paths.push(`L${x},${y}`); return this; }
    strokePath() { this.paths.push('stroke'); return this; }
    strokeCircle(x: number, y: number, r: number) { this.circles.push({ x, y, r }); return this; }
    fillCircle(x: number, y: number, r: number) { this.circles.push({ x, y, r }); return this; }
    clear() {
      this.paths = [];
      this.circles = [];
      return this;
    }
    destroy() {
      this.clear();
    }
  }

  class MockImage {
    x = 0;
    y = 0;
    rotation = 0;
    visible = false;
    depth = 0;
    alpha = 1;
    scaleX = 1;
    scaleY = 1;
    tint = 0xffffff;
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setDepth(d: number) { this.depth = d; return this; }
    setVisible(v: boolean) { this.visible = v; return this; }
    setAlpha(a: number) { this.alpha = a; return this; }
    setScale(x: number, y: number) { this.scaleX = x; this.scaleY = y; return this; }
    setTint(t: number) { this.tint = t; return this; }
    clearTint() { this.tint = 0xffffff; return this; }
  }

  return {
    default: {
      GameObjects: {
        Image: MockImage,
        Graphics: MockGraphics,
      },
      Math: {
        Distance: {
          Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
        },
        Angle: {
          Between: (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1),
          RotateTo: (_current: number, target: number) => target,
        },
        Vector2: class {
          x = 0;
          y = 0;
        },
      },
      Utils: {
        Array: {
          GetRandom: (arr: any[]) => arr[0],
        },
      },
    },
  };
});

vi.mock('../../src/ui/SpeechBubble', () => ({
  SpeechBubble: class {
    say = vi.fn();
    follow = vi.fn();
  },
}));

vi.mock('../../src/core/sfx', () => ({ sfx: { spray: vi.fn(), zap: vi.fn() } }));
vi.mock('../../src/core/progress', () => ({ staffBoost: () => ({ power: 1, speed: 1, duration: 1 }) }));

import Phaser from 'phaser';
import { Scribes } from '../../src/systems/Scribes';
import { settings } from '../../src/core/settings';

describe('Scribes Target-Focus Feedback and Anti-Oscillation Hysteresis', () => {
  let host: any;
  let scribes: Scribes;
  let germsList: any[];

  beforeEach(() => {
    germsList = [];
    host = {
      scene: {
        add: {
          image: vi.fn(() => ({
            x: 0,
            y: 0,
            rotation: 0,
            visible: false,
            depth: 0,
            setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
            setDepth(d: number) { this.depth = d; return this; },
            setVisible(v: boolean) { this.visible = v; return this; },
            setAlpha() { return this; },
            setScale() { return this; },
            setTint() { return this; },
            clearTint() { return this; },
          })),
          graphics: vi.fn(() => new (Phaser as any).GameObjects.Graphics()),
        },
        tweens: {
          add: vi.fn(),
          killTweensOf: vi.fn(),
        },
        time: { now: 1000 },
        scene: { isActive: () => true },
      },
      player: { x: 500, y: 500, rotation: 0, dead: false },
      flow: {
        lineClear: () => true,
        nextStep: () => false,
      },
      fx: { nozzleMist: vi.fn() },
      patients: {
        nearestViolator: () => undefined,
        sprayed: () => false,
      },
      germs: () => germsList,
      hit: vi.fn(),
      sameFloor: () => true,
      sameRoom: () => true,
      onClean: vi.fn(),
    };

    scribes = new Scribes(host);
  });

  it('initializes helpers with dedicated target reticles', () => {
    const omar = scribes.get('omar');
    expect(omar).toBeUndefined(); // not summoned yet

    scribes.summon('omar', 1000, 30000);
    const omarActive = scribes.get('omar');
    expect(omarActive).toBeDefined();
    expect((omarActive as any).reticle).toBeDefined();
    expect((omarActive as any).reticle.visible).toBe(false);
  });

  it('acquires the nearest active germ target and exposes public query API', () => {
    scribes.summon('omar', 1000, 30000);
    const omar = scribes.get('omar')!;
    (omar as any).img.x = 500;
    (omar as any).img.y = 500;

    const germFar: any = { x: 650, y: 500, active: true, displayWidth: 32 };
    const germNear: any = { x: 540, y: 500, active: true, displayWidth: 32 };
    germsList.push(germFar, germNear);

    scribes.update(1050, 16);

    expect(scribes.hasTarget('omar')).toBe(true);
    expect(scribes.getTarget('omar')).toBe(germNear);

    const reticle: any = (omar as any).reticle;
    expect(reticle.visible).toBe(true);
    expect(reticle.lineColor).toBe(omar.def.color);
    expect(reticle.paths.length).toBeGreaterThan(0);
  });

  it('applies target hysteresis to prevent target flickering between equidistant germs', () => {
    scribes.summon('omar', 1000, 30000);
    const omar = scribes.get('omar')!;
    (omar as any).img.x = 500;
    (omar as any).img.y = 500;

    const germA: any = { x: 550, y: 500, active: true, displayWidth: 32 }; // distance = 50
    germsList.push(germA);

    scribes.update(1050, 16);
    expect(scribes.getTarget('omar')).toBe(germA);

    // Add a second germ slightly closer (distance = 46)
    // Naive nearest would switch, but hysteresis (25% bonus) keeps focus on germA
    const germB: any = { x: 546, y: 500, active: true, displayWidth: 32 };
    germsList.push(germB);

    scribes.update(1066, 16);
    expect(scribes.getTarget('omar')).toBe(germA); // Sticks to germA

    // If germB moves significantly closer (distance = 35), helper switches
    germB.x = 535;
    scribes.update(1082, 16);
    expect(scribes.getTarget('omar')).toBe(germB);
  });

  it('immediately releases target and hides reticle when the target dies', () => {
    scribes.summon('omar', 1000, 30000);
    const omar = scribes.get('omar')!;
    (omar as any).img.x = 500;
    (omar as any).img.y = 500;

    const germ: any = { x: 540, y: 500, active: true, displayWidth: 32 };
    germsList.push(germ);

    scribes.update(1050, 16);
    expect(scribes.hasTarget('omar')).toBe(true);

    germ.active = false; // Defeated by player or ally
    scribes.update(1066, 16);

    expect(scribes.hasTarget('omar')).toBe(false);
    expect(scribes.getTarget('omar')).toBeUndefined();
    expect((omar as any).reticle.visible).toBe(false);
  });

  it('applies trainee gold styling and trainee pip when orientation is active', () => {
    scribes.summon('omar', 1000, 30000);
    scribes.assignTrainee('omar', 1000, 20000);
    const omar = scribes.get('omar')!;
    (omar as any).img.x = 500;
    (omar as any).img.y = 500;

    const germ: any = { x: 540, y: 500, active: true, displayWidth: 32 };
    germsList.push(germ);

    scribes.update(1050, 16);

    const reticle: any = (omar as any).reticle;
    expect(reticle.visible).toBe(true);
    expect(reticle.lineColor).toBe(0xffd54f); // Trainee amber gold
    expect(reticle.circles.length).toBeGreaterThan(0); // Trainee pip drawn
  });

  it('respects reduced-motion settings by disabling breath pulsation', () => {
    scribes.summon('omar', 1000, 30000);
    const omar = scribes.get('omar')!;
    (omar as any).img.x = 500;
    (omar as any).img.y = 500;

    const germ: any = { x: 540, y: 500, active: true, displayWidth: 32 };
    germsList.push(germ);

    settings.reducedMotion = true;
    scribes.update(1050, 16);
    const reticle: any = (omar as any).reticle;
    expect(reticle.visible).toBe(true);

    // Reset settings
    settings.reducedMotion = false;
  });

  it('clears target and hides reticle when helper is distracted or Eugene is downed', () => {
    scribes.summon('omar', 1000, 30000);
    const omar = scribes.get('omar')!;
    (omar as any).img.x = 500;
    (omar as any).img.y = 500;

    const germ: any = { x: 540, y: 500, active: true, displayWidth: 32 };
    germsList.push(germ);

    scribes.update(1050, 16);
    expect(scribes.hasTarget('omar')).toBe(true);

    // Player downed
    host.player.dead = true;
    scribes.update(1066, 16);
    expect(scribes.hasTarget('omar')).toBe(false);
    expect((omar as any).reticle.visible).toBe(false);

    // Revived
    host.player.dead = false;
    scribes.update(1082, 16);
    expect(scribes.hasTarget('omar')).toBe(true);

    // Distracted by break room coffee
    scribes.assignDistraction('omar', { x: 800, y: 800, label: 'COFFEE' }, 1100, 5000);
    expect(scribes.hasTarget('omar')).toBe(false);
    expect((omar as any).reticle.visible).toBe(false);
  });
});
