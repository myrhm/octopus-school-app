import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@solidjs/testing-library';

// jsdom does not implement scrolling; real scrolling is covered in browser tests.
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});
