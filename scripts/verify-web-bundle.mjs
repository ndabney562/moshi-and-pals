import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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
for (const file of ['sw.js', 'version.json', 'assets/title.jpg', 'assets/menu-sprites.jpg', 'assets/menu-bgs.jpg', 'social-card.jpg', 'privacy.html']) assert.ok(existsSync(resolve(root, file)), `Missing ${file}`);
// Size budgets: the iPhone app loads all of this before its title shows, and the web build on cellular.
// Raise a budget only on purpose (Noah's call), never to make a build pass.
const KB = 1024;
const BUDGET = { image: 512 * KB, script: 1800 * KB, total: 4096 * KB };
let total = 0;
for (const file of Object.keys(manifest.files)) {
  const size = statSync(resolve(root, file)).size;
  total += size;
  if (/\.(png|jpe?g|webp|gif)$/i.test(file)) assert.ok(size <= BUDGET.image, `${file} is ${Math.round(size / KB)} KB; images must be ≤ ${BUDGET.image / KB} KB (compress it, e.g. to JPEG)`);
  if (/\.js$/i.test(file)) assert.ok(size <= BUDGET.script, `${file} is ${Math.round(size / KB)} KB; scripts must be ≤ ${BUDGET.script / KB} KB`);
}
assert.ok(total <= BUDGET.total, `The bundle is ${Math.round(total / KB)} KB; it must stay ≤ ${BUDGET.total / KB} KB`);
console.log(`Verified shared web bundle: ${Object.keys(manifest.files).length} files, ${Math.round(total / KB)} KB; source ${manifest.source.slice(0, 12)}`);
