import BookOpen from 'lucide-solid/icons/book-open';
import FileInput from 'lucide-solid/icons/file-input';
import Plus from 'lucide-solid/icons/plus';
import Search from 'lucide-solid/icons/search';
import { createSignal, Show } from 'solid-js';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import Checkbox from '../components/ui/Checkbox';
import Badge from '../components/ui/Badge';

export default function QuestionBankPage() {
  const [query, setQuery] = createSignal('');
  const [onlyMine, setOnlyMine] = createSignal(false);
  return (
    <section class="page" aria-labelledby="page-title">
      <div class="page-heading">
        <div>
          <p class="eyebrow">PERSIAPAN PEMBELAJARAN</p>
          <h1 id="page-title">Bank soal</h1>
          <p class="intro">Satu tempat untuk pertanyaan yang ingin Anda gunakan kembali.</p>
        </div>
        <div class="heading-actions">
          <Button variant="secondary" disabled title="Tersedia pada tahap pembuatan soal">
            <Plus size={18} aria-hidden="true" />
            Buat soal
          </Button>
          <Button disabled title="Tersedia pada tahap impor soal">
            <FileInput size={18} aria-hidden="true" />
            Impor soal
          </Button>
        </div>
      </div>
      <div class="bank-toolbar">
        <div class="search-field">
          <Search size={18} aria-hidden="true" />
          <TextField
            label="Cari bank soal"
            type="search"
            value={query()}
            onChange={setQuery}
            placeholder="Cari berdasarkan nama bank soal…"
          />
        </div>
        <Checkbox label="Hanya milik saya" checked={onlyMine()} onChange={setOnlyMine} />
      </div>
      <section class="panel empty-state" aria-labelledby="empty-bank-title">
        <span class="empty-icon">
          <BookOpen size={32} aria-hidden="true" />
        </span>
        <Badge tone="info">Sedang disiapkan</Badge>
        <h2 id="empty-bank-title">Bank soal sedang disiapkan</h2>
        <p>
          Di sini Anda akan menyimpan soal, mengelompokkannya, dan memilihnya untuk ujian. Pembuatan
          soal manual dan impor dokumen akan hadir berikutnya.
        </p>
        <Show when={query().trim() || onlyMine()}>
          <p class="filter-note" role="status">
            Belum ada data untuk ditampilkan dengan filter ini.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setQuery('');
              setOnlyMine(false);
            }}
          >
            Reset filter
          </Button>
        </Show>
        <p class="field-hint">Tombol buat dan impor akan aktif saat fitur tersedia.</p>
      </section>
    </section>
  );
}
