import { A } from '@solidjs/router';
import type { ParentProps } from 'solid-js';

export default function AppShell(props: ParentProps) {
  return (
    <div class="app-shell">
      <a class="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <header class="app-header">
        <A class="brand" href="/" aria-label="Octopus — beranda">
          Octopus<span aria-hidden="true">.</span>
        </A>
        <nav aria-label="Navigasi utama">
          <A href="/" end activeClass="is-active">
            Ringkasan
          </A>
          <A href="/bank-soal" activeClass="is-active">
            Bank soal
          </A>
        </nav>
      </header>
      <main id="main-content" tabindex="-1">
        {props.children}
      </main>
      <footer class="app-footer">Octopus · Ruang ujian sekolah</footer>
    </div>
  );
}
