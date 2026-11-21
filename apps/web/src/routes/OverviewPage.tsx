import { backend } from '../backend/client';
import { A } from '@solidjs/router';
import BookOpen from 'lucide-solid/icons/book-open';
import CalendarDays from 'lucide-solid/icons/calendar-days';
import ClipboardCheck from 'lucide-solid/icons/clipboard-check';
import FileInput from 'lucide-solid/icons/file-input';

export default function OverviewPage() {
  return (
    <section class="page" aria-labelledby="page-title">
      <section class="welcome-panel" aria-labelledby="page-title">
        <div>
          <h1 id="page-title">Ruang untuk soal dan ujian Anda.</h1>
          <p>Susun draft di bank soal, jadwalkan ujian, dan lihat hasil peserta.</p>
          <A class="button" data-variant="primary" href="/bank-soal">
            <BookOpen size={18} aria-hidden="true" />
            Buka bank soal
          </A>
        </div>
        <div class="welcome-visual" aria-hidden="true">
          <img src="/brand/octopus-symbol.png" alt="" width="240" height="240" />
        </div>
      </section>
      <div class="section-heading">
        <h2>Kegiatan guru</h2>
      </div>
      <div class="workflow-grid">
        <article class="workflow-card">
          <span class="feature-icon">
            <FileInput size={22} aria-hidden="true" />
          </span>
          <h3>Susun soal</h3>
          <p>Gunakan kembali soal dari dokumen atau tulis pertanyaan baru.</p>
          <A href="/bank-soal" class="text-link">
            Lihat bank soal
          </A>
        </article>
        <article class="workflow-card">
          <span class="feature-icon" data-tone="info">
            <CalendarDays size={22} aria-hidden="true" />
          </span>
          <h3>Selenggarakan ujian</h3>
          <p>Atur jadwal, bagikan akses, dan dampingi peserta saat mengerjakan.</p>
          <A href="/ujian" class="text-link">
            Lihat ruang ujian
          </A>
        </article>
        <article class="workflow-card">
          <span class="feature-icon" data-tone="warning">
            <ClipboardCheck size={22} aria-hidden="true" />
          </span>
          <h3>Pahami hasil belajar</h3>
          <p>Koreksi jawaban dan temukan bagian yang perlu dipelajari kembali.</p>
          <A href="/nilai" class="text-link">
            Lihat nilai dan analisis
          </A>
        </article>
      </div>
      <div class="preview-note">
        <span class="note-dot" aria-hidden="true" />
        <p>
          {backend
            ? 'Kelola draft sekolah dan jadwalkan ujian dari ruang ujian.'
            : 'Impor dan susun draft soal sudah dapat dicoba secara lokal. Akun sekolah dan penyelenggaraan ujian belum tersedia.'}
        </p>
      </div>
    </section>
  );
}
