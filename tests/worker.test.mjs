import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';

function install({ unavailable = false, assets = { 'index.html': 'hash', 'assets/game.js': 'hash', 'assets/title.jpg': 'hash' } } = {}) {
  const listeners = {}, calls = [];
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL, Response,
    self: { location: { href: 'https://example.test/moshi-and-pals/sw.js?v=test' }, addEventListener: (event, callback) => { listeners[event] = callback; }, skipWaiting: async () => calls.push('activate') },
    caches: { open: async () => ({ addAll: async (urls) => { calls.push([...urls]); if (unavailable) throw new Error('asset unavailable'); } }) },
    fetch: async () => ({ ok: true, json: async () => ({ files: assets }) }),
  });
  let completion;
  listeners.install({ waitUntil: (promise) => { completion = promise; } });
  return { completion, calls };
}
test('offline installation caches the game script and art before activation', async () => {
  const { completion, calls } = install();
  await completion;
  assert.ok(calls[0].includes('https://example.test/moshi-and-pals/assets/game.js'));
  assert.ok(calls[0].includes('https://example.test/moshi-and-pals/assets/title.jpg'));
  assert.ok(calls[0].includes('https://example.test/moshi-and-pals/bundle-manifest.json'));
  assert.equal(calls[1], 'activate');
});
test('a failed asset download cannot activate a partial offline build', async () => {
  const { completion, calls } = install({ unavailable: true });
  await assert.rejects(completion, /asset unavailable/);
  assert.ok(!calls.includes('activate'));
});
test('an offline manifest cannot cache assets outside the game scope', async () => {
  const { completion, calls } = install({ assets: { '../other-game.js': 'hash' } });
  await assert.rejects(completion, /Invalid offline asset scope/);
  assert.equal(calls.length, 0);
});
