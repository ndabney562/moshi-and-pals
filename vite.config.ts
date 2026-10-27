import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
// @ts-expect-error Shared Node build helper.
import { sourceFingerprint } from './scripts/bundle-inputs.mjs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
// Shown in the corner of the screen so testers can tell which build they have.
const build = (process.env.GITHUB_SHA ?? sourceFingerprint()).slice(0, 7);

const version = `v${pkg.version} (${build})`;

// Relative URLs let the exact same artifact load from Pages and moshi://app/.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [{
    // version.json: lets a running game notice that a newer build is live (src/core/updates.ts)
    name: 'version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
    },
  }],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000, // Phaser itself is ~1.2 MB; that's expected.
  },
});
