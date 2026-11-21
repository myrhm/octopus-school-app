import { A, useLocation } from '@solidjs/router';
import { Dialog } from '@kobalte/core/dialog';
import Menu from 'lucide-solid/icons/menu';
import X from 'lucide-solid/icons/x';
import { createEffect, createSignal, For, onCleanup } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { navigation } from './navigation';
import Brand from '../components/Brand';
import ThemeSelect from '../components/ThemeSelect';
import Badge from '../components/ui/Badge';
import { AccountControls } from '../backend/SchoolGate';

function Navigation(props: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navigasi utama" class="sidebar-nav">
      <For each={navigation}>
        {(item) => (
          <A
            href={item.href}
            end={item.href === '/'}
            activeClass="is-active"
            onClick={() => props.onNavigate?.()}
          >
            <Dynamic component={item.icon} size={20} aria-hidden="true" />
            {item.label}
          </A>
        )}
      </For>
    </nav>
  );
}

export default function AppShell(props: ParentProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = createSignal(false);
  const desktopMedia = window.matchMedia('(min-width: 1024px)');
  const closeDesktopMenu = (event: MediaQueryListEvent) => {
    if (event.matches) setMenuOpen(false);
  };
  desktopMedia.addEventListener('change', closeDesktopMenu);
  onCleanup(() => desktopMedia.removeEventListener('change', closeDesktopMenu));
  createEffect(() => {
    const page = navigation.find(
      (item) =>
        item.href === location.pathname ||
        (item.href !== '/' && location.pathname.startsWith(`${item.href}/`)),
    );
    document.title = page ? `${page.label} · Octopus` : 'Octopus';
    setMenuOpen(false);
  });
  const pageLabel = () =>
    navigation.find(
      (item) =>
        item.href === location.pathname ||
        (item.href !== '/' && location.pathname.startsWith(`${item.href}/`)),
    )?.label ?? 'Octopus';
  return (
    <div class="app-shell">
      <a class="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <aside class="desktop-sidebar">
        <A class="sidebar-brand" href="/" aria-label="Octopus — beranda">
          <Brand />
        </A>
        <p class="nav-caption">RUANG KERJA</p>
        <Navigation />
        <div class="sidebar-note">
          <span class="note-line" />
          Soal tertata.
          <br />
          Ujian lebih sederhana.
        </div>
        <div class="sidebar-bottom">
          <span class="version-label">Octopus · Pratinjau</span>
        </div>
      </aside>
      <div class="workspace">
        <header class="workspace-header">
          <div class="header-context">
            <div class="mobile-menu">
              <Dialog open={menuOpen()} onOpenChange={setMenuOpen}>
                <Dialog.Trigger class="icon-button" aria-label="Buka navigasi">
                  <Menu size={22} aria-hidden="true" />
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay class="modal-overlay mobile-nav-overlay" />
                  <Dialog.Content class="mobile-nav-content">
                    <div class="mobile-nav-heading">
                      <Brand symbol />
                      <Dialog.CloseButton class="icon-button" aria-label="Tutup navigasi">
                        <X size={22} aria-hidden="true" />
                      </Dialog.CloseButton>
                    </div>
                    <Dialog.Title class="mobile-nav-title">Navigasi Octopus</Dialog.Title>
                    <Dialog.Description class="field-hint">
                      Pilih ruang kerja Anda.
                    </Dialog.Description>
                    <Navigation onNavigate={() => setMenuOpen(false)} />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog>
            </div>
            <span class="header-school">Ruang kerja guru</span>
            <span class="header-divider" aria-hidden="true">
              /
            </span>
            <span class="header-page">{pageLabel()}</span>
          </div>
          <div class="workspace-account-actions">
            <AccountControls />
            <ThemeSelect />
          </div>
        </header>
        <main id="main-content" tabindex="-1">
          {props.children}
        </main>
        <footer class="app-footer">
          <span>Disiapkan untuk kegiatan belajar.</span>
          <Badge tone="info">Pratinjau antarmuka</Badge>
        </footer>
      </div>
    </div>
  );
}
