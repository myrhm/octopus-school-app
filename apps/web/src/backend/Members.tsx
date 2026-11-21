import { Query } from 'appwrite';
import { createResource, createSignal, For, Show } from 'solid-js';
import { backend, school } from './client';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
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
    <section class="panel members-panel" aria-labelledby="members-title">
      <div class="members-heading">
        <h2 id="members-title">Anggota sekolah</h2>
        <p class="field-hint">Lihat anggota yang memiliki akses ke ruang kerja sekolah.</p>
      </div>
      <Show when={message()}>
        <p class="members-feedback" role="status">
          {message()}
        </p>
      </Show>
      <Show when={!members.error} fallback={<p>Daftar anggota belum dapat dibuka.</p>}>
        <Show when={members.loading}>
          <p class="field-hint" role="status">
            Memuat anggota…
          </p>
        </Show>
        <ul class="members-list">
          <For each={members()}>
            {(m) => (
              <li class="member-row">
                <div class="member-info">
                  <strong>{m.userName || m.userEmail}</strong>
                  <Show when={m.userName && m.userEmail}>
                    <p class="field-hint">{m.userEmail}</p>
                  </Show>
                  <div class="member-badges">
                    <span class="field-hint">
                      {m.roles.includes('owner')
                        ? 'Pemilik sekolah'
                        : m.roles.includes('admin')
                          ? 'Admin'
                          : m.roles.includes('teacher')
                            ? 'Guru'
                            : 'Anggota'}
                    </span>
                    <Badge tone={m.confirm ? 'success' : 'info'}>
                      {m.confirm ? 'Aktif' : 'Diundang'}
                    </Badge>
                  </div>
                  <details class="member-id">
                    <summary>ID anggota</summary>
                    <code>{m.userId}</code>
                  </details>
                </div>
                <Show when={owner() && !m.roles.includes('owner')}>
                  <div class="field member-role-control">
                    <label class="field-label" for={'member-role-' + m.$id}>
                      Peran anggota
                    </label>
                    <select
                      class="text-input"
                      id={'member-role-' + m.$id}
                      value={m.roles.includes('admin') ? 'admin' : 'teacher'}
                      onChange={(e) => void role(m.$id, e.currentTarget.value)}
                    >
                      <option value="teacher">Guru</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={owner()}>
        <form class="member-invite-form" onSubmit={(e) => void invite(e)}>
          <div>
            <h3>Undang guru</h3>
            <p class="field-hint">Kirim undangan agar guru lain dapat bergabung ke sekolah ini.</p>
          </div>
          <label class="field">
            <span class="field-label">Email guru</span>
            <input
              class="text-input"
              type="email"
              autocomplete="email"
              placeholder="nama@sekolah.sch.id"
              required
              ref={email}
            />
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
