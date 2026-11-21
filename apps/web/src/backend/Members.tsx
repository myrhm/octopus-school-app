import { Query } from 'appwrite';
import { createResource, createSignal, For, Show } from 'solid-js';
import { backend, school } from './client';
import Button from '../components/ui/Button';
export default function Members() {
  const [message, setMessage] = createSignal('');
  const [members, { refetch }] = createResource(school, async (teamId) => {
    const members = [];
    let cursor = '';
    for (;;) {
      const page = await backend!.teams.listMemberships({
        teamId,
        queries: [Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
      });
      members.push(...page.memberships);
      if (page.memberships.length < 100) return members;
      cursor = page.memberships.at(-1)!.$id;
    }
  });
  const [account] = createResource(() => backend!.account.get());
  const owner = () =>
    members()?.some((m) => m.userId === account()?.$id && m.confirm && m.roles.includes('owner'));
  async function role(id: string, role: string) {
    try {
      await backend!.teams.updateMembership({ teamId: school(), membershipId: id, roles: [role] });
      await refetch();
      setMessage('Role anggota diperbarui.');
    } catch {
      setMessage('Perubahan role gagal.');
    }
  }
  let email!: HTMLInputElement;
  async function invite(event: SubmitEvent) {
    event.preventDefault();
    setMessage('Mengirim undangan…');
    try {
      await backend!.teams.createMembership({
        teamId: school(),
        roles: ['teacher'],
        email: email.value,
        url: window.location.origin + '/undangan',
      });
      email.value = '';
      await refetch();
      setMessage('Undangan guru dikirim.');
    } catch {
      setMessage('Gagal mengundang. Periksa alamat email dan izin pengelola Team.');
    }
  }
  return (
    <section class="panel">
      <h2>Anggota sekolah</h2>
      <p role="status">{message()}</p>
      <Show when={!members.error} fallback={<p>Daftar anggota belum dapat dibuka.</p>}>
        <For each={members()}>
          {(m) => (
            <p>
              {m.userName || m.userEmail} · {m.roles.join(', ')} ·{' '}
              {m.confirm ? 'Aktif' : 'Diundang'} · ID {m.userId}
              <Show when={owner() && !m.roles.includes('owner')}>
                <label>
                  Role anggota
                  <select
                    value={m.roles.includes('admin') ? 'admin' : 'teacher'}
                    onChange={(e) => void role(m.$id, e.currentTarget.value)}
                  >
                    <option value="teacher">Guru</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </Show>
            </p>
          )}
        </For>
      </Show>
      <Show when={owner()}>
        <form onSubmit={(e) => void invite(e)}>
          <label>
            Email guru
            <input class="text-input" type="email" required ref={email} />
          </label>
          <Button type="submit">Undang guru</Button>
        </form>
      </Show>
    </section>
  );
}

export function AcceptInvitation() {
  const [message, setMessage] = createSignal('');
  async function accept() {
    const params = new URLSearchParams(location.search);
    try {
      await backend!.teams.updateMembershipStatus({
        teamId: params.get('teamId') ?? '',
        membershipId: params.get('membershipId') ?? '',
        userId: params.get('userId') ?? '',
        secret: params.get('secret') ?? '',
      });
      location.replace('/');
    } catch {
      setMessage('Undangan gagal diterima. Periksa tautan atau minta undangan baru.');
    }
  }
  return (
    <main class="page">
      <h1>Undangan sekolah</h1>
      <Button onClick={() => void accept()}>Terima undangan</Button>
      <p role="status">{message()}</p>
    </main>
  );
}
