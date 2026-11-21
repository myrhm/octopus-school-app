import { BankContents } from './BankLibrary';
import { uploadMedia } from './media';
import Button from '../components/ui/Button';
import { createResource, createSignal, For, Show } from 'solid-js';
import { call } from './client';
import {
  listDrafts,
  listLocalRecords,
  importLocalRecord,
} from '../features/question-import/draft-store';
import { toStudentQuestions } from '../features/question-import/question-contract';

export default function ExamManager() {
  type Status = { phase: 'busy' | 'success' | 'error'; text: string };
  const [feedback, setFeedback] = createSignal<Record<string, Status>>({});
  const busy = (id: string) => feedback()[id]?.phase === 'busy';
  function Feedback(props: { id: string }) {
    return (
      <p
        class="action-feedback"
        role="status"
        aria-atomic="true"
        data-phase={feedback()[props.id]?.phase}
      >
        {feedback()[props.id]?.text}
      </p>
    );
  }
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
  const [chosen, setChosen] = createSignal('');
  const [ids, setIds] = createSignal<string[]>();
  let draft!: HTMLSelectElement,
    collection!: HTMLSelectElement,
    restricted!: HTMLInputElement,
    subject!: HTMLInputElement,
    className!: HTMLInputElement,
    passMark!: HTMLInputElement,
    minutes!: HTMLInputElement,
    instructions!: HTMLTextAreaElement,
    start!: HTMLInputElement,
    end!: HTMLInputElement;
  async function run(id: string, pending: string, success: string, action: () => Promise<unknown>) {
    if (busy(id)) return;
    const update = (phase: Status['phase'], text: string) =>
      setFeedback((prev) => ({ ...prev, [id]: { phase, text } }));
    update('busy', pending);
    try {
      await action();
      update('success', success);
    } catch (error) {
      update(
        'error',
        error instanceof Error
          ? error.message
          : 'Permintaan gagal. Periksa koneksi lalu coba lagi.',
      );
    }
  }
  async function publish() {
    const source = drafts()?.find((d) => d.id === draft.value);
    if (!source) throw new Error('Pilih draft.');
    const nodes = source.document?.content?.filter((n) => n.type === 'question') ?? [];
    if (!nodes.length) throw new Error('Buka draft dan tambahkan soal sebelum menerbitkan.');
    const questions = toStudentQuestions(source.document).map((q, i) => ({
      ...q,
      kind: nodes[i]?.attrs?.kind ?? 'single',
      weight: nodes[i]?.attrs?.weight ?? 1,
      keys: nodes[i]?.attrs?.keys ?? [],
      accepted: nodes[i]?.attrs?.accepted ?? [],
      correctOptionId: nodes[i]?.attrs?.correctOptionId,
    }));
    if (
      !questions.length ||
      questions.some(
        (q) => q.kind === 'single' && !q.options.some((o) => o.id === q.correctOptionId),
      )
    )
      throw new Error('Lengkapi pilihan dan kunci tiap soal.');
    await call('publish', {
      sourceId: source.id,
      revision: source.revision,
      title: source.title,
      questions,
    });
    await reloadBank();
  }
  async function schedule() {
    if (end.value <= start.value) throw new Error('Waktu selesai harus setelah waktu mulai.');
    await call('schedule', {
      bank_id: collection.value,
      questionIds: ids(),
      restricted: restricted.checked,
      subject: subject.value,
      className: className.value,
      passMark: Number(passMark.value),
      minutes: Number(minutes.value),
      instructions: instructions.value,
      opens_at: new Date(start.value).toISOString(),
      closes_at: new Date(end.value).toISOString(),
    });

    await reloadExams();
  }
  return (
    <section class="page exam-manager">
      <h1>Pengelolaan ujian</h1>
      <Show when={local()?.length}>
        <section class="panel">
          <h2>Impor draft perangkat ini</h2>
          <For each={local()}>
            {(d) => (
              <>
                <Button
                  disabled={busy(d.id)}
                  onClick={() =>
                    void run(
                      d.id,
                      'Mengimpor draft…',
                      'Draft telah diimpor ke sekolah.',
                      async () => {
                        await importLocalRecord(d);
                        await refreshDrafts();
                      },
                    )
                  }
                >
                  Impor {d.title}
                </Button>
                <Feedback id={d.id} />
              </>
            )}
          </For>
        </section>
      </Show>
      <section class="panel">
        <h2>Terbitkan ke bank sekolah</h2>
        <label>
          Draft{' '}
          <select class="text-input" ref={draft}>
            <For each={drafts()}>{(d) => <option value={d.id}>{d.title}</option>}</For>
          </select>
        </label>
        <Button
          disabled={!drafts()?.length || busy('publish')}
          onClick={() =>
            void run(
              'publish',
              'Menerbitkan versi…',
              'Versi soal terbit dan dapat dipilih saat menjadwalkan ujian.',
              publish,
            )
          }
        >
          Terbitkan versi
        </Button>
        <Feedback id="publish" />
      </section>
      <section class="panel">
        <h2>Media privat sekolah</h2>
        <label>
          Unggah gambar{' '}
          <input
            disabled={busy('upload')}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              if (file)
                void run('upload', 'Mengunggah gambar…', file.name + ' berhasil diunggah.', () =>
                  uploadMedia(file),
                );
            }}
          />
        </label>
        <Feedback id="upload" />
      </section>
      <section class="panel">
        <h2>Jadwalkan ujian</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              'schedule',
              'Menyimpan jadwal…',
              'Ujian terjadwal. Tautan peserta tersedia di daftar ujian.',
              schedule,
            );
          }}
        >
          <label>
            Versi soal{' '}
            <select
              class="text-input"
              required
              ref={collection}
              onChange={(e) => {
                setChosen(e.currentTarget.value);
                setIds(undefined);
              }}
            >
              <For each={bank()}>{(b) => <option value={b.id}>{b.title}</option>}</For>
            </select>
          </label>
          <details>
            <summary>Pilih soal dari versi ini</summary>
            <BankContents id={chosen() || bank()?.[0]?.id || ''} onSelection={setIds} />
          </details>
          <label>
            Mulai <input class="text-input" required type="datetime-local" ref={start} />
          </label>
          <label>
            Selesai <input class="text-input" required type="datetime-local" ref={end} />
          </label>
          <label>
            Mata pelajaran
            <input class="text-input" ref={subject} />
          </label>
          <label>
            Kelas
            <input class="text-input" ref={className} />
          </label>
          <label>
            Batas kelulusan (%)
            <input
              class="text-input"
              type="number"
              min="0"
              max="100"
              value="70"
              required
              ref={passMark}
            />
          </label>
          <label>
            Durasi (menit)
            <input
              class="text-input"
              type="number"
              min="1"
              max="1440"
              value="60"
              required
              ref={minutes}
            />
          </label>
          <label>
            Instruksi peserta
            <textarea class="text-input" maxlength={4000} ref={instructions} />
          </label>
          <label>
            <input type="checkbox" ref={restricted} />
            Wajibkan kode peserta
          </label>
          <Button type="submit" disabled={!bank()?.length || busy('schedule')}>
            Jadwalkan
          </Button>
        </form>
        <Feedback id="schedule" />
      </section>
      <section class="panel">
        <h2>Ujian dan hasil</h2>
        <Button
          disabled={busy('refresh')}
          onClick={() =>
            void run('refresh', 'Memuat hasil…', 'Hasil ujian sudah diperbarui.', async () => {
              await reloadExams();
            })
          }
        >
          Muat ulang hasil
        </Button>
        <Feedback id="refresh" />
        <For each={exams()}>
          {(e) => (
            <article>
              <a href={'/e/' + e.id}>Buka tautan peserta</a>
              <p>
                {new Date(e.opens_at).toLocaleString('id-ID')} –{' '}
                {new Date(e.closes_at).toLocaleString('id-ID')}
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
    </section>
  );
}
