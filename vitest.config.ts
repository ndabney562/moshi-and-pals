import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('baseline-test') },
  test: {
    reporters: ['default', 'json'],
    outputFile: { json: 'test-results/unit.json' },
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/moshi-and-pals/' } },
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/helpers/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
