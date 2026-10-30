import { test, expect, active } from '../helpers/game';
import { offlineServer } from '../helpers/offline-server';

test('@smoke manifest, icons and version resolve beneath the Pages subpath', async ({ request }) => {
  const manifestResponse = await request.get('./manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ name: 'Moshi and Pals', start_url: './', scope: './', orientation: 'landscape' });
  for (const icon of manifest.icons) {
    const response = await request.get(`./${icon.src}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
  }
  expect((await request.get('./sw.js')).ok()).toBe(true);
  const version = await request.get('./version.json');
  expect(version.ok()).toBe(true);
  expect((await version.json()).version).toMatch(/^v/);
});
test('a controlled PWA reloads the game during a transport outage', async ({ page }, testInfo) => {
  const server = await offlineServer();
  try {
    await page.goto(`${server.url}?sw&god&seed=123`);
    await active(page, 'Title');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await expect.poll(() => page.evaluate(async () => {
      const urls = performance.getEntriesByType('resource').map((r) => r.name)
        .filter((url) => url.startsWith(location.origin) && !url.includes('version.json'));
      return urls.length > 0 && (await Promise.all(urls.map((url) => caches.match(url)))).every(Boolean);
    })).toBe(true);
    testInfo.annotations.push({ type: 'offline', description: 'Server drops every connection; only expected failed version.json probes are excluded from diagnostics.' });
    server.disconnect();
    await page.reload();
    await active(page, 'Title');
    await expect(page.locator('canvas')).toBeVisible();
  } finally {
    await page.close();
    await server.close();
  }
});

test('a worker upgrade keeps the previous build available for offline reload', async ({ page }, testInfo) => {
  const server = await offlineServer();
  try {
    await page.goto(`${server.url}?sw&god&seed=123`);
    await active(page, 'Title');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await expect.poll(() => page.evaluate(async () => {
      const urls = performance.getEntriesByType('resource').map((entry) => entry.name).filter((url) => url.startsWith(location.origin) && !url.includes('version.json'));
      return (await Promise.all(urls.map((url) => caches.match(url)))).every(Boolean);
    })).toBe(true);
    await page.evaluate(() => navigator.serviceWorker.register('./sw.js?v=upgrade-verification', { scope: './' }).then(() => undefined));
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.includes('upgrade-verification'));
    expect(await page.evaluate(async () => (await caches.keys()).filter((key) => key.startsWith('moshi-')).length)).toBe(2);
    // Malformed and cross-origin offers must not crash or pollute the worker.
    await page.evaluate(() => navigator.serviceWorker.controller?.postMessage({ type: 'cache', urls: ['http://[', 'https://example.invalid/asset.png', 42] }));
    testInfo.annotations.push({ type: 'offline', description: 'Transport outage after worker upgrade; expected version probe failure only.' });
    server.disconnect();
    await page.reload();
    await active(page, 'Title');
  } finally {
    await page.close();
    await server.close();
  }
});

test('sharing metadata resolves to a real preview image and asset misses return 404', async ({ page, request }) => {
  await page.goto('./');
  await active(page, 'Title');
  expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe('https://ndabney562.github.io/moshi-and-pals/social-card.jpg');
  const preview = await request.get('./social-card.jpg');
  expect(preview.ok()).toBe(true);
  expect(preview.headers()['content-type']).toContain('image/jpeg');
  expect((await request.get('./assets/definitely-missing.js')).status()).toBe(404);
});
