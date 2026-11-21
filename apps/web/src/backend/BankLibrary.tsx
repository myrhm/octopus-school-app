import { createResource, createSignal, For, Show } from 'solid-js';
import { call } from './client';
import RichText from '../features/student-preview/RichText';
import type { QuestionV1 } from '../features/question-import/question-contract';
export function BankContents(props: { id: string; onSelection?: (ids: string[]) => void }) {
  const [set] = createResource(
    () => props.id,
    (id) => call<{ questions: QuestionV1[] }>('bank_detail', { id }),
  );
  return (
    <Show when={!set.error} fallback={<p role="alert">Versi bank belum dapat dimuat.</p>}>
      <Show when={set()} fallback={<p>Memuat soal…</p>}>
        {(data) => {
          let selected = data().questions.map((q) => q.id);
          return (
            <For each={data().questions}>
              {(q, i) => (
                <article>
                  <Show when={props.onSelection} fallback={<strong>Soal {i() + 1}</strong>}>
                    <label>
                      <input
                        type="checkbox"
                        checked
                        onChange={(e) => {
                          selected = e.currentTarget.checked
                            ? [...selected, q.id]
                            : selected.filter((id) => id !== q.id);
                          props.onSelection?.(selected);
                        }}
                      />
                      Gunakan soal {i() + 1}
                    </label>
                  </Show>
                  <RichText content={q.content} />
                </article>
              )}
            </For>
          );
        }}
      </Show>
    </Show>
  );
}
export function BankLibrary() {
  const [message, setMessage] = createSignal('');
  const [bank, { refetch }] = createResource(() =>
    call<
      {
        id: string;
        title: string;
        revision?: number;
        readers?: string[];
        owned?: boolean;
        shared?: boolean;
      }[]
    >('bank'),
  );
  return (
    <section class="panel">
      <h2>Versi terbit</h2>
      <p role="status">{message()}</p>
      <Show when={!bank.error} fallback={<p role="alert">Gagal memuat bank sekolah.</p>}>
        <For
          each={bank()}
          fallback={
            <p>{bank.loading ? 'Memuat bank sekolah…' : 'Belum ada bank yang diterbitkan.'}</p>
          }
        >
          {(item) => {
            const [open, setOpen] = createSignal(false);
            return (
              <details
                onToggle={(event) => {
                  setOpen(event.currentTarget.open);
                }}
              >
                <summary>
                  {item.title}
                  {item.revision ? ' · Revisi ' + item.revision : ''}
                </summary>
                <Show when={item.owned}>
                  <form
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      const data = new FormData(ev.currentTarget);
                      void call('share_bank', {
                        id: item.id,
                        shared: data.has('shared'),
                        readers: String(data.get('readers') ?? '')
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                        .then(() => {
                          setMessage('Izin bank diperbarui.');
                          void refetch();
                        })
                        .catch(() => setMessage('Gagal menyimpan izin.'));
                    }}
                  >
                    <label>
                      <input type="checkbox" name="shared" checked={item.shared} />
                      Bagikan ke sekolah
                    </label>
                    <label>
                      ID guru yang diberi akses (pisahkan dengan koma)
                      <input
                        name="readers"
                        value={item.readers?.join(', ') ?? ''}
                        class="text-input"
                      />
                    </label>
                    <button class="button">Simpan izin</button>
                  </form>
                </Show>
                <Show when={open()}>
                  <BankContents id={item.id} />
                </Show>
              </details>
            );
          }}
        </For>
      </Show>
    </section>
  );
}
