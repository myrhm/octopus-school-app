import { A } from '@solidjs/router';

export default function NotFoundPage() {
  return (
    <section class="page" aria-labelledby="page-title">
      <p class="eyebrow">404</p>
      <h1 id="page-title">Halaman tidak ditemukan</h1>
      <p class="intro">Periksa alamatnya atau kembali ke ringkasan Octopus.</p>
      <A class="button" href="/">
        Kembali ke ringkasan
      </A>
    </section>
  );
}
