import Button from '../components/ui/Button';
import { useParams } from '@solidjs/router';
import { createResource, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { participantCall } from './participant-client';
import type { StudentQuestionV1 } from '../features/question-import/question-contract';
import RichText from '../features/student-preview/RichText';
type Session = {
  deadline?: number;
  submitted?: boolean;
  answers?: Record<string, string | string[]>;
  revision?: number;
  instructions?: string;
  title: string;
  questions: (StudentQuestionV1 & { kind?: string })[];
};
export default function ParticipantExam() {
  const params = useParams();
  const call = <T,>(action: string, input: Record<string, unknown>) =>
    participantCall<T>(params.id!, action, input);
  const [entry, { refetch: reloadEntry }] = createResource(
    () => params.id,
    () => call<{ accessMode: string }>('exam_entry', {}),
  );
  const [showPassword, setShowPassword] = createSignal(false);
  let participantId!: HTMLInputElement;
  let password!: HTMLInputElement;
  const [session, setSession] = createSignal<Session>();
  const [answers, setAnswers] = createSignal<Record<string, string | string[]>>({});
  const [message, setMessage] = createSignal('');
  const [restriction, setRestriction] = createSignal('');
  const [warning, setWarning] = createSignal('');
  const [done, setDone] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  let code!: HTMLInputElement;
  let name!: HTMLInputElement;
  const [review, setReview] = createSignal<string[]>([]);
  const [now, setNow] = createSignal(Date.now());
  const [revision, setRevision] = createSignal(0);
  let acknowledged = 0,
    saving = false;
  const cacheKey = () => 'octopus-attempt:' + params.id;
  function remember() {
    sessionStorage.setItem(
      cacheKey(),
      JSON.stringify({
        session: session(),
        done: done(),
        answers: answers(),
        review: review(),
        revision: revision(),
      }),
    );
  }
  async function sync() {
    const active = session();
    if (!active || done() || saving || acknowledged >= revision()) return;
    saving = true;
    try {
      while (acknowledged < revision() && !done()) {
        const current = revision();
        await call('save_answers', {
          responses: answers(),
          revision: current,
        });
        acknowledged = current;
      }
      if (!done() && !busy()) setMessage('Jawaban tersimpan.');
    } catch {
      if (!done()) setMessage('Jawaban ada di tab ini. Sinkronisasi akan dicoba kembali.');
    } finally {
      saving = false;
    }
  }
  function answer(id: string, value: string | string[]) {
    setAnswers({ ...answers(), [id]: value });
    setRevision(revision() + 1);
    remember();
    setMessage('Menyimpan jawaban…');
    void sync();
  }
  onMount(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey()) ?? 'null');
      if (cached?.session && !cached.session.attempt) {
        setSession(cached.session);
        setDone(!!cached.done);
        setAnswers(cached.answers);
        setRevision(cached.revision);
        setReview(cached.review);
        void sync();
      }
    } catch {
      sessionStorage.removeItem(cacheKey());
    }
    if (!session()) {
      setBusy(true);
      void call<Session>('resume_exam', {})
        .then((restored) => {
          setSession(restored);
          setAnswers(restored.answers ?? {});
          setRevision(restored.revision ?? 0);
          acknowledged = revision();
          setDone(!!restored.submitted);
          remember();
          setMessage('Sesi dipulihkan.');
        })
        .catch((e) => {
          if (e.code !== 401) setMessage('Sesi sebelumnya belum dapat dipulihkan.');
        })
        .finally(() => setBusy(false));
    }
    const timer = setInterval(() => {
      setNow(Date.now());
      if (!busy() && now() < (session()?.deadline ?? Infinity)) void sync();
    }, 3000);
    const poll = setInterval(async () => {
      const active = session();
      if (!active || done()) return;
      try {
        const state = await call<{ locked: boolean; state: string; warning: string }>(
          'attempt_status',
          {},
        );
        setWarning(state.warning);
        setRestriction(
          state.locked
            ? 'Guru mengunci sesi ini.'
            : state.state !== 'open'
              ? 'Ujian dijeda atau ditutup oleh guru.'
              : '',
        );
      } catch (e) {
        if (e instanceof Error && 'code' in e && e.code === 403)
          setRestriction('Akses sesi dicabut.');
      }
    }, 10000);
    onCleanup(() => {
      clearInterval(timer);
      clearInterval(poll);
    });
  });
  const expired = () => now() >= (session()?.deadline ?? Infinity);
  async function showResult() {
    try {
      const result = await call<{ correct: number; percent: number | null } | null>(
        'released_result',
        {},
      );
      setMessage(
        result
          ? result.percent == null
            ? 'Menunggu koreksi guru.'
            : 'Nilai: ' + result.percent + '%'
          : 'Guru belum merilis nilai.',
      );
    } catch {
      setMessage('Nilai belum tersedia.');
    }
  }
  async function act() {
    if (busy()) return;
    if (
      session() &&
      !window.confirm(
        'Kirim jawaban sekarang? ' +
          (session()!.questions.length -
            Object.values(answers()).filter((v) => (typeof v === 'string' ? v.trim() : v.length))
              .length) +
          ' soal belum dijawab.',
      )
    )
      return;
    setBusy(true);
    setMessage(session() ? 'Mengirim jawaban…' : 'Memulai ujian…');
    try {
      const active = session();
      if (active) {
        await call('submit_exam', {
          responses: answers(),
        });

        setDone(true);
        remember();
        setMessage('Jawaban terkirim.');
      } else {
        const data = await call<Session>('start_exam', {
          exam: params.id,
          participant_name: name?.value ?? '',
          code: code?.value ?? '',
          participantId: participantId?.value ?? '',
          password: password?.value ?? '',
        });

        setSession(data);
        setAnswers(data.answers ?? {});
        setRevision(data.revision ?? 0);
        acknowledged = data.revision ?? 0;
        setDone(!!data.submitted);
        remember();
        setMessage('Ujian dimulai.');
      }
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      setMessage(
        code === 401
          ? 'ID peserta atau password tidak sesuai. Periksa kembali data dari guru.'
          : code === 409
            ? 'Peserta sudah memiliki sesi. Gunakan tab/perangkat sebelumnya, atau minta guru mereset password untuk pindah perangkat.'
            : code === 429
              ? 'Terlalu banyak percobaan masuk. Tunggu satu menit sebelum mencoba kembali.'
              : 'Permintaan gagal. Periksa koneksi, jadwal, atau hubungi guru jika akses dicabut.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main class="page participant-exam">
      <h1>{session()?.title ?? 'Masuk ujian'}</h1>
      <p role="status">{message()}</p>
      <Show when={warning()}>
        <p role="alert">Pesan guru: {warning()}</p>
      </Show>
      <Show when={restriction()}>
        <p role="status">{restriction()}</p>
      </Show>
      <Show when={done() || expired()}>
        <Button onClick={() => void showResult()}>Lihat hasil</Button>
      </Show>
      <Show when={!done()}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act();
          }}
        >
          <Show
            when={session()}
            fallback={
              <>
                <Show when={entry.error}>
                  <p role="alert">
                    Informasi akses ujian belum dapat dimuat. Periksa koneksi atau tautan dari guru.
                  </p>
                  <Button type="button" variant="secondary" onClick={() => void reloadEntry()}>
                    Coba lagi
                  </Button>
                </Show>
                <Show when={!entry.loading && !entry.error}>
                  <Show
                    when={entry()?.accessMode === 'credentials'}
                    fallback={
                      <>
                        <label class="field">
                          Nama peserta
                          <input
                            class="text-input"
                            name="participant"
                            autocomplete="name"
                            ref={name}
                            required
                            maxlength={100}
                          />
                        </label>
                        <Show when={entry()?.accessMode === 'legacy'}>
                          <label class="field">
                            Kode peserta
                            <input ref={code} class="text-input" required />
                          </label>
                        </Show>
                      </>
                    }
                  >
                    <label class="field">
                      ID peserta
                      <input
                        class="text-input"
                        ref={participantId}
                        autocomplete="username"
                        autocapitalize="characters"
                        spellcheck={false}
                        required
                        maxlength={40}
                      />
                    </label>
                    <label class="field">
                      Password peserta
                      <input
                        class="text-input"
                        ref={password}
                        type={showPassword() ? 'text' : 'password'}
                        autocomplete="current-password"
                        required
                        maxlength={128}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      type="button"
                      aria-pressed={showPassword()}
                      onClick={() => setShowPassword(!showPassword())}
                    >
                      {showPassword() ? 'Sembunyikan password' : 'Tampilkan password'}
                    </Button>
                    <p class="field-hint">
                      Gunakan ID dan password yang dibagikan guru. Jika hilang atau perlu pindah
                      perangkat, hubungi guru untuk reset password.
                    </p>
                  </Show>
                </Show>
              </>
            }
          >
            {(active) => (
              <>
                <p>{active().instructions}</p>
                <Show when={active().deadline}>
                  <p>
                    {expired()
                      ? 'Waktu ujian selesai.'
                      : 'Sisa waktu: ' + Math.ceil((active().deadline! - now()) / 60000) + ' menit'}
                  </p>
                </Show>
                <For each={active().questions}>
                  {(q) => (
                    <fieldset disabled={expired() || busy() || !!restriction()}>
                      <legend>Soal {active().questions.indexOf(q) + 1}</legend>
                      <RichText attempt={params.id!} content={q.content} />
                      <Show
                        when={q.kind === 'short' || q.kind === 'essay'}
                        fallback={
                          <For each={q.options}>
                            {(o) => (
                              <label>
                                <input
                                  type={q.kind === 'multiple' ? 'checkbox' : 'radio'}
                                  name={q.id}
                                  checked={
                                    q.kind === 'multiple'
                                      ? (answers()[q.id] ?? []).includes(o.id)
                                      : answers()[q.id] === o.id
                                  }
                                  onChange={(ev) => {
                                    if (q.kind !== 'multiple') {
                                      answer(q.id, o.id);
                                      return;
                                    }
                                    const old = (answers()[q.id] ?? []) as string[];
                                    answer(
                                      q.id,
                                      ev.currentTarget.checked
                                        ? [...old, o.id]
                                        : old.filter((id) => id !== o.id),
                                    );
                                  }}
                                />
                                <RichText attempt={params.id!} content={o.content} />
                              </label>
                            )}
                          </For>
                        }
                      >
                        <label>
                          Jawaban
                          <textarea
                            class="text-input"
                            maxlength={10000}
                            value={String(answers()[q.id] ?? '')}
                            onInput={(e) => answer(q.id, e.currentTarget.value)}
                          />
                        </label>
                      </Show>
                      <label>
                        <input
                          type="checkbox"
                          checked={review().includes(q.id)}
                          onChange={(e) => {
                            setReview(
                              e.currentTarget.checked
                                ? [...review(), q.id]
                                : review().filter((id) => id !== q.id),
                            );
                            remember();
                          }}
                        />
                        Tandai untuk ditinjau
                      </label>
                    </fieldset>
                  )}
                </For>
              </>
            )}
          </Show>
          <Button
            type="submit"
            disabled={
              busy() ||
              expired() ||
              !!restriction() ||
              (!session() && (entry.loading || !!entry.error))
            }
          >
            {session() ? 'Kirim jawaban' : 'Mulai ujian'}
          </Button>
        </form>
      </Show>
    </main>
  );
}
