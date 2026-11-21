import { BankLibrary } from '../backend/BankLibrary';
import { backend } from '../backend/client';
import { A, useNavigate, useSearchParams } from '@solidjs/router';
import { createMemo, createResource, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import Plus from 'lucide-solid/icons/plus';
import BookOpen from 'lucide-solid/icons/book-open';
import Trash2 from 'lucide-solid/icons/trash';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import TextField from '../components/ui/TextField';
import {
  createDraft,
  listDrafts,
  listTrashedDrafts,
  moveDraftToTrash,
  restoreDraft,
} from '../features/question-import/draft-store';
import type { LocalDraft, TrashedDraft } from '../features/question-import/draft-store';

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const inTrash = () => params.tampilan === 'sampah';
  const [query, setQuery] = createSignal('');
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal<string>();
  const [notice, setNotice] = createSignal('');
  const [drafts, { refetch }] = createResource(async () => {
    const [active, trash] = await Promise.all([listDrafts(), listTrashedDrafts()]);
    return { active, trash };
  });
  const collection = () => (drafts.error ? undefined : drafts());
  const filtered = createMemo(() =>
    (inTrash() ? (collection()?.trash ?? []) : (collection()?.active ?? [])).filter((draft) =>
      draft.title.toLocaleLowerCase('id').includes(query().trim().toLocaleLowerCase('id')),
    ),
  );
  const refreshOnFocus = () => {
    void refetch();
  };
  onMount(() => window.addEventListener('focus', refreshOnFocus));
  onCleanup(() => window.removeEventListener('focus', refreshOnFocus));
  async function changeTrash(draft: LocalDraft | TrashedDraft) {
    if (busy()) return;
    const restoring = inTrash();
    setBusy(draft.id);
    setError('');
    setNotice('');
    try {
      if (restoring) await restoreDraft(draft.id, draft.revision);
      else await moveDraftToTrash(draft.id, draft.revision);
      setNotice(
        restoring
          ? `“${draft.title.trim() || 'Draft tanpa nama'}” dipulihkan ke draft aktif.`
          : `“${draft.title.trim() || 'Draft tanpa nama'}” dipindahkan ke Sampah. Anda dapat memulihkannya kapan saja.`,
      );
      await refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Perubahan belum tersimpan. Coba lagi.');
      void refetch();
    } finally {
      setBusy(undefined);
    }
  }
  async function startImport() {
    setCreating(true);
    setError('');
    try {
      const draft = await createDraft();
      navigate(`/bank-soal/impor/${draft.id}`);
    } catch {
      setError(
        backend
          ? 'Draft belum dapat dibuat. Periksa koneksi dan sekolah aktif, lalu coba lagi.'
          : 'Draft belum dapat dibuat. Pastikan penyimpanan browser diizinkan, lalu coba lagi.',
      );
    } finally {
      setCreating(false);
    }
  }
  return (
    <section class="page" aria-labelledby="page-title">
      <div class="page-heading">
        <div>
          <p class="eyebrow">PERSIAPAN PEMBELAJARAN</p>
          <h1 id="page-title">Bank soal</h1>
          <p class="intro">
            {backend
              ? 'Buat bank soal, lalu ketik atau tempel pertanyaan ke dalam draft.'
              : 'Mulai dari draft lokal, lalu susun pertanyaan dari dokumen Anda.'}
          </p>
        </div>
        <div class="heading-actions">
          <A class="button" data-variant="secondary" href="/pratinjau-siswa/contoh">
            Contoh pratinjau siswa
          </A>
          <Button onClick={() => void startImport()} disabled={creating()}>
            <Plus size={18} aria-hidden="true" />
            {creating() ? 'Menyiapkan draft…' : 'Buat bank soal'}
          </Button>
        </div>
      </div>
      <div class="draft-view-switch" role="group" aria-label="Tampilan draft">
        <Button
          variant={inTrash() ? 'secondary' : 'primary'}
          aria-pressed={!inTrash()}
          onClick={() => setParams({ tampilan: undefined })}
        >
          Draft aktif ({collection()?.active.length ?? 0})
        </Button>
        <Button
          variant={inTrash() ? 'primary' : 'secondary'}
          aria-pressed={inTrash()}
          onClick={() => setParams({ tampilan: 'sampah' })}
        >
          Sampah ({collection()?.trash.length ?? 0})
        </Button>
      </div>
      <Show when={inTrash()}>
        <div class="trash-description">
          <h2>Sampah</h2>
          <p class="field-hint">
            Draft di sini tetap tersimpan beserta soal, opsi, dan kuncinya. Pulihkan untuk
            mengeditnya kembali. Tidak ada penghapusan permanen atau otomatis.
          </p>
        </div>
      </Show>
      <Show when={notice()}>
        <p class="draft-notice" role="status">
          {notice()}
        </p>
      </Show>
      <div class="local-draft-note">
        <p>
          {backend
            ? 'Draft dapat dibuka dari perangkat lain dengan akun dan sekolah yang sama.'
            : 'Draft hanya tersimpan di browser dan perangkat ini.'}
        </p>
        <Badge tone="info">{backend ? 'Penyimpanan sekolah' : 'Penyimpanan lokal'}</Badge>
      </div>
      <Show when={error()}>
        <p class="save-error" role="alert">
          {error()}
        </p>
      </Show>
      <div class="bank-toolbar">
        <TextField
          label="Cari draft soal"
          type="search"
          value={query()}
          onChange={setQuery}
          placeholder="Cari berdasarkan nama draft…"
        />
        <Show when={query()}>
          <Button variant="secondary" onClick={() => setQuery('')}>
            Reset filter
          </Button>
        </Show>
      </div>
      <Show
        when={!drafts.error}
        fallback={
          <div class="save-error" role="alert">
            <p>Daftar draft belum dapat dibaca. Data tersimpan tidak diubah.</p>
            <Button variant="secondary" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          </div>
        }
      >
        <Show when={!drafts.loading} fallback={<p role="status">Membaca draft…</p>}>
          <Show
            when={filtered().length}
            fallback={
              <section class="panel empty-state">
                <span class="empty-icon">
                  <BookOpen size={32} aria-hidden="true" />
                </span>
                <h2>
                  {query()
                    ? 'Draft tidak ditemukan'
                    : inTrash()
                      ? 'Sampah masih kosong'
                      : 'Mulai dari dokumen soal Anda'}
                </h2>
                <p>
                  {query()
                    ? 'Coba nama lain atau reset pencarian.'
                    : inTrash()
                      ? 'Draft yang dipindahkan ke Sampah akan muncul di sini dan dapat dipulihkan.'
                      : 'Pilih Buat bank soal, tempel isi dokumen, lalu pisahkan menjadi beberapa soal. Draft akan tersimpan otomatis di sini.'}
                </p>
              </section>
            }
          >
            <ul class="draft-list">
              <For each={filtered()}>
                {(draft) => (
                  <li class="panel draft-list-item">
                    <div>
                      <Badge>
                        {inTrash() ? 'Di Sampah' : backend ? 'Draft sekolah' : 'Draft lokal'}
                      </Badge>
                      <h2>
                        <Show when={!inTrash()} fallback={draft.title.trim() || 'Draft tanpa nama'}>
                          <A href={`/bank-soal/impor/${draft.id}`}>
                            {draft.title.trim() || 'Draft tanpa nama'}
                          </A>
                        </Show>
                      </h2>
                      <p class="field-hint">
                        {Number.isInteger(draft.questionCount)
                          ? draft.questionCount + ' soal · '
                          : ''}{' '}
                        {inTrash() ? 'Dipindahkan' : 'Diperbarui'}{' '}
                        {Number.isFinite(Date.parse(draft.updatedAt))
                          ? new Date(draft.updatedAt).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </p>
                    </div>
                    <div class="draft-item-actions">
                      <Show when={!inTrash()}>
                        <A
                          class="button"
                          data-variant="ghost"
                          href={`/pratinjau-siswa/${draft.id}`}
                        >
                          Pratinjau siswa
                        </A>
                        <A
                          class="button"
                          data-variant="secondary"
                          href={`/bank-soal/impor/${draft.id}`}
                        >
                          Lanjutkan draft
                        </A>
                      </Show>
                      <Button
                        variant={inTrash() ? 'secondary' : 'danger'}
                        class={inTrash() ? undefined : 'draft-trash-button'}
                        aria-label={inTrash() ? undefined : 'Pindahkan ke sampah'}
                        title={inTrash() ? undefined : 'Pindahkan ke sampah'}
                        aria-busy={busy() === draft.id}
                        disabled={Boolean(busy())}
                        onClick={() => void changeTrash(draft)}
                      >
                        <Show when={inTrash()} fallback={<Trash2 size={18} aria-hidden="true" />}>
                          {busy() === draft.id ? 'Menyimpan…' : 'Pulihkan draft'}
                        </Show>
                      </Button>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </Show>
      <Show when={backend && !inTrash()}>
        <BankLibrary />
      </Show>
    </section>
  );
}
