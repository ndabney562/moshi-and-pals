import { existsSync } from 'node:fs';

/** Explicit overrides win; otherwise use a local system browser or Playwright's managed Chromium. */
export function chromiumExecutable() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (process.env.CI) return undefined;
  const system = process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : process.platform === 'linux' ? '/usr/bin/google-chrome' : undefined;
  return system && existsSync(system) ? system : undefined;
}
