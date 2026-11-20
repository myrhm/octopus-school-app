import { A } from '@solidjs/router';

export default function OverviewPage() {
  return (
    <section class="page" aria-labelledby="page-title">
      <p class="eyebrow">Selamat datang di Octopus</p>
      <h1 id="page-title">Ruang untuk soal dan ujian Anda.</h1>
      <p class="intro">
        Dari dokumen soal yang sudah Anda miliki, menuju ujian dan hasil belajar yang tertata.
      </p>
      <div class="panel">
        <h2>Mulai dari bank soal</h2>
        <p>Tempat untuk mengelola pertanyaan yang nantinya digunakan dalam ujian.</p>
        <A class="button" href="/bank-soal">
          Buka bank soal <span aria-hidden="true">→</span>
        </A>
      </div>
      <p class="development-note">
        Octopus sedang disiapkan. Pembuatan soal dan penyelenggaraan ujian akan tersedia secara
        bertahap.
      </p>
    </section>
  );
}
