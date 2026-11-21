import { createResource, createSignal, For, Show } from 'solid-js';
import { call } from './client';
import {
  listDrafts,
  listLocalRecords,
  importLocalRecord,
} from '../features/question-import/draft-store';
import { toStudentQuestions } from '../features/question-import/question-contract';

export default function ExamManager() {
  const [message, setMessage] = createSignal('');
  const [drafts, { refetch: refreshDrafts }] = createResource(listDrafts);
  const [local] = createResource(listLocalRecords);
  const [bank, { refetch: reloadBank }] = createResource(() =>
    call<{ id: string; title: string }[]>('bank'),
  );
  const [exams, { refetch: reloadExams }] = createResource(() =>
    call<
      {
        id: string;
        opens_at: string;
        closes_at: string;
        attempts: {
          participant: string;
          submitted_at: string | null;
          correct_count: number | null;
        }[];
      }[]
    >('exams'),
  );
  let draft!: HTMLSelectElement,
    collection!: HTMLSelectElement,
    start!: HTMLInputElement,
    end!: HTMLInputElement;
  async function run(action: () => Promise<void>) {
    try {
      await action();
      setMessage('Tersimpan.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Gagal menyimpan. Periksa akses dan koneksi.',
      );
    }
  }
  async function publish() {
    const source = drafts()?.find((d) => d.id === draft.value);
    if (!source) throw new Error('Pilih draft.');
    const nodes = source.document.content?.filter((n) => n.type === 'question') ?? [];
    const questions = toStudentQuestions(source.document).map((q, i) => ({
      ...q,
      correctOptionId: nodes[i]?.attrs?.correctOptionId,
    }));
    if (
      !questions.length ||
      questions.some((q) => !q.options.some((o) => o.id === q.correctOptionId))
    )
      throw new Error('Lengkapi pilihan dan kunci tiap soal.');
    await call('publish', { title: source.title, questions });
    await reloadBank();
  }
  async function schedule() {
    await call('schedule', {
      bank_id: collection.value,
      opens_at: new Date(start.value).toISOString(),
      closes_at: new Date(end.value).toISOString(),
    });

    await reloadExams();
  }
  async function upload(file: File) {
    if (file.size > 1024 * 1024) throw new Error('Ukuran gambar maksimal 1 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    await call('upload', { name: file.name, mime: file.type, content: btoa(binary) });
  }
  return (
    <main class="page">
      <h1>Pengelolaan ujian</h1>
      <p role="status">{message()}</p>
      <section class="panel">
        <h2>Impor draft perangkat ini</h2>
        <For each={local()}>
          {(d) => (
            <button
              onClick={() =>
                void run(async () => {
                  await importLocalRecord(d);
                  await refreshDrafts();
                })
              }
            >
              Impor {d.title}
            </button>
          )}
        </For>
      </section>
      <section class="panel">
        <h2>Terbitkan ke bank sekolah</h2>
        <label>
          Draft{' '}
          <select ref={draft}>
            <For each={drafts()}>{(d) => <option value={d.id}>{d.title}</option>}</For>
          </select>
        </label>
        <button onClick={() => void run(publish)}>Terbitkan versi</button>
      </section>
      <section class="panel">
        <h2>Media privat sekolah</h2>
        <label>
          Unggah gambar{' '}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void run(() => upload(file));
            }}
          />
        </label>
      </section>
      <section class="panel">
        <h2>Jadwalkan ujian</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(schedule);
          }}
        >
          <label>
            Versi soal{' '}
            <select required ref={collection}>
              <For each={bank()}>{(b) => <option value={b.id}>{b.title}</option>}</For>
            </select>
          </label>
          <label>
            Mulai <input required type="datetime-local" ref={start} />
          </label>
          <label>
            Selesai <input required type="datetime-local" ref={end} />
          </label>
          <button>Jadwalkan</button>
        </form>
      </section>
      <section class="panel">
        <h2>Ujian dan hasil</h2>
        <button onClick={() => void reloadExams()}>Muat ulang hasil</button>
        <For each={exams()}>
          {(e) => (
            <article>
              <a href={'/e/' + e.id}>Buka tautan peserta</a>
              <p>
                {new Date(e.opens_at).toLocaleString()} – {new Date(e.closes_at).toLocaleString()}
              </p>
              <For each={e.attempts}>
                {(a) => (
                  <p>
                    {a.participant} ·{' '}
                    <Show when={a.submitted_at} fallback="Sedang mengerjakan">
                      {a.correct_count} benar
                    </Show>
                  </p>
                )}
              </For>
            </article>
          )}
        </For>
      </section>
    </main>
  );
}
