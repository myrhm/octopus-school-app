import { BankContents } from './BankLibrary';
import { uploadMedia } from './media';
import Button from '../components/ui/Button';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { call, school } from './client';
import { useSchoolSession } from './SchoolGate';
import ParticipantCredentials from './ParticipantCredentials';
import Trash from 'lucide-solid/icons/trash';
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
  const [copied, setCopied] = createSignal<string[]>([]);
  const localDrafts = () =>
    local.error ? [] : (local() ?? []).filter((d) => d.formatVersion !== 3);
  const inSchool = (id: string) =>
    copied().includes(id) || (drafts()?.some((d) => d.id === id) ?? false);
  const updatedLabel = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Waktu perubahan tidak tersedia'
      : 'Diperbarui ' + date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  };
  const [bank, { refetch: reloadBank }] = createResource(() =>
    call<{ id: string; title: string }[]>('bank'),
  );
  const [exams, { refetch: reloadExams }] = createResource(() =>
    call<
      {
        id: string;
        title: string;
        subject?: string;
        className?: string;
        state?: string;
        accessMode?: string;
        restricted?: boolean;
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
  const session = useSchoolSession();
  const emptyForm = () => ({
    bankId: '',
    start: '',
    end: '',
    subject: '',
    className: '',
    passMark: '70',
    minutes: '60',
    instructions: '',
    accessMode: 'open',
    questionIds: undefined as string[] | undefined,
  });
  const [form, setForm] = createSignal(emptyForm());
  const [cacheMessage, setCacheMessage] = createSignal('');
  let cacheKey = '';
  createEffect(() => {
    const key =
      session.user()?.$id && school()
        ? 'octopus-schedule-v1:' + session.user()!.$id + ':' + school()
        : '';
    if (key === cacheKey) return;
    cacheKey = key;
    let restored = emptyForm();
    setCacheMessage('');
    try {
      const saved = key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null;
      if (saved && typeof saved === 'object') {
        for (const field of [
          'bankId',
          'start',
          'end',
          'subject',
          'className',
          'passMark',
          'minutes',
          'instructions',
          'accessMode',
        ] as const)
          if (typeof saved[field] === 'string') restored[field] = saved[field];
        if (
          Array.isArray(saved.questionIds) &&
          saved.questionIds.every((id: unknown) => typeof id === 'string')
        )
          restored.questionIds = saved.questionIds;
        setCacheMessage('Isian jadwal sebelumnya dipulihkan di perangkat ini.');
      }
    } catch {
      setCacheMessage(
        'Penyimpanan lokal tidak tersedia. Isian dipertahankan selama halaman ini terbuka.',
      );
    }
    setForm(restored);
  });
  function change(patch: Partial<ReturnType<typeof emptyForm>>) {
    const next = { ...form(), ...patch };
    if (!next.bankId) next.bankId = bank()?.[0]?.id ?? '';
    setForm(next);
    try {
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify(next));
        setCacheMessage('Isian jadwal disimpan di perangkat ini.');
      }
    } catch {
      setCacheMessage('Isian belum tersimpan di perangkat. Jangan tutup halaman sebelum selesai.');
    }
  }
  let draft!: HTMLSelectElement;
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
    const values = form();
    const bankId = values.bankId || bank()?.[0]?.id;
    if (!bankId || !bank()?.some((b) => b.id === bankId))
      throw new Error('Pilih versi soal yang masih tersedia.');
    if (!values.start || !values.end || values.end <= values.start)
      throw new Error('Waktu selesai harus setelah waktu mulai.');
    change({ bankId });
    await call('schedule', {
      bank_id: bankId,
      questionIds: values.questionIds,
      accessMode: values.accessMode,
      subject: values.subject,
      className: values.className,
      passMark: Number(values.passMark),
      minutes: Number(values.minutes),
      instructions: values.instructions,
      opens_at: new Date(values.start).toISOString(),
      closes_at: new Date(values.end).toISOString(),
    });
    await reloadExams();
  }
  return (
    <section class="page exam-manager">
      <h1>Pengelolaan ujian</h1>
      <Show when={localDrafts().length}>
        <section class="panel local-drafts-panel" aria-labelledby="local-drafts-title">
          <div>
            <h2 id="local-drafts-title">Draft di browser ini</h2>
            <p class="field-hint">
              Ada {localDrafts().length} draft lokal. Salin draft yang ingin digunakan ke sekolah;
              salinan di browser tetap tersimpan.
            </p>
          </div>
          <ol class="local-draft-list">
            <For each={localDrafts()}>
              {(d) => (
                <li class="local-draft-row">
                  <div class="local-draft-info">
                    <h3>{d.title.trim() || 'Draft tanpa nama'}</h3>
                    <p class="field-hint">
                      {d.questionCount ?? 0} soal · {updatedLabel(d.updatedAt)}
                    </p>
                  </div>
                  <div class="local-draft-action">
                    <Button
                      variant="secondary"
                      disabled={drafts.loading || busy(d.id) || inSchool(d.id)}
                      onClick={() =>
                        void run(
                          d.id,
                          'Menyalin draft…',
                          'Draft berhasil disalin. Buka dari Bank soal untuk melanjutkan.',
                          async () => {
                            try {
                              await importLocalRecord(d);
                            } catch (error) {
                              if (
                                error instanceof Error &&
                                (error instanceof TypeError ||
                                  /failed to fetch|networkerror|network request failed/i.test(
                                    error.message,
                                  ) ||
                                  ('code' in error && error.code === 0))
                              )
                                throw new Error(
                                  'Draft belum tersalin. Periksa koneksi, lalu coba lagi.',
                                );
                              throw error;
                            }
                            setCopied((ids) => [...ids, d.id]);
                            await refreshDrafts();
                          },
                        )
                      }
                    >
                      {busy(d.id)
                        ? 'Menyalin…'
                        : inSchool(d.id)
                          ? 'Sudah ada di sekolah'
                          : 'Salin ke sekolah'}
                    </Button>
                  </div>
                  <Feedback id={d.id} />
                </li>
              )}
            </For>
          </ol>
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
      <section class="panel exam-schedule-panel" aria-labelledby="schedule-title">
        <div>
          <h2 id="schedule-title">Jadwalkan ujian</h2>
          <p class="field-hint">
            Pilih versi soal, waktu pelaksanaan, dan cara siswa masuk. Waktu mengikuti zona
            perangkat: {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </p>
        </div>
        <form
          class="exam-schedule-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              'schedule',
              'Menyimpan jadwal…',
              'Ujian terjadwal. Isian tetap tersedia; peserta berkredensial dapat ditambahkan di daftar ujian.',
              schedule,
            );
          }}
        >
          <fieldset class="exam-form-section">
            <legend>Soal ujian</legend>
            <label class="field">
              Versi soal
              <select
                class="text-input"
                required
                value={form().bankId || bank()?.[0]?.id || ''}
                onChange={(e) => change({ bankId: e.currentTarget.value, questionIds: undefined })}
              >
                <For each={bank()}>{(b) => <option value={b.id}>{b.title}</option>}</For>
              </select>
            </label>
            <Show when={bank.error}>
              <p role="alert">Versi soal belum dapat dimuat. Isian lainnya tetap tersimpan.</p>
            </Show>
            <Show when={form().bankId && bank() && !bank()!.some((b) => b.id === form().bankId)}>
              <p role="alert">Versi soal sebelumnya tidak tersedia. Pilih versi lain.</p>
            </Show>
            <details class="exam-question-picker">
              <summary>Pilih soal dari versi ini</summary>
              <BankContents
                id={form().bankId || bank()?.[0]?.id || ''}
                selectedIds={form().questionIds}
                onSelection={(questionIds) => change({ questionIds })}
              />
            </details>
          </fieldset>
          <fieldset class="exam-form-section">
            <legend>Jadwal dan durasi</legend>
            <div class="exam-form-grid">
              <label class="field">
                Mulai
                <input
                  class="text-input"
                  required
                  type="datetime-local"
                  value={form().start}
                  onInput={(e) => change({ start: e.currentTarget.value })}
                />
              </label>
              <label class="field">
                Selesai
                <input
                  class="text-input"
                  required
                  type="datetime-local"
                  value={form().end}
                  min={form().start}
                  onInput={(e) => change({ end: e.currentTarget.value })}
                />
              </label>
              <label class="field">
                Durasi (menit)
                <input
                  class="text-input"
                  required
                  type="number"
                  min="1"
                  max="1440"
                  value={form().minutes}
                  onInput={(e) => change({ minutes: e.currentTarget.value })}
                />
              </label>
              <label class="field">
                Batas kelulusan (%)
                <input
                  class="text-input"
                  required
                  type="number"
                  min="0"
                  max="100"
                  value={form().passMark}
                  onInput={(e) => change({ passMark: e.currentTarget.value })}
                />
              </label>
            </div>
            <p class="field-hint">
              Pengerjaan berakhir saat durasi habis atau jadwal selesai, mana yang lebih dahulu.
            </p>
          </fieldset>
          <fieldset class="exam-form-section">
            <legend>Informasi dan akses peserta</legend>
            <div class="exam-form-grid">
              <label class="field">
                Mata pelajaran
                <input
                  class="text-input"
                  maxlength={120}
                  value={form().subject}
                  onInput={(e) => change({ subject: e.currentTarget.value })}
                />
              </label>
              <label class="field">
                Kelas
                <input
                  class="text-input"
                  maxlength={120}
                  value={form().className}
                  onInput={(e) => change({ className: e.currentTarget.value })}
                />
              </label>
            </div>
            <label class="field">
              Instruksi peserta
              <textarea
                class="text-input"
                maxlength={4000}
                rows={4}
                value={form().instructions}
                onInput={(e) => change({ instructions: e.currentTarget.value })}
              />
            </label>
            <label class="field">
              Metode akses
              <select
                class="text-input"
                value={form().accessMode}
                onChange={(e) => change({ accessMode: e.currentTarget.value })}
              >
                <option value="open">Tautan terbuka — siswa mengisi nama</option>
                <option value="credentials">Kredensial — ID peserta dan password</option>
              </select>
            </label>
            <p class="field-hint">
              {form().accessMode === 'credentials'
                ? 'Setelah ujian dibuat, tambahkan daftar siswa dan unduh password melalui Kelola peserta dan password.'
                : 'Siapa pun yang memiliki tautan dapat masuk dengan nama. Nama tidak membuktikan identitas siswa.'}
            </p>
          </fieldset>
          <div class="exam-form-footer">
            <p class="field-hint" role="status">
              {cacheMessage()}
            </p>
            <div class="exam-actions">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Kosongkan seluruh isian jadwal yang tersimpan di perangkat ini?',
                    )
                  )
                    change(emptyForm());
                }}
              >
                Kosongkan isian
              </Button>
              <Button type="submit" disabled={!bank()?.length || busy('schedule')}>
                {busy('schedule') ? 'Menyimpan…' : 'Jadwalkan ujian'}
              </Button>
            </div>
          </div>
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
        <Show when={exams.error}>
          <p role="alert">Daftar ujian belum dapat dimuat. Coba Muat ulang hasil.</p>
        </Show>
        <For
          each={exams()}
          fallback={
            <p class="field-hint">{exams.loading ? 'Memuat ujian…' : 'Belum ada ujian.'}</p>
          }
        >
          {(e) => (
            <article class="exam-list-card">
              <div class="exam-list-heading">
                <div>
                  <h3>{e.title || 'Ujian tanpa judul'}</h3>
                  <p class="field-hint">
                    {[e.subject, e.className].filter(Boolean).join(' / ') ||
                      'Mata pelajaran dan kelas belum diisi'}
                  </p>
                </div>
                <span class="exam-access-badge">
                  {e.accessMode === 'credentials'
                    ? 'ID + password'
                    : e.restricted
                      ? 'Kode peserta lama'
                      : 'Tautan terbuka'}
                </span>
              </div>
              <dl class="exam-time-grid">
                <div>
                  <dt>Mulai</dt>
                  <dd>
                    {new Date(e.opens_at).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Selesai</dt>
                  <dd>
                    {new Date(e.closes_at).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </dd>
                </div>
              </dl>
              <div class="exam-actions">
                <a
                  class="button"
                  data-variant="secondary"
                  href={'/e/' + e.id}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buka tautan peserta
                </a>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void run('link-' + e.id, 'Menyalin…', 'Tautan peserta disalin.', () =>
                      navigator.clipboard.writeText(new URL('/e/' + e.id, location.origin).href),
                    )
                  }
                >
                  Salin tautan
                </Button>
                <Button
                  variant="ghost"
                  aria-label={'Hapus ujian ' + e.title}
                  title="Hapus ujian"
                  disabled={busy('delete-' + e.id)}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Hapus ujian “' +
                          e.title +
                          '”? ' +
                          e.attempts.length +
                          ' pengerjaan tercatat. Tautan dan akses siswa akan dihentikan, termasuk sesi aktif. Ujian disembunyikan; riwayat tetap disimpan di backend.',
                      )
                    )
                      void run(
                        'delete-' + e.id,
                        'Menghapus…',
                        'Ujian dipindahkan ke sampah.',
                        async () => {
                          await call('delete_exam', { id: e.id });
                          await reloadExams();
                        },
                      );
                  }}
                >
                  <Trash size={18} aria-hidden="true" />
                </Button>
              </div>
              <Feedback id={'link-' + e.id} />
              <Feedback id={'delete-' + e.id} />
              <Show when={e.accessMode === 'credentials'}>
                <ParticipantCredentials examId={e.id} />
              </Show>
              <p class="field-hint">{e.attempts.length} pengerjaan tercatat</p>
              <For each={e.attempts}>
                {(a) => (
                  <p>
                    {a.participant} —{' '}
                    {a.submitted_at
                      ? a.correct_count == null
                        ? 'Menunggu koreksi'
                        : a.correct_count + ' benar'
                      : 'Sedang mengerjakan'}
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
