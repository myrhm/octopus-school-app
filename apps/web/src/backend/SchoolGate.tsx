import { Dialog } from '@kobalte/core/dialog';
import { ID, AppwriteException, type Models } from 'appwrite';
import {
  createEffect,
  createContext,
  useContext,
  createResource,
  createSignal,
  For,
  Show,
  onMount,
  type ParentProps,
} from 'solid-js';
import { backend, schools as listSchools, school, setSchool } from './client';
import Brand from '../components/Brand';
import Button from '../components/ui/Button';
import X from 'lucide-solid/icons/x';
import Eye from 'lucide-solid/icons/eye';
import EyeOff from 'lucide-solid/icons/eye-off';
import './school-gate.css';

function createSession() {
  const [user, setUser] = createSignal<Models.User<Models.Preferences>>();
  const [checking, setChecking] = createSignal(Boolean(backend));
  const [open, setOpen] = createSignal(false);
  const [mode, setMode] = createSignal<'login' | 'register'>('login');
  const [busy, setBusy] = createSignal(false);
  const [message, setMessage] = createSignal('');
  const [destination, setDestination] = createSignal('');
  const [loginRequired, setLoginRequired] = createSignal(false);
  const [schools, { refetch }] = createResource(() => user()?.$id || false, listSchools);
  createEffect(() => {
    if (!user() || schools.loading || schools.error) return;
    const available = schools() ?? [];
    if (!available.some((item) => item.id === school())) setSchool(available[0]?.id ?? '');
  });
  async function refresh() {
    try {
      setUser(await backend!.account.get());
    } catch {
      setUser(undefined);
      setSchool('');
    } finally {
      setChecking(false);
    }
  }
  function show(next: 'login' | 'register', required = false) {
    setMode(next);
    setMessage('');
    setLoginRequired(required);
    setOpen(true);
  }
  async function logout() {
    if (busy()) return;
    setBusy(true);
    setMessage('');
    try {
      await backend!.account.deleteSession({ sessionId: 'current' });
      setSchool('');
      setUser(undefined);
    } catch {
      setMessage('Gagal keluar. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  }
  return {
    user,
    checking,
    open,
    setOpen,
    mode,
    setMode,
    busy,
    setBusy,
    message,
    setMessage,
    schools,
    refetch,
    refresh,
    show,
    logout,
    destination,
    setDestination,
    loginRequired,
  };
}
const SessionContext = createContext<ReturnType<typeof createSession>>();
export const useSchoolSession = () => useContext(SessionContext)!;

export function SchoolSession(props: ParentProps) {
  const session = createSession();
  onMount(() => {
    if (backend) void session.refresh();
  });
  return (
    <SessionContext.Provider value={session}>
      {props.children}
      <Show when={backend}>
        <AccountDialog />
      </Show>
    </SessionContext.Provider>
  );
}

export function AccountControls() {
  const s = useSchoolSession();
  return (
    <Show when={backend}>
      <div class="account-controls">
        <Show
          when={!s.checking()}
          fallback={
            <span class="field-hint" role="status">
              Memeriksa akun…
            </span>
          }
        >
          <Show
            when={s.user()}
            fallback={
              <>
                <Button variant="secondary" onClick={() => s.show('login')}>
                  Masuk
                </Button>
                <Button onClick={() => s.show('register')}>Daftar akun</Button>
              </>
            }
          >
            <span class="account-name" title={s.user()?.email}>
              {s.user()?.name || s.user()?.email}
            </span>
            <Show
              when={!s.schools.error}
              fallback={
                <Button variant="secondary" onClick={() => void s.refetch()}>
                  Muat ulang sekolah
                </Button>
              }
            >
              <Show
                when={s.schools()?.length}
                fallback={
                  <Button
                    variant="secondary"
                    disabled={s.schools.loading}
                    onClick={() => s.setOpen(true)}
                  >
                    Buat sekolah
                  </Button>
                }
              >
                <Show when={(s.schools()?.length ?? 0) > 1}>
                  <label class="account-school">
                    <span class="sr-only">Sekolah aktif</span>
                    <select
                      class="text-input"
                      value={school()}
                      onChange={(e) => setSchool(e.currentTarget.value)}
                    >
                      <For each={s.schools()}>
                        {(item) => <option value={item.id}>{item.name}</option>}
                      </For>
                    </select>
                  </label>
                </Show>
              </Show>
            </Show>
            <Button variant="ghost" disabled={s.busy()} onClick={() => void s.logout()}>
              Keluar
            </Button>
          </Show>
        </Show>
        <Show when={!s.open() && s.message()}>
          <p class="field-error" role="alert">
            {s.message()}
          </p>
        </Show>
      </div>
    </Show>
  );
}

function AccountDialog() {
  const s = useSchoolSession();
  const [visible, setVisible] = createSignal(false);
  let email!: HTMLInputElement,
    password!: HTMLInputElement,
    name!: HTMLInputElement,
    schoolName!: HTMLInputElement;
  const registering = () => s.mode() === 'register';
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (s.busy()) return;
    s.setBusy(true);
    s.setMessage('');
    let created = false;
    try {
      if (s.user()) {
        const team = await backend!.teams.create({
          teamId: ID.unique(),
          name: schoolName.value.trim(),
          roles: ['owner', 'teacher', 'admin'],
        });
        await s.refetch();
        setSchool(team.$id);
        s.setOpen(false);
      } else {
        if (registering()) {
          await backend!.account.create({
            userId: ID.unique(),
            email: email.value.trim(),
            password: password.value,
            name: name.value.trim(),
          });
          created = true;
          s.setMode('login');
        }
        await backend!.account.createEmailPasswordSession({
          email: email.value.trim(),
          password: password.value,
        });
        await s.refresh();
        if (!s.user()) throw new Error('Sesi belum tersedia. Silakan masuk kembali.');
        const items = await s.refetch();
        if (items?.length === 1) setSchool(items[0]!.id);
        s.setOpen(!items?.length);
      }
    } catch (error) {
      s.setMessage(
        error instanceof AppwriteException && error.code === 409
          ? 'Email ini sudah terdaftar. Silakan masuk dengan akun Anda.'
          : error instanceof AppwriteException && error.code === 429
            ? 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
            : s.user()
              ? 'Sekolah belum berhasil dibuat. Silakan coba lagi.'
              : created
                ? 'Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi Anda.'
                : registering()
                  ? 'Pendaftaran gagal. Periksa data Anda dan coba lagi.'
                  : 'Login gagal. Periksa email dan kata sandi.',
      );
    } finally {
      s.setBusy(false);
    }
  }
  function switchMode() {
    s.setMode(registering() ? 'login' : 'register');
    s.setMessage('');
    setVisible(false);
  }
  return (
    <Dialog
      open={s.open()}
      onOpenChange={(value) => {
        if (!s.busy()) {
          if (!value) s.setDestination('');
          s.setOpen(value);
          setVisible(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="modal-overlay" />
        <div class="modal-positioner">
          <Dialog.Content class="modal-content account-dialog">
            <div class="modal-heading">
              <Brand symbol />
              <Dialog.CloseButton class="icon-button" disabled={s.busy()} aria-label="Tutup dialog">
                <X size={20} />
              </Dialog.CloseButton>
            </div>
            <Dialog.Title class="account-dialog-title">
              {s.user()
                ? 'Buat ruang sekolah'
                : registering()
                  ? 'Daftar akun guru'
                  : s.loginRequired()
                    ? 'Masuk terlebih dahulu'
                    : 'Selamat datang kembali'}
            </Dialog.Title>
            <Dialog.Description class="text-muted">
              {s.user()
                ? 'Beri nama sekolah Anda untuk mulai mengelola soal dan ujian.'
                : registering()
                  ? 'Buat akun untuk menyimpan soal dan mengelola ujian sekolah.'
                  : s.loginRequired()
                    ? 'Masuk atau daftar akun untuk membuka fitur ruang kerja. Setelah masuk, Anda akan melanjutkan ke halaman yang dipilih.'
                    : 'Masuk untuk melanjutkan pekerjaan Anda di Octopus.'}
            </Dialog.Description>
            <form class="school-login-form" onSubmit={submit} aria-busy={s.busy()}>
              <Show
                when={!s.user()}
                fallback={
                  <label class="field">
                    <span class="field-label">Nama sekolah</span>
                    <input
                      class="text-input"
                      ref={schoolName}
                      required
                      maxlength={128}
                      placeholder="Contoh: SMA Nusantara"
                    />
                  </label>
                }
              >
                <Show when={registering()}>
                  <label class="field">
                    <span class="field-label">Nama lengkap</span>
                    <input
                      class="text-input"
                      ref={name}
                      required
                      maxlength={128}
                      autocomplete="name"
                      placeholder="Nama Anda"
                    />
                  </label>
                </Show>
                <label class="field">
                  <span class="field-label">Email</span>
                  <input
                    class="text-input"
                    ref={email}
                    type="email"
                    required
                    autocomplete="username"
                    placeholder="nama@sekolah.sch.id"
                  />
                </label>
                <label class="field">
                  <span class="field-label">Kata sandi</span>
                  <span class="password-control">
                    <input
                      class="text-input"
                      ref={password}
                      type={visible() ? 'text' : 'password'}
                      required
                      minlength={registering() ? 8 : undefined}
                      maxlength={256}
                      autocomplete={registering() ? 'new-password' : 'current-password'}
                      placeholder={registering() ? 'Minimal 8 karakter' : 'Masukkan kata sandi'}
                    />
                    <button
                      type="button"
                      class="icon-button"
                      aria-label={visible() ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      aria-pressed={visible()}
                      onClick={() => setVisible(!visible())}
                    >
                      <Show when={visible()} fallback={<Eye size={20} />}>
                        <EyeOff size={20} />
                      </Show>
                    </button>
                  </span>
                </label>
              </Show>
              <Show when={s.message()}>
                <p class="school-entry-error" role="alert">
                  {s.message()}
                </p>
              </Show>
              <Button type="submit" disabled={s.busy()}>
                {s.busy()
                  ? 'Memproses…'
                  : s.user()
                    ? 'Buat sekolah'
                    : registering()
                      ? 'Daftar akun'
                      : 'Masuk'}
              </Button>
            </form>
            <Show when={!s.user()}>
              <p class="account-switch">
                {registering() ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
                <Button variant="ghost" disabled={s.busy()} onClick={switchMode}>
                  {registering() ? 'Masuk' : 'Daftar akun'}
                </Button>
              </p>
            </Show>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

export default function SchoolGate(props: ParentProps) {
  const s = useSchoolSession();
  return (
    <Show
      when={s.user() && school()}
      fallback={
        <section class="school-selection-state">
          <Brand symbol />
          <h1>
            {s.checking()
              ? 'Memeriksa akun…'
              : s.user()
                ? 'Pilih sekolah Anda'
                : 'Ruang kerja Anda menanti'}
          </h1>
          <p class="text-muted">
            {s.user()
              ? 'Pilih sekolah aktif di bagian atas, atau buat sekolah untuk mulai mengelola soal.'
              : 'Masuk atau daftar akun untuk mengelola soal dan ujian sekolah.'}
          </p>
          <Show when={!s.checking() && !s.user()}>
            <Button onClick={() => s.show('login')}>Masuk</Button>
          </Show>
        </section>
      }
    >
      <Show when={school()} keyed>
        {(schoolId) => <div data-school={schoolId}>{props.children}</div>}
      </Show>
    </Show>
  );
}
