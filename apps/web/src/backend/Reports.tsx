import RichText from '../features/student-preview/RichText';
import type { JSONContent } from '@tiptap/core';
import { createResource, createSignal, For, Show, onCleanup, onMount } from 'solid-js';
import { call } from './client';
import Button from '../components/ui/Button';
type Attempt = {
  id: string;
  answers?: Record<string, unknown>;
  score?: {
    percent: number | null;
    revision: number;
    marks: Record<string, number | null>;
    audit: { reason: string; points: number; at: string }[];
  };
  progress?: number;
  participant: string;
  locked: boolean;
  correct_count: number | null;
  submitted_at: string | null;
};
type Exam = {
  id: string;
  questions?: { id: string; content: JSONContent[]; weight: number }[];
  passMark?: number;
  subject?: string;
  className?: string;
  title: string;
  state: string;
  restricted: boolean;
  accessMode?: string;
  released: boolean;
  events?: { type: string; participant: string; at: string }[];
  attempts: Attempt[];
};
function exportCsv(exams: Exam[]) {
  const escape = (value: unknown) =>
    '"' +
    String(value ?? '')
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const rows = [
    ['Ujian', 'Peserta', 'Jawaban benar', 'Nilai (%)', 'Dikirim'],
    ...exams.flatMap((e) =>
      e.attempts.map((a) => [
        e.title,
        a.participant,
        a.correct_count,
        a.score?.percent,
        a.submitted_at,
      ]),
    ),
  ];
  const url = URL.createObjectURL(
    new Blob(['\ufeff' + rows.map((row) => row.map(escape).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hasil-ujian.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Report(props: { grades: boolean }) {
  const [exams, { refetch }] = createResource(() => call<Exam[]>('exams'));
  const [message, setMessage] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  onMount(() => {
    const timer = setInterval(() => {
      if (!document.hidden && !exams.loading) void refetch();
    }, 30000);
    onCleanup(() => clearInterval(timer));
  });
  async function refreshResults() {
    if (busy()) return;
    setBusy(true);
    setMessage('Memperbarui hasil…');
    try {
      await refetch();
      setMessage('Hasil diperbarui. Jawaban sesi yang waktunya habis sudah diproses.');
    } catch {
      setMessage('Hasil belum dapat diperbarui. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  }
  async function action(name: string, body: Record<string, unknown>) {
    if (busy()) return;
    setBusy(true);
    setMessage('Menyimpan…');
    try {
      await call(name, body);
      await refetch();
      setMessage('Perubahan tersimpan.');
    } catch {
      setMessage('Perubahan gagal. Periksa koneksi dan coba lagi.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section class="page exam-manager">
      <h1>{props.grades ? 'Nilai dan analisis' : 'Monitoring ujian'}</h1>
      <p role="status">{message()}</p>
      <Button
        variant="secondary"
        disabled={busy() || exams.loading}
        onClick={() => void refreshResults()}
      >
        Perbarui hasil
      </Button>
      <Show when={props.grades}>
        <Button
          disabled={!exams()?.length}
          onClick={() => {
            exportCsv(exams() ?? []);
            setMessage('File CSV siap diunduh.');
          }}
        >
          Ekspor CSV
        </Button>
      </Show>
      <For each={exams()} fallback={<p>{exams.loading ? 'Memuat ujian…' : 'Belum ada ujian.'}</p>}>
        {(e) => (
          <article class="panel">
            <p>{[e.subject, e.className].filter(Boolean).join(' · ')}</p>
            <h2>{e.title || 'Ujian'}</h2>
            <p>
              {e.attempts.length} peserta · {e.attempts.filter((a) => a.submitted_at).length}{' '}
              selesai
            </p>
            <Show
              when={props.grades}
              fallback={
                <>
                  <Show when={e.restricted && e.accessMode !== 'credentials'}>
                    <Button
                      onClick={() =>
                        void call<string>('credential', { id: e.id })
                          .then((code) => setMessage('Kode peserta: ' + code))
                          .catch(() => setMessage('Gagal membuat kode.'))
                      }
                    >
                      Buat kode peserta
                    </Button>
                  </Show>
                  <label>
                    Status ujian
                    <select
                      class="text-input"
                      disabled={busy()}
                      value={e.state}
                      onChange={(ev) =>
                        void action('manage_exam', { id: e.id, state: ev.currentTarget.value })
                      }
                    >
                      <option value="open">Terbuka sesuai jadwal</option>
                      <option value="paused">Dijeda</option>
                      <option value="closed">Ditutup</option>
                      <option value="archived">Diarsipkan</option>
                    </select>
                  </label>
                </>
              }
            >
              <Button
                disabled={busy()}
                onClick={() => void action('manage_exam', { id: e.id, released: !e.released })}
              >
                {e.released ? 'Sembunyikan nilai' : 'Rilis nilai'}
              </Button>
            </Show>
            <Show when={props.grades}>
              <p>
                {(() => {
                  const scores = e.attempts
                    .flatMap((a) => (typeof a.score?.percent === 'number' ? [a.score.percent] : []))
                    .sort((a, b) => a - b);
                  if (!scores.length) return 'Belum ada nilai final.';
                  const mid = Math.floor(scores.length / 2);
                  return (
                    'Rata-rata ' +
                    Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) +
                    ' · Median ' +
                    (scores[mid]! + scores[Math.floor((scores.length - 1) / 2)]!) / 2 +
                    ' · Rentang ' +
                    scores[0] +
                    '–' +
                    scores.at(-1)
                  );
                })()}
              </p>
            </Show>
            <Show when={props.grades}>
              <p>
                {
                  e.attempts.filter(
                    (a) => a.score?.percent != null && a.score.percent >= (e.passMark ?? 70),
                  ).length
                }{' '}
                peserta lulus · Batas {e.passMark ?? 70}%
              </p>
            </Show>
            <Show when={props.grades && e.attempts.some((a) => a.score?.percent != null)}>
              <details>
                <summary>Statistik soal dan peringkat</summary>
                <For each={e.questions}>
                  {(q, i) => (
                    <p>
                      Soal {i() + 1}:{' '}
                      {e.attempts.filter((a) => a.score?.marks[q.id] === q.weight).length} peserta
                      mendapat poin penuh
                    </p>
                  )}
                </For>
                <ol>
                  <For
                    each={e.attempts
                      .filter((a) => a.score?.percent != null)
                      .sort((a, b) => b.score!.percent! - a.score!.percent!)}
                  >
                    {(a) => (
                      <li>
                        {a.participant} · {a.score!.percent}%
                      </li>
                    )}
                  </For>
                </ol>
                <p>Distribusi nilai</p>
                <For
                  each={
                    [
                      [0, 49],
                      [50, 69],
                      [70, 89],
                      [90, 100],
                    ] as const
                  }
                >
                  {(range) => (
                    <p>
                      {range[0]}–{range[1]}:{' '}
                      {
                        e.attempts.filter(
                          (a) =>
                            a.score?.percent != null &&
                            a.score.percent >= range[0] &&
                            a.score.percent <= range[1],
                        ).length
                      }{' '}
                      peserta
                    </p>
                  )}
                </For>
              </details>
            </Show>
            <For each={e.attempts}>
              {(a) => (
                <div>
                  <strong>{a.participant}</strong> ·{' '}
                  {a.submitted_at
                    ? (a.correct_count ?? 0) + ' benar'
                    : a.locked
                      ? 'Dikunci'
                      : 'Mengerjakan · ' + (a.progress ?? 0) + ' soal dijawab'}
                  <Show when={props.grades && a.submitted_at}>
                    <details>
                      <summary>
                        Nilai {a.score?.percent ?? 'menunggu koreksi'} · Tinjau jawaban
                      </summary>
                      <For each={e.questions}>
                        {(q, index) => (
                          <form
                            onSubmit={(ev) => {
                              ev.preventDefault();
                              const data = new FormData(ev.currentTarget);
                              void action('adjust_grade', {
                                exam: e.id,
                                id: a.id,
                                question: q.id,
                                points: Number(data.get('points')),
                                reason: data.get('reason'),
                                expected: a.score?.revision ?? 0,
                              });
                            }}
                          >
                            <strong>Soal {index() + 1}</strong>
                            <RichText content={q.content} />
                            <p>Jawaban: {String(a.answers?.[q.id] ?? 'Kosong')}</p>
                            <label>
                              Poin (maks. {q.weight})
                              <input
                                name="points"
                                type="number"
                                min="0"
                                max={q.weight}
                                step="any"
                                required
                                value={a.score?.marks[q.id] ?? ''}
                              />
                            </label>
                            <label>
                              Alasan koreksi
                              <input name="reason" required maxlength="500" />
                            </label>
                            <Button type="submit" disabled={busy()}>
                              Simpan koreksi
                            </Button>
                          </form>
                        )}
                      </For>
                      <For each={a.score?.audit}>
                        {(item) => (
                          <p>
                            {item.reason} · {item.points} poin
                          </p>
                        )}
                      </For>
                    </details>
                  </Show>
                  <Show when={!props.grades && !a.submitted_at}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const warning = window.prompt('Pesan untuk peserta');
                        if (warning?.trim())
                          void action('warn_attempt', { exam: e.id, id: a.id, warning });
                      }}
                    >
                      Kirim peringatan
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (window.confirm('Cabut akses peserta ini secara permanen?'))
                          void action('revoke_attempt', { exam: e.id, id: a.id });
                      }}
                    >
                      Cabut sesi
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy()}
                      onClick={() =>
                        void action('lock_attempt', { exam: e.id, id: a.id, locked: !a.locked })
                      }
                    >
                      {a.locked ? 'Buka akses' : 'Kunci akses'}
                    </Button>
                  </Show>
                </div>
              )}
            </For>
            <Show when={!props.grades && e.events?.length}>
              <details>
                <summary>Riwayat intervensi</summary>
                <For each={e.events}>
                  {(event) => (
                    <p>
                      {event.participant} · {event.type} ·{' '}
                      {new Date(event.at).toLocaleString('id-ID')}
                    </p>
                  )}
                </For>
              </details>
            </Show>
          </article>
        )}
      </For>
    </section>
  );
}
export function Monitoring() {
  return <Report grades={false} />;
}
export function Grades() {
  return <Report grades />;
}
