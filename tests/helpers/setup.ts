import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  localStorage.clear();
  window.history.replaceState({}, '', '/moshi-and-pals/');
});
