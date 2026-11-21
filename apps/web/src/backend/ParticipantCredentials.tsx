import { createEffect, createResource, createSignal, For, Show, onCleanup } from 'solid-js';
import { useBeforeLeave } from '@solidjs/router';
import Button from '../components/ui/Button';
import { call } from './client';
type Participant = { participantId: string; name: string; revoked?: boolean; password?: string };
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  const value = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === '"') {
      if (quoted && value[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === ';')) {
      row.push(cell.trim());
      cell = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && value[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('CSV memiliki tanda kutip yang belum ditutup.');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export default function ParticipantCredentials(props: { examId: string }) {
  const [participants, { refetch }] = createResource(
    () => props.examId,
    (id) => call<Participant[]>('participants', { id }),
  );
  const [mode, setMode] = createSignal('manual');
  const [names, setNames] = createSignal('');
  const [prefix, setPrefix] = createSignal('KELAS-');
  const [first, setFirst] = createSignal(1);
  const [credentials, setCredentials] = createSignal<Participant[]>([]);
  useBeforeLeave((event) => {
    if (
      credentials().length &&
      !window.confirm(
        'Password baru masih ditampilkan. Sudah disalin atau diunduh? Tinggalkan halaman dan hilangkan tampilan password?',
      )
    )
      event.preventDefault();
  });
  createEffect(() => {
    if (!credentials().length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    onCleanup(() => window.removeEventListener('beforeunload', warn));
  });
  const [message, setMessage] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  async function action(work: () => Promise<void>) {
    if (busy()) return;
    setBusy(true);
    setMessage('Memproses…');
    try {
      await work();
      await refetch();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Permintaan gagal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }
  function reveal(rows: Participant[]) {
    setCredentials((previous) => [
      ...previous.filter((p) => !rows.some((r) => r.participantId === p.participantId)),
      ...rows,
    ]);
  }
  async function create() {
    const lines = names()
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean);
    const rows =
      mode() === 'auto'
        ? lines.map((name, index) => ({
            name,
            participantId: prefix() + String(first() + index).padStart(3, '0'),
          }))
        : parseCsv(names())
            .filter(
              (row, index) =>
                !(index === 0 && /^(id|participantId|id_peserta)$/i.test(row[0] ?? '')),
            )
            .map((row) => {
              if (row.length !== 2) throw new Error('Gunakan dua kolom: ID peserta dan nama.');
              return { participantId: row[0]!, name: row[1]! };
            });
    if (!rows.length || rows.length > 100) throw new Error('Masukkan 1–100 peserta per pembuatan.');
    const seen = new Set<string>();
    for (const row of rows) {
      row.participantId = row.participantId.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{1,40}$/.test(row.participantId) || !row.name || row.name.length > 100)
        throw new Error(
          'ID harus 1–40 huruf/angka, tanda - atau _. Nama wajib, maksimal 100 karakter.',
        );
      if (
        seen.has(row.participantId) ||
        participants()?.some((p) => p.participantId === row.participantId)
      )
        throw new Error('ID duplikat: ' + row.participantId);
      seen.add(row.participantId);
    }
    const result = await call<{ created: Participant[]; incomplete: boolean }>(
      'create_participants',
      { id: props.examId, participants: rows },
    );
    reveal(result.created);
    setMessage(
      result.incomplete
        ? 'Sebagian peserta belum dibuat. Simpan password yang tampil, lalu buat ulang hanya peserta yang belum ada di daftar.'
        : 'Peserta dibuat. Salin atau unduh password sebelum meninggalkan halaman.',
    );
  }
  function download() {
    const cell = (value: string) =>
      '"' + (/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"';
    const csv =
      '\uFEFF' +
      [
        ['ID peserta', 'Nama', 'Password'],
        ...credentials().map((p) => [p.participantId, p.name, p.password ?? '']),
      ]
        .map((row) => row.map(cell).join(','))
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kredensial-peserta.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <details class="exam-participants">
      <summary>Kelola peserta dan password</summary>
      <div class="exam-participants-body">
        <p class="field-hint">
          ID unik untuk ujian ini. Password hanya tampil saat dibuat/reset; simpan untuk dibagikan
          kepada siswa. Reset mencabut sesi lama dan mengizinkan siswa masuk kembali.
        </p>
        <label class="field">
          Cara memasukkan peserta
          <select
            class="text-input"
            value={mode()}
            onChange={(e) => setMode(e.currentTarget.value)}
          >
            <option value="manual">ID dan nama manual / CSV</option>
            <option value="auto">Buat ID berurutan dari daftar nama</option>
          </select>
        </label>
        <Show when={mode() === 'auto'}>
          <div class="exam-form-grid">
            <label class="field">
              Awalan ID
              <input
                class="text-input"
                value={prefix()}
                maxlength={30}
                onInput={(e) => setPrefix(e.currentTarget.value)}
              />
            </label>
            <label class="field">
              Nomor awal
              <input
                class="text-input"
                type="number"
                min="1"
                max="999999"
                value={first()}
                onInput={(e) => setFirst(Math.max(1, Number(e.currentTarget.value) || 1))}
              />
            </label>
          </div>
        </Show>
        <label class="field">
          {mode() === 'auto'
            ? 'Nama siswa, satu per baris'
            : 'ID peserta dan nama, satu siswa per baris'}
          <textarea
            class="text-input"
            rows={5}
            value={names()}
            onInput={(e) => setNames(e.currentTarget.value)}
            placeholder={mode() === 'auto' ? 'Andi\nBudi' : 'KELAS7-001,Andi\nKELAS7-002,Budi'}
          />
        </label>
        <Show when={mode() !== 'auto'}>
          <label class="field">
            Impor CSV (kolom ID, nama)
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy()}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = '';
                if (file)
                  void action(async () => {
                    if (file.size > 200000) throw new Error('CSV maksimal 200 KB.');
                    setNames(await file.text());
                    setMessage('CSV dimuat. Periksa isian, lalu pilih Buat peserta.');
                  });
              }}
            />
          </label>
        </Show>
        <Button
          disabled={busy() || participants.loading || !!participants.error}
          onClick={() => void action(create)}
        >
          Buat peserta
        </Button>
        <p class="action-feedback" role="status">
          {message()}
        </p>
        <Show when={credentials().length}>
          <section class="credential-reveal">
            <h4>Simpan password ini</h4>
            <p>
              Password tidak tersimpan di browser dan tidak dapat dilihat lagi setelah meninggalkan
              halaman. Gunakan Reset password jika hilang.
            </p>
            <div class="exam-actions">
              <Button variant="secondary" onClick={download}>
                Unduh CSV password
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  void action(async () => {
                    await navigator.clipboard.writeText(
                      credentials()
                        .map((p) => `${p.participantId}\t${p.name}\t${p.password}`)
                        .join('\n'),
                    );
                    setMessage('Kredensial disalin.');
                  })
                }
              >
                Salin semua
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (
                    window.confirm(
                      'Sembunyikan password? Pastikan sudah disalin atau diunduh; password ini tidak bisa dibuka kembali.',
                    )
                  )
                    setCredentials([]);
                }}
              >
                Sembunyikan password
              </Button>
            </div>
            <div class="exam-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ID peserta</th>
                    <th>Nama</th>
                    <th>Password baru</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={credentials()}>
                    {(p) => (
                      <tr>
                        <td>{p.participantId}</td>
                        <td>{p.name}</td>
                        <td>
                          <code>{p.password}</code>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </section>
        </Show>
        <Show when={participants.error}>
          <p role="alert">
            Daftar peserta belum dapat dimuat. Coba tutup dan buka kembali halaman.
          </p>
        </Show>
        <For each={participants()} fallback={<p class="field-hint">Belum ada peserta.</p>}>
          {(p) => (
            <div class="exam-participant-row">
              <div>
                <strong>{p.name}</strong>
                <p class="field-hint">
                  {p.participantId} {p.revoked ? '— Akses dicabut' : ''}
                </p>
              </div>
              <div class="exam-actions">
                <Button
                  variant="secondary"
                  disabled={busy()}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Reset password ' +
                          p.name +
                          '? Sesi lama dicabut. Jawaban yang sudah tersimpan tetap dipertahankan.',
                      )
                    )
                      void action(async () => {
                        reveal([
                          await call<Participant>('reset_participant', {
                            id: props.examId,
                            participantId: p.participantId,
                          }),
                        ]);
                        setMessage('Password direset. Simpan password baru di atas.');
                      });
                  }}
                >
                  Reset password
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy() || p.revoked}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Cabut akses ' +
                          p.name +
                          '? Siswa tidak dapat masuk atau melanjutkan sesi.',
                      )
                    )
                      void action(async () => {
                        await call('revoke_participant', {
                          id: props.examId,
                          participantId: p.participantId,
                        });
                        setCredentials((rows) =>
                          rows.filter((row) => row.participantId !== p.participantId),
                        );
                        setMessage('Akses dicabut.');
                      });
                  }}
                >
                  Cabut akses
                </Button>
              </div>
            </div>
          )}
        </For>
      </div>
    </details>
  );
}
