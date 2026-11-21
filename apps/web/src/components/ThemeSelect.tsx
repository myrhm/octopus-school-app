import ChevronDown from 'lucide-solid/icons/chevron-down';
import Monitor from 'lucide-solid/icons/monitor';
import { useTheme } from '../app/theme';
import type { ThemePreference } from '../app/theme';
import { createSignal } from 'solid-js';

export default function ThemeSelect() {
  const theme = useTheme();
  const [pointerFocus, setPointerFocus] = createSignal(false);
  return (
    <label class="theme-select">
      <Monitor size={18} aria-hidden="true" />
      <span class="sr-only">Tema tampilan</span>
      <select
        data-pointer-focus={pointerFocus() ? 'true' : undefined}
        onPointerDown={() => setPointerFocus(true)}
        onKeyDown={() => setPointerFocus(false)}
        onBlur={() => setPointerFocus(false)}
        value={theme.preference()}
        onChange={(event) => theme.setPreference(event.currentTarget.value as ThemePreference)}
      >
        <option value="system">Ikuti sistem</option>
        <option value="light">Terang</option>
        <option value="dark">Gelap</option>
      </select>
      <ChevronDown size={14} aria-hidden="true" class="select-chevron" />
    </label>
  );
}
