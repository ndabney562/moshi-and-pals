import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockContainer {
    scene: any;
    x = 0;
    y = 0;
    children: any[] = [];
    constructor(scene: any, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }
    add(items: any[]) {
      this.children.push(...items);
      return this;
    }
  }

  return {
    default: {
      GameObjects: {
        Container: MockContainer,
      },
    },
  };
});

import { BottleMeter } from '../../src/ui/BottleMeter';

describe('BottleMeter', () => {
  let mockScene: any;

  beforeEach(() => {
    const makeGfx = () => ({
      clear: vi.fn().mockReturnThis(),
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      fillTriangle: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      lineBetween: vi.fn().mockReturnThis(),
    });

    const makeText = () => ({
      setText: vi.fn().mockReturnThis(),
      setColor: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      setShadow: vi.fn().mockReturnThis(),
      text: '',
    });

    mockScene = {
      add: {
        graphics: vi.fn(() => makeGfx()),
        text: vi.fn(() => makeText()),
        existing: vi.fn(),
      },
    };
  });

  it('initializes text and graphics', () => {
    const meter = new BottleMeter(mockScene);
    expect(meter.text).toBeDefined();
    expect(mockScene.add.graphics).toHaveBeenCalled();
  });

  it('updates fluid state and text on equipment change', () => {
    const meter = new BottleMeter(mockScene);
    meter.set({
      name: 'Squirt Bottle',
      ammo: 80,
      capacity: 120,
      reserve: 480,
      refillProgress: -1,
      pourWindow: [0.6, 0.8],
      fresh: false,
      slots: 1,
      selfCharging: false,
      unit: 'mL',
      spareName: 'JUG',
    });
    expect(meter.text.setText).toHaveBeenCalled();
  });

  it('shows refilling status when refill is active', () => {
    const meter = new BottleMeter(mockScene);
    meter.set({
      name: 'Squirt Bottle',
      ammo: 0,
      capacity: 120,
      reserve: 480,
      refillProgress: 0.5,
      pourWindow: [0.6, 0.8],
      fresh: false,
      slots: 1,
      selfCharging: false,
      unit: 'mL',
      spareName: 'JUG',
    });
    expect(meter.text.setText).toHaveBeenCalledWith(expect.stringContaining('REFILLING'));
  });
});
