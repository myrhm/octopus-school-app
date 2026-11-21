import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@solidjs/testing-library';
import 'fake-indexeddb/auto';

// jsdom does not implement scrolling; real scrolling is covered in browser tests.
beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
