import { A, useLocation } from '@solidjs/router';
import { Dynamic } from 'solid-js/web';
import CalendarDays from 'lucide-solid/icons/calendar-days';
import ChartNoAxesCombined from 'lucide-solid/icons/chart-no-axes-combined';
import Radio from 'lucide-solid/icons/radio';
import Badge from '../components/ui/Badge';

const pages = {
  '/ujian': {
    title: 'Ujian',
    icon: CalendarDays,
    heading: 'Ruang ujian Anda akan hadir di sini',
    description:
      'Buat ujian dari bank soal, tentukan waktu pengerjaan, dan bagikan akses kepada peserta.',
  },
  '/monitoring': {
    title: 'Monitoring',
    icon: Radio,
    heading: 'Dampingi peserta saat ujian berlangsung',
    description:
      'Status pengerjaan, koneksi, dan kejadian selama ujian akan terlihat di satu tempat.',
  },
  '/nilai': {
    title: 'Nilai dan analisis',
    icon: ChartNoAxesCombined,
    heading: 'Hasil ujian menjadi bahan belajar berikutnya',
    description:
      'Koreksi jawaban, lihat rekap nilai, dan temukan soal yang perlu dibahas kembali bersama peserta.',
  },
};

export default function UpcomingPage() {
  const location = useLocation();
  const page = () => pages[location.pathname as keyof typeof pages] ?? pages['/ujian'];
  return (
    <section class="page" aria-labelledby="page-title">
      <p class="eyebrow">RUANG KERJA OCTOPUS</p>
      <h1 id="page-title">{page().title}</h1>
      <section class="panel empty-state">
        <span class="empty-icon">
          <Dynamic component={page().icon} size={32} aria-hidden="true" />
        </span>
        <Badge tone="info">Segera hadir</Badge>
        <h2>{page().heading}</h2>
        <p>{page().description}</p>
        <p class="field-hint">Fitur ini belum tersedia pada pratinjau.</p>
        <A class="button" data-variant="secondary" href="/bank-soal">
          Jelajahi bank soal
        </A>
      </section>
    </section>
  );
}
