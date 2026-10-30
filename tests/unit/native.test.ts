import { afterEach, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {}, Core: { Events: { READY: 'ready' } }, Scenes: { Events: { CREATE: 'create' } } } }));
vi.mock('../../src/core/events', () => ({ events: { on: vi.fn() }, GameEvents: {} }));
vi.mock('../../src/core/music', () => ({ applyVolume: vi.fn() }));
vi.mock('../../src/core/sfx', () => ({ setSfxMuted: vi.fn() }));

afterEach(() => { delete (window as any).moshiNative; delete (window as any).webkit; });

/** A game whose READY and Title CREATE events the test fires by hand. */
const fakeGame = () => {
  const handlers: Record<string, () => void> = {};
  const title = { events: { on: vi.fn((name: string, fn: () => void) => { handlers[`title:${name}`] = fn; }) } };
  return {
    events: { once: vi.fn((name: string, fn: () => void) => { handlers[`game:${name}`] = fn; }) },
    scene: { getScene: vi.fn((key: string) => (key === 'Title' ? title : undefined)) },
    fire: (name: string) => handlers[name]?.(),
  };
};
const host = () => {
  window.history.replaceState({}, '', '?native');
  const postMessage = vi.fn();
  (window as any).webkit = { messageHandlers: { moshi: { postMessage } } };
  return postMessage;
};

it('leaves normal browsers on the web title flow without installing a native API', async () => {
  const native = await import('../../src/core/native');
  expect(native.NATIVE).toBe(false);
  native.installNativeBridge(fakeGame() as any);
  expect((window as any).moshiNative).toBeUndefined();
  const scene = { scene: { start: vi.fn() } };
  native.toTitle(scene as any);
  expect(scene.scene.start).toHaveBeenCalledWith('Title');
  expect(native.openNativeSettings()).toBe(false);
  expect(native.openNativeGameCenter()).toBe(false);
});

it('safely posts with no listener and when the native host throws', async () => {
  host();
  const native = await import('../../src/core/native');
  native.installNativeBridge(fakeGame() as any);
  delete (window as any).webkit;
  expect(() => (window as any).moshiNative.refresh()).not.toThrow();
  (window as any).webkit = { messageHandlers: { moshi: { postMessage() { throw new Error('host gone'); } } } };
  expect(() => (window as any).moshiNative.refresh()).not.toThrow();
});

it('validates settings patches and emits a snapshot matching Swift field names', async () => {
  const postMessage = host();
  const native = await import('../../src/core/native');
  native.installNativeBridge(fakeGame() as any);
  (window as any).moshiNative.setSettings({ difficulty: 'walkIn', sound: 'loud', character: 'kaya', unknown: true });
  const saved = JSON.parse(localStorage.getItem('moshi.settings.v1')!);
  expect(saved).toMatchObject({ difficulty: 'walkIn', sound: true, character: 'eugene' });
  const message = postMessage.mock.calls.at(-1)![0];
  expect(message).toMatchObject({ type: 'snapshot', version: 'baseline-test', settings: { difficulty: 'walkIn' }, totals: { runs: 0, totalKills: 0 }, progress: { credits: 0, nps: 0, bank: 0 } });
  expect(message.pals.map((p: any) => p.id)).toEqual(['eugene', 'kaya', 'lucien', 'ken', 'jason', 'dhiwya', 'raj', 'lidiya', 'dharma', 'amanda', 'janeen']);
  expect(message.difficulties.map((d: any) => d.id)).toEqual(['walkIn', 'urgent', 'trauma']);
  expect(message.art).toBeUndefined();
  expect((window as any).moshiNative.start).toBeUndefined();
  expect((window as any).moshiNative.open).toBeUndefined();
});

it('reports in with a snapshot and ready every time the title screen is created', async () => {
  const postMessage = host();
  const native = await import('../../src/core/native');
  const game = fakeGame();
  native.installNativeBridge(game as any);
  expect(postMessage).not.toHaveBeenCalled();
  game.fire('game:ready');
  expect(postMessage).not.toHaveBeenCalled();
  game.fire('title:create');
  expect(postMessage.mock.calls.map((c) => c[0].type)).toEqual(['snapshot', 'ready']);
  game.fire('title:create');
  expect(postMessage.mock.calls.map((c) => c[0].type)).toEqual(['snapshot', 'ready', 'snapshot', 'ready']);
});

it('goes back to the web title on exit and asks the app for its settings sheet and Game Center', async () => {
  const postMessage = host();
  const native = await import('../../src/core/native');
  native.installNativeBridge(fakeGame() as any);
  const start = vi.fn();
  native.toTitle({ scene: { start } } as any);
  expect(start).toHaveBeenLastCalledWith('Title');
  expect(postMessage).toHaveBeenLastCalledWith({ type: 'exit' });
  expect(native.openNativeSettings()).toBe(true);
  expect(postMessage).toHaveBeenLastCalledWith({ type: 'openSettings' });
  expect(native.openNativeGameCenter()).toBe(true);
  expect(postMessage).toHaveBeenLastCalledWith({ type: 'openGameCenter' });
});
