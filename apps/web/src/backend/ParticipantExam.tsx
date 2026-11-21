import { useParams } from '@solidjs/router';
import { createSignal, For, Show } from 'solid-js';
import { call } from './client';
import type { StudentQuestionV1 } from '../features/question-import/question-contract';
import RichText from '../features/student-preview/RichText';
type Session = { attempt: string; title: string; questions: StudentQuestionV1[] };
export default function ParticipantExam() {
  const params = useParams();
  const [session, setSession] = createSignal<Session>();
  const [answers, setAnswers] = createSignal<Record<string, string>>({});
  const [message, setMessage] = createSignal('');
  const [done, setDone] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  let name!: HTMLInputElement;
  async function act() {
    if (busy()) return;
    setBusy(true);
    try {
      const active = session();
      if (active) {
        await call('submit_exam', {
          attempt: active.attempt,
          responses: answers(),
        });

        setDone(true);
        setMessage('Jawaban terkirim.');
      } else {
        const data = await call<Session>('start_exam', {
          exam: params.id,
          participant_name: name.value,
        });

        setSession(data);
        setMessage('');
      }
    } catch {
      setMessage('Permintaan gagal. Periksa koneksi dan jadwal ujian.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main class="page">
      <h1>{session()?.title ?? 'Masuk ujian'}</h1>
      <p role="status">{message()}</p>
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
              <label>
                Nama peserta
                <input ref={name} required maxlength={100} />
              </label>
            }
          >
            {(active) => (
              <For each={active().questions}>
                {(q) => (
                  <fieldset>
                    <legend>Soal {active().questions.indexOf(q) + 1}</legend>
                    <RichText content={q.content} />
                    <For each={q.options}>
                      {(o) => (
                        <label>
                          <input
                            type="radio"
                            name={q.id}
                            onChange={() => setAnswers({ ...answers(), [q.id]: o.id })}
                          />
                          <RichText content={o.content} />
                        </label>
                      )}
                    </For>
                  </fieldset>
                )}
              </For>
            )}
          </Show>
          <button disabled={busy()}>{session() ? 'Kirim jawaban' : 'Mulai ujian'}</button>
        </form>
      </Show>
    </main>
  );
}
