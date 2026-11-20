import { A, useNavigate } from '@solidjs/router';
import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import FileInput from 'lucide-solid/icons/file-input';
import BookOpen from 'lucide-solid/icons/book-open';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import TextField from '../components/ui/TextField';
import { createDraft, listDrafts } from '../features/question-import/draft-store';

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [query, setQuery] = createSignal('');
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal('');
  const [drafts, { refetch }] = createResource(listDrafts);
  const filtered = createMemo(() =>
    (drafts.error ? [] : (drafts() ?? [])).filter((draft) =>
      draft.title.toLocaleLowerCase('id').includes(query().trim().toLocaleLowerCase('id')),
    ),
  );
  async function startImport() {
    setCreating(true);
    setError('');
    try {
      const draft = await createDraft();
      navigate(`/bank-soal/impor/${draft.id}`);
    } catch {
      setError('Draft belum dapat dibuat. Pastikan penyimpanan browser diizinkan, lalu coba lagi.');
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
          <p class="intro">Mulai dari draft lokal, lalu susun pertanyaan dari dokumen Anda.</p>
        </div>
        <Button onClick={() => void startImport()} disabled={creating()}>
          <FileInput size={18} aria-hidden="true" />
          {creating() ? 'Menyiapkan draft…' : 'Impor soal'}
        </Button>
      </div>
      <div class="local-draft-note">
        <p>
          Draft hanya tersimpan di browser dan perangkat ini. Belum ada akun atau sinkronisasi
          antarperangkat.
        </p>
        <Badge tone="info">Penyimpanan lokal</Badge>
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
        <Show when={!drafts.loading} fallback={<p role="status">Membaca draft lokal…</p>}>
          <Show
            when={filtered().length}
            fallback={
              <section class="panel empty-state">
                <span class="empty-icon">
                  <BookOpen size={32} aria-hidden="true" />
                </span>
                <h2>{query() ? 'Draft tidak ditemukan' : 'Mulai dari dokumen soal Anda'}</h2>
                <p>
                  {query()
                    ? 'Coba nama lain atau reset pencarian.'
                    : 'Pilih Impor soal, tempel isi dokumen, lalu pisahkan menjadi beberapa soal. Draft akan tersimpan otomatis di sini.'}
                </p>
              </section>
            }
          >
            <ul class="draft-list">
              <For each={filtered()}>
                {(draft) => (
                  <li class="panel draft-list-item">
                    <div>
                      <Badge>Draft lokal</Badge>
                      <h2>
                        <A href={`/bank-soal/impor/${draft.id}`}>
                          {draft.title.trim() || 'Draft tanpa nama'}
                        </A>
                      </h2>
                      <p class="field-hint">
                        {draft.questionCount} soal · Diperbarui{' '}
                        {new Date(draft.updatedAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <A
                      class="button"
                      data-variant="secondary"
                      href={`/bank-soal/impor/${draft.id}`}
                    >
                      Lanjutkan draft
                    </A>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </Show>
    </section>
  );
}
