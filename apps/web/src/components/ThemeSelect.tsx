import ChevronDown from 'lucide-solid/icons/chevron-down';
import Monitor from 'lucide-solid/icons/monitor';
import { useTheme } from '../app/theme';
import type { ThemePreference } from '../app/theme';

export default function ThemeSelect() {
  const theme = useTheme();
  return (
    <label class="theme-select">
      <Monitor size={18} aria-hidden="true" />
      <span class="sr-only">Tema tampilan</span>
      <select
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
