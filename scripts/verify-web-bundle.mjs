import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { sourceFingerprint } from './bundle-inputs.mjs';

const root = resolve(process.argv.find((arg, i) => i > 1 && !arg.startsWith('--')) ?? 'dist');
const manifestPath = resolve(root, 'bundle-manifest.json');
function hashes(dir = root) {
  const result = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) Object.assign(result, hashes(file));
    else if (file !== manifestPath) result[relative(root, file)] = createHash('sha256').update(readFileSync(file)).digest('hex');
  }
  return result;
}
if (process.argv.includes('--seal')) {
  writeFileSync(manifestPath, JSON.stringify({ source: sourceFingerprint(), files: hashes() }, null, 2) + '\n');
}
assert.ok(existsSync(manifestPath), 'Missing bundle manifest: run npm run build first');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.source, sourceFingerprint(), 'Web bundle is stale: rebuild after source/config/dependency changes');
assert.deepEqual(hashes(), manifest.files, 'Bundled files differ from the verified web artifact');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const local = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((url) => !/^(https?:|data:)/.test(url));
for (const url of local) {
  assert.ok(!url.startsWith('/'), `Absolute asset path breaks bundled iOS: ${url}`);
  assert.ok(existsSync(resolve(root, url.split('?')[0])), `Missing HTML asset: ${url}`);
}
const pwa = JSON.parse(readFileSync(resolve(root, 'manifest.webmanifest'), 'utf8'));
for (const icon of pwa.icons) assert.ok(existsSync(resolve(root, icon.src)), `Missing icon: ${icon.src}`);
for (const file of ['sw.js', 'version.json', 'assets/title.jpg', 'assets/menu-sprites.jpg', 'assets/menu-bgs.jpg', 'social-card.png', 'privacy.html']) assert.ok(existsSync(resolve(root, file)), `Missing ${file}`);
console.log(`Verified shared web bundle: ${Object.keys(manifest.files).length} files; source ${manifest.source.slice(0, 12)}`);
