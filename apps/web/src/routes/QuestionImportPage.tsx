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
              <p>Draft lokal hanya tersedia pada browser tempat Anda membuatnya.</p>
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
