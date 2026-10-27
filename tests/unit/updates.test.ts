import { expect, it, vi } from 'vitest';

function worker(version: string) {
  const register = vi.fn().mockResolvedValue({});
  vi.stubGlobal('navigator', { webdriver: false, serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ active: { scriptURL: `http://localhost/moshi-and-pals/sw.js?v=${version}` } }), register } });
  return register;
}
it('keeps an already current worker without a redundant registration', async () => {
  const register = worker('baseline-test');
  await (await import('../../src/core/updates')).registerOffline();
  expect(register).not.toHaveBeenCalled();
});
it('does not downgrade a newer worker when the cached page is stale', async () => {
  const register = worker('newer-build');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 'newer-build' }) }));
  await (await import('../../src/core/updates')).registerOffline();
  expect(register).not.toHaveBeenCalled();
});
it('registers a new worker only when the running page matches the live build', async () => {
  const register = worker('older-build');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 'baseline-test' }) }));
  await (await import('../../src/core/updates')).registerOffline();
  expect(register).toHaveBeenCalledWith('./sw.js?v=baseline-test', { scope: './' });
});
it('keeps the existing offline worker when its version probe fails', async () => {
  const register = worker('newer-build');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  await expect((await import('../../src/core/updates')).registerOffline()).resolves.toBeUndefined();
  expect(register).not.toHaveBeenCalled();
});
