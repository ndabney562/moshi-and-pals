import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockContainer {
    scene: any;
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    scale = 1;
    alpha = 1;
    children: any[] = [];
    events: Record<string, Function[]> = {};

    constructor(scene: any, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }
    add(items: any[]) {
      this.children.push(...items);
      return this;
    }
    setSize(w: number, h: number) {
      this.width = w;
      this.height = h;
      return this;
    }
    setInteractive() {
      return this;
    }
    setScale(s: number) {
      this.scale = s;
      return this;
    }
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    setAlpha(a: number) {
      this.alpha = a;
      return this;
    }
    on(event: string, fn: Function) {
      (this.events[event] = this.events[event] || []).push(fn);
      return this;
    }
    once(event: string, fn: Function) {
      return this.on(event, fn);
    }
    emit(event: string, ...args: any[]) {
      (this.events[event] || []).forEach((fn) => fn(...args));
      return true;
    }
  }

  return {
    default: {
      GameObjects: {
        Container: MockContainer,
      },
      Geom: {
        Circle: Object.assign(vi.fn(), {
          Contains: () => true,
        }),
      },
    },
  };
});

import { HudButton } from '../../src/ui/HudButton';

describe('HudButton', () => {
  let mockScene: any;
  let pressed = false;

  beforeEach(() => {
    pressed = false;
    const makeObj = () => ({
      setStrokeStyle: vi.fn().mockReturnThis(),
      setFillStyle: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      setShadow: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      beginPath: vi.fn().mockReturnThis(),
      arc: vi.fn().mockReturnThis(),
      strokePath: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      width: 50,
    });

    mockScene = {
      add: {
        circle: vi.fn(() => makeObj()),
        graphics: vi.fn(() => makeObj()),
        text: vi.fn(() => makeObj()),
        existing: vi.fn(),
      },
      input: {
        on: vi.fn(),
        off: vi.fn(),
      },
      tweens: {
        add: vi.fn(),
      },
      time: {
        now: 1000,
      },
    };
  });

  it('initializes label and geometry cleanly', () => {
    const btn = new HudButton(mockScene, 40, 'SPRAY', 0x7fffd4, () => { pressed = true; });
    expect(btn.radius).toBe(40);
    expect(btn.held).toBe(false);
    expect(btn.label).toBeDefined();
  });

  it('updates text via setLabel and fits bounds', () => {
    const btn = new HudButton(mockScene, 40, 'REFILL', 0x2a9df4, () => { pressed = true; });
    btn.setLabel('TAP IN\nGOLD');
    expect(btn.label.setText).toHaveBeenCalledWith('TAP IN\nGOLD');
  });

  it('handles hold-to-confirm progression and triggers onPress only when complete', () => {
    const btn = new HudButton(mockScene, 40, 'BUY', 0x7fffd4, () => { pressed = true; });
    btn.setHoldToConfirm(500);

    // Simulate pointer down
    btn.emit('pointerdown', { id: 1 });
    expect(btn.held).toBe(true);
    expect(btn.holdPointer).toBe(1);
    expect(pressed).toBe(false);

    // Partial tick
    btn.tick(1250);
    expect(pressed).toBe(false);

    // Full tick
    btn.tick(1500);
    expect(pressed).toBe(true);
  });

  it('cancels hold on release', () => {
    const btn = new HudButton(mockScene, 40, 'BUY', 0x7fffd4, () => { pressed = true; });
    btn.setHoldToConfirm(500);
    btn.emit('pointerdown', { id: 1 });
    expect(btn.held).toBe(true);

    btn.release();
    expect(btn.held).toBe(false);
    expect(btn.holdPointer).toBeNull();
  });
});
