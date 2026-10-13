import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
// Shown in the corner of the screen so testers can tell which build they have.
const build = (process.env.GITHUB_SHA ?? 'local').slice(0, 7);

// GitHub Pages serves the game from /moshi-and-pals/, so asset URLs need that prefix.
export default defineConfig({
  base: '/moshi-and-pals/',
  define: {
    __APP_VERSION__: JSON.stringify(`v${pkg.version} (${build})`),
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000, // Phaser itself is ~1.2 MB; that's expected.
  },
});
