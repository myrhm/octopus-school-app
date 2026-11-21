import { backend } from '../backend/client';
import { A, useParams } from '@solidjs/router';
import { createResource, Show, Suspense } from 'solid-js';
import Button from '../components/ui/Button';
import StudentPreview from '../features/student-preview/StudentPreview';
import { loadPreview } from '../features/student-preview/load-preview';

export default function StudentPreviewPage() {
  const params = useParams<{ id: string }>();
  const [preview, { refetch }] = createResource(() => params.id, loadPreview);
  return (
    <Suspense
      fallback={
        <p class="page" role="status">
          Membuka pratinjau…
        </p>
      }
    >
      <Show
        when={!preview.error}
        fallback={
          <section class="page">
            <h1>Pratinjau belum dapat dibuka</h1>
            <p role="alert">
              Penyimpanan tidak tersedia atau format draft belum didukung. Data draft tidak diubah.
            </p>
            <Button variant="secondary" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          </section>
        }
      >
        <Show
          when={preview()}
          keyed
          fallback={
            <section class="page">
              <h1>Draft tidak ditemukan</h1>
              <p>
                {backend
                  ? 'Periksa sekolah aktif dan akses draft Anda.'
                  : 'Draft lokal hanya tersedia di browser tempat Anda membuatnya.'}
              </p>
              <A href="/bank-soal">Buka bank soal</A>
            </section>
          }
        >
          {(value) => (
            <StudentPreview
              title={value.title}
              questions={value.questions}
              example={value.example}
            />
          )}
        </Show>
      </Show>
    </Suspense>
  );
}
