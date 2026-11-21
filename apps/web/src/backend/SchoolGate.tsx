import { createResource, createSignal, For, Show, onMount, type ParentProps } from 'solid-js';
import { backend, schools as listSchools, school, setSchool } from './client';

export default function SchoolGate(props: ParentProps) {
  const db = backend!;

  const [user, setUser] = createSignal('');
  const [message, setMessage] = createSignal('');
  let email!: HTMLInputElement;
  let password!: HTMLInputElement;
  async function refresh() {
    try {
      setUser((await db.account.get()).$id);
    } catch {
      setSchool('');
      setUser('');
    }
  }
  onMount(() => void refresh());
  const [schools] = createResource(() => user() || false, listSchools);
  async function login(event: SubmitEvent) {
    event.preventDefault();
    try {
      await db.account.createEmailPasswordSession({ email: email.value, password: password.value });
      await refresh();
      setMessage('');
    } catch {
      setMessage('Login gagal. Periksa email dan kata sandi.');
    }
  }
  return (
    <>
      <Show
        when={user()}
        fallback={
          <main class="page">
            <h1>Masuk sebagai guru</h1>
            <form onSubmit={login}>
              <label>
                Email
                <input ref={email} type="email" required autocomplete="username" />
              </label>
              <label>
                Kata sandi
                <input ref={password} type="password" required autocomplete="current-password" />
              </label>
              <button>Masuk</button>
            </form>
          </main>
        }
      >
        <header class="panel">
          <label>
            Sekolah aktif{' '}
            <select value={school()} onChange={(e) => setSchool(e.currentTarget.value)}>
              <option value="">Pilih sekolah</option>
              <For each={schools()}>{(s) => <option value={s.id}>{s.name}</option>}</For>
            </select>
          </label>{' '}
          <button
            onClick={async () => {
              await db.account.deleteSession({ sessionId: 'current' });
              await refresh();
            }}
          >
            Keluar
          </button>
        </header>
        <Show when={school()} keyed>
          {(schoolId) => <div data-school={schoolId}>{props.children}</div>}
        </Show>
        <Show when={!schools.loading && schools()?.length === 0}>
          <p>Akun ini belum terhubung ke sekolah. Hubungi admin sekolah.</p>
        </Show>
      </Show>
      <Show when={message()}>
        <p role="alert">{message()}</p>
      </Show>
    </>
  );
}
