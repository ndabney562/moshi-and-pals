import { defineConfig } from '@playwright/test';
// @ts-expect-error Small shared Node helper is also consumed by the legacy .mjs smoke suite.
import { chromiumExecutable } from './scripts/browser.mjs';

const port = Number(process.env.REGRESSION_PORT ?? 4174);
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/browser',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/regression.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}/moshi-and-pals/`,
    viewport: { width: 852, height: 393 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', launchOptions: { executablePath: chromiumExecutable() } } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: `npm run preview -- --port ${port}`,
    url: `http://127.0.0.1:${port}/moshi-and-pals/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
