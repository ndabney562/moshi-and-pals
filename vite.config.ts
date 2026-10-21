import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
// Shown in the corner of the screen so testers can tell which build they have.
const build = (process.env.GITHUB_SHA ?? 'local').slice(0, 7);

const version = `v${pkg.version} (${build})`;

// GitHub Pages serves the game from /moshi-and-pals/, so asset URLs need that prefix.
export default defineConfig({
  // The iPhone app (ios/) bundles a copy built with MOSHI_BASE=./ so it loads from inside the app.
  base: process.env.MOSHI_BASE ?? '/moshi-and-pals/',
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
