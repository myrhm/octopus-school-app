import {
  createResource,
  createSignal,
  For,
  Show,
  onCleanup,
  onMount,
  type ParentProps,
} from 'solid-js';
import { backend, school, setSchool } from './client';

export default function SchoolGate(props: ParentProps) {
  const db = backend!;
  let currentUser = '';
  const [user, setUser] = createSignal('');
  const [message, setMessage] = createSignal('');
  let email!: HTMLInputElement;
  let password!: HTMLInputElement;
  onMount(() => {
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? '';
      if (currentUser !== next) setSchool('');
      currentUser = next;
      setUser(next);
    });
    onCleanup(() => data.subscription.unsubscribe());
  });
  const [schools] = createResource(user, async () => {
    const result = await db.from('schools').select('id,name').order('name');
    if (result.error) {
      setMessage(result.error.message);
      return [];
    }
    return result.data;
  });
  async function login(event: SubmitEvent) {
    event.preventDefault();
    const result = await db.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    setMessage(result.error?.message ?? '');
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
              const { error } = await db.auth.signOut();
              setMessage(error?.message ?? '');
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
