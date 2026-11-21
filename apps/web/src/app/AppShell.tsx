import { A, useLocation } from '@solidjs/router';
import { Dialog } from '@kobalte/core/dialog';
import Menu from 'lucide-solid/icons/menu';
import X from 'lucide-solid/icons/x';
import BookOpen from 'lucide-solid/icons/book-open';
import { createEffect, createSignal, For, onCleanup } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { navigation } from './navigation';
import Brand from '../components/Brand';
import ThemeSelect from '../components/ThemeSelect';
import GuideContent from '../components/GuideContent';

import { AccountControls, useSchoolSession } from '../backend/SchoolGate';

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
  const [guideOpen, setGuideOpen] = createSignal(false);
  const session = useSchoolSession();
  createEffect(() => {
    if (session.open()) {
      setMenuOpen(false);
      setGuideOpen(false);
    }
  });
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
    setGuideOpen(false);
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
                    <div class="drawer-account">
                      <AccountControls />
                    </div>
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
            <Dialog open={guideOpen()} onOpenChange={setGuideOpen}>
              <Dialog.Trigger
                class="button header-guide"
                data-variant="ghost"
                aria-label="Panduan penggunaan"
                title="Panduan penggunaan"
                data-active={guideOpen()}
              >
                <BookOpen size={18} aria-hidden="true" />
                <span>Panduan</span>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay class="modal-overlay" />
                <div class="modal-positioner">
                  <Dialog.Content class="modal-content guide-dialog">
                    <header class="guide-dialog-header">
                      <div class="modal-heading">
                        <Dialog.Title>Panduan penggunaan</Dialog.Title>
                        <Dialog.CloseButton class="icon-button" aria-label="Tutup panduan">
                          <X size={20} aria-hidden="true" />
                        </Dialog.CloseButton>
                      </div>
                      <Dialog.Description class="field-hint">
                        Dari membuat akun hingga melihat hasil ujian. Gulir untuk membaca
                        langkah-langkahnya.
                      </Dialog.Description>
                    </header>
                    <div class="guide-dialog-body">
                      <GuideContent />
                    </div>
                  </Dialog.Content>
                </div>
              </Dialog.Portal>
            </Dialog>
            <AccountControls />
            <ThemeSelect />
          </div>
        </header>
        <main id="main-content" tabindex="-1">
          {props.children}
        </main>
      </div>
    </div>
  );
}
