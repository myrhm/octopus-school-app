import { A } from '@solidjs/router';
import { onMount } from 'solid-js';
import type { ParentProps } from 'solid-js';
import Brand from '../../components/Brand';
import ThemeSelect from '../../components/ThemeSelect';
import './student-preview.css';

export default function PreviewShell(props: ParentProps) {
  onMount(() => {
    document.title = 'Pratinjau siswa · Octopus';
  });
  return (
    <div class="preview-shell">
      <a class="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <header class="preview-header">
        <div class="preview-header-brand">
          <Brand symbol />
          <A class="text-link" href="/bank-soal">
            Kembali ke bank soal
          </A>
        </div>
        <ThemeSelect />
      </header>
      <main id="main-content" tabindex="-1">
        {props.children}
      </main>
    </div>
  );
}
