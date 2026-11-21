import { backend } from '../backend/client';
import { A, useParams } from '@solidjs/router';
import { createResource, Show, Suspense } from 'solid-js';
import { loadDraft } from '../features/question-import/draft-store';
import QuestionWorkspace from '../features/question-import/QuestionWorkspace';

export default function QuestionImportPage() {
  const params = useParams<{ id: string }>();
  const [draft] = createResource(() => params.id, loadDraft);
  return (
    <Suspense
      fallback={
        <p class="page" role="status">
          Membuka draft…
        </p>
      }
    >
      <Show
        when={!draft.error}
        fallback={
          <section class="page">
            <h1>Draft belum dapat dibuka</h1>
            <p role="alert">Penyimpanan browser tidak tersedia. Data draft tidak diubah.</p>
            <A href="/bank-soal">Kembali ke bank soal</A>
          </section>
        }
      >
        <Show
          when={draft()}
          keyed
          fallback={
            <section class="page">
              <h1>Draft tidak ditemukan</h1>
              <p>
                {backend
                  ? 'Periksa sekolah aktif dan akses draft Anda.'
                  : 'Draft lokal hanya tersedia pada browser tempat Anda membuatnya.'}
              </p>
              <p>Jika draft dipindahkan ke Sampah, pulihkan dahulu untuk membukanya.</p>
              <A href="/bank-soal?tampilan=sampah">Buka Sampah</A>
              <A href="/bank-soal">Kembali ke bank soal</A>
            </section>
          }
        >
          {(value) => <QuestionWorkspace draft={value} />}
        </Show>
      </Show>
    </Suspense>
  );
}
