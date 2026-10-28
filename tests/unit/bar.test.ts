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
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    setVisible() {
      return this;
    }
  }

  return {
    default: {
      GameObjects: {
        Container: MockContainer,
      },
      Math: {
        Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      },
    },
  };
});

import { Bar } from '../../src/ui/Bar';

describe('Bar', () => {
  let mockScene: any;

  beforeEach(() => {
    const makeGfx = () => ({
      clear: vi.fn().mockReturnThis(),
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      beginPath: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      strokePath: vi.fn().mockReturnThis(),
    });

    const makeText = () => ({
      setText: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      setShadow: vi.fn().mockReturnThis(),
    });

    const makeCircle = () => ({
      setStrokeStyle: vi.fn().mockReturnThis(),
    });

    const makeImage = () => ({
      width: 64,
      height: 64,
      setDisplaySize: vi.fn().mockReturnThis(),
    });

    mockScene = {
      add: {
        graphics: vi.fn(() => makeGfx()),
        text: vi.fn(() => makeText()),
        circle: vi.fn(() => makeCircle()),
        image: vi.fn(() => makeImage()),
        existing: vi.fn(),
      },
      tweens: {
        killTweensOf: vi.fn(),
        add: vi.fn(),
      },
    };
  });

  it('initializes dimensions and values cleanly', () => {
    const bar = new Bar(mockScene, 200, 20, 0x4cd964, 'EUGENE');
    expect(bar.barWidth).toBe(200);
    expect(bar.barHeight).toBe(20);
    expect(bar.outerHeight).toBe(26);
  });

  it('updates value and animates damage trail on decrease', () => {
    const bar = new Bar(mockScene, 200, 20, 0x4cd964, 'EUGENE');
    bar.setValue(50, 100, 'EUGENE 50');
    expect(mockScene.tweens.add).toHaveBeenCalled();
  });

  it('adjusts outerHeight when avatar is provided', () => {
    const bar = new Bar(mockScene, 240, 22, 0x4cd964, 'Dr. Moshkovich', { key: 'provider-portraits', frame: 'eugene' });
    expect(bar.outerHeight).toBe(36);
  });

  it('supports recoloring on low health and resetting', () => {
    const bar = new Bar(mockScene, 200, 20, 0x4cd964, 'EUGENE');
    bar.setColor(0xff5a5a);
    bar.resetColor();
  });
});

