import { afterEach, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {}, Core: { Events: { VISIBLE: 'visible' } } } }));
vi.mock('../../src/core/events', () => ({ events: { on: vi.fn() }, GameEvents: {} }));
vi.mock('../../src/core/music', () => ({ applyVolume: vi.fn() }));
vi.mock('../../src/core/sfx', () => ({ setSfxMuted: vi.fn() }));

afterEach(() => { delete (window as any).moshiNative; delete (window as any).webkit; });
const fakeGame = () => ({ loop: { wake: vi.fn(), sleep: vi.fn() }, scene: { isActive: vi.fn(() => true), getScene: vi.fn(() => ({ scene: { start: vi.fn() } })) }, events: { on: vi.fn() } });
it('leaves normal browsers on the web title flow without installing a native API', async () => {
  const native = await import('../../src/core/native');
  expect(native.NATIVE).toBe(false);
  native.installNativeBridge(fakeGame() as any);
  expect((window as any).moshiNative).toBeUndefined();
  const scene = { scene: { start: vi.fn() } };
  native.toTitle(scene as any);
  expect(scene.scene.start).toHaveBeenCalledWith('Title');
});
it('safely posts with no listener and when the native host throws', async () => {
  window.history.replaceState({}, '', '?native');
  (window as any).webkit = { messageHandlers: { moshi: { postMessage: vi.fn() } } };
  const native = await import('../../src/core/native');
  native.installNativeBridge(fakeGame() as any);
  delete (window as any).webkit;
  expect(() => (window as any).moshiNative.refresh()).not.toThrow();
  (window as any).webkit = { messageHandlers: { moshi: { postMessage() { throw new Error('host gone'); } } } };
  expect(() => (window as any).moshiNative.refresh()).not.toThrow();
});
it('validates settings patches and emits a snapshot matching Swift field names', async () => {
  window.history.replaceState({}, '', '?native');
  const postMessage = vi.fn();
  (window as any).webkit = { messageHandlers: { moshi: { postMessage } } };
  const native = await import('../../src/core/native');
  native.installNativeBridge(fakeGame() as any);
  (window as any).moshiNative.setSettings({ difficulty: 'walkIn', sound: 'loud', character: 'kaya', unknown: true });
  const saved = JSON.parse(localStorage.getItem('moshi.settings.v1')!);
  expect(saved).toMatchObject({ difficulty: 'walkIn', sound: true, character: 'eugene' });
  const message = postMessage.mock.calls.at(-1)![0];
  expect(message).toMatchObject({ type: 'snapshot', version: 'baseline-test', settings: { difficulty: 'walkIn' }, totals: { runs: 0, totalKills: 0 }, progress: { credits: 0, nps: 0, bank: 0 } });
  expect(message.pals.map((p: any) => p.id)).toEqual(['eugene', 'kaya', 'lucien', 'ken', 'jason', 'dhiwya', 'raj', 'lidiya', 'dharma', 'amanda', 'janeen']);
  expect(message.difficulties.map((d: any) => d.id)).toEqual(['walkIn', 'urgent', 'trauma']);
});
it('routes board and locker commands and returns native exits to the host', async () => {
  window.history.replaceState({}, '', '?native');
  const postMessage = vi.fn();
  (window as any).webkit = { messageHandlers: { moshi: { postMessage } } };
  const native = await import('../../src/core/native');
  const start = vi.fn();
  const game = fakeGame();
  game.scene.getScene.mockReturnValue({ scene: { start } });
  native.installNativeBridge(game as any);
  (window as any).moshiNative.open('board');
  expect(start).toHaveBeenLastCalledWith('Board');
  (window as any).moshiNative.open('locker');
  expect(start).toHaveBeenLastCalledWith('Locker');
  native.toTitle({ scene: { start } } as any);
  expect(start).toHaveBeenLastCalledWith('Native');
  expect(postMessage).toHaveBeenCalledWith({ type: 'exit' });
});

it('queues start until the native scene is ready and then starts a normal shift', async () => {
  window.history.replaceState({}, '', '?native');
  (window as any).webkit = { messageHandlers: { moshi: { postMessage: vi.fn() } } };
  const native = await import('../../src/core/native');
  const start = vi.fn();
  const game = fakeGame();
  game.scene.isActive.mockReturnValue(false);
  game.scene.getScene.mockReturnValue({ scene: { start } });
  native.installNativeBridge(game as any);
  (window as any).moshiNative.start({ kind: 'normal' });
  expect(game.loop.wake).toHaveBeenCalled();
  expect(start).not.toHaveBeenCalled();
  new native.NativeScene().create();
  expect(start).toHaveBeenCalledWith('Game', { resume: false });
});

it('cancels menu sleep and queues the scene change before waking a sleeping loop', async () => {
  vi.useFakeTimers();
  try {
    window.history.replaceState({}, '', '?native');
    (window as any).webkit = { messageHandlers: { moshi: { postMessage: vi.fn() } } };
    const native = await import('../../src/core/native');
    const game = fakeGame();
    const start = vi.fn();
    game.scene.getScene.mockReturnValue({ scene: { start } });
    native.installNativeBridge(game as any);
    new native.NativeScene().create();
    await vi.advanceTimersByTimeAsync(200);
    game.loop.wake.mockImplementation(() => {
      expect(start).toHaveBeenCalledWith('Game', { resume: false });
    });
    (window as any).moshiNative.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(game.loop.sleep).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
