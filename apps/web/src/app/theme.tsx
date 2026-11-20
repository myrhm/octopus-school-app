import { createContext, createEffect, createSignal, onCleanup, useContext } from 'solid-js';
import type { Accessor, ParentProps } from 'solid-js';

export type ThemePreference = 'light' | 'dark' | 'system';
const storageKey = 'octopus.theme';

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

const ThemeContext = createContext<{
  preference: Accessor<ThemePreference>;
  setPreference: (value: ThemePreference) => void;
}>();

export function ThemeProvider(props: ParentProps) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const [preference, updatePreference] = createSignal<ThemePreference>(readPreference());
  const [systemDark, setSystemDark] = createSignal(media.matches);
  const onSystemChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) updatePreference(readPreference());
  };
  media.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  onCleanup(() => {
    media.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  });
  createEffect(() => {
    const resolved = preference() === 'system' ? (systemDark() ? 'dark' : 'light') : preference();
    document.documentElement.dataset.theme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#171827' : '#fffbf6');
  });
  function setPreference(value: ThemePreference) {
    updatePreference(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // A blocked store only affects persistence, not the current theme.
    }
  }
  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is required.');
  return context;
}
