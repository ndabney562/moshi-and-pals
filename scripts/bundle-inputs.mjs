import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

export function sourceFingerprint(root = process.cwd()) {
  const files = [];
  const walk = (path) => {
    if (statSync(path).isDirectory()) for (const name of readdirSync(path).sort()) walk(resolve(path, name));
    else files.push(path);
  };
  for (const name of ['src', 'public', 'index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'scripts/bundle-inputs.mjs', 'scripts/verify-web-bundle.mjs']) walk(resolve(root, name));
  const hash = createHash('sha256');
  for (const file of files) hash.update(relative(root, file)).update('\0').update(readFileSync(file)).update('\0');
  return hash.digest('hex');
}
