import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const verifier = resolve('scripts/verify-web-bundle.mjs');
function alteredBundle(change, args = []) {
  const temporary = mkdtempSync(join(tmpdir(), 'moshi-bundle-test-'));
  const bundle = join(temporary, 'web');
  try {
    cpSync('dist', bundle, { recursive: true });
    change(bundle);
    return spawnSync(process.execPath, [verifier, bundle, ...args], { encoding: 'utf8' });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
test('iOS receives the identical sealed artifact, including browser-only files', () => {
  execFileSync('sh', ['scripts/ios-bundle-web.sh'], { stdio: 'pipe' });
  assert.equal(readFileSync('ios/build/web/bundle-manifest.json', 'utf8'), readFileSync('dist/bundle-manifest.json', 'utf8'));
  execFileSync(process.execPath, [verifier, 'ios/build/web'], { stdio: 'pipe' });
});
test('verification rejects an edited or corrupted artifact', () => {
  const result = alteredBundle((bundle) => writeFileSync(join(bundle, 'index.html'), '<html>corrupted</html>'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Bundled files differ/);
});
test('verification rejects a bundle sealed against older sources', () => {
  const result = alteredBundle((bundle) => {
    const file = join(bundle, 'bundle-manifest.json');
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    manifest.source = 'outdated';
    writeFileSync(file, JSON.stringify(manifest));
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Web bundle is stale/);
});
test('verification rejects an image over its size budget, even when sealed', () => {
  const result = alteredBundle((bundle) => writeFileSync(join(bundle, 'assets', 'huge.png'), Buffer.alloc(600 * 1024)), ['--seal']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /assets\/huge\.png is 600 KB; images must be ≤ 512 KB/);
});
