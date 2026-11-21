import { A } from '@solidjs/router';

export default function GuideContent() {
  return (
    <section class="guide-page" aria-label="Langkah penggunaan Octopus">
      <p class="field-hint">
        Untuk ujian, pilih metode akses Tautan terbuka atau Kredensial. Pada metode Kredensial,
        jadwalkan ujian terlebih dahulu, lalu buka Kelola peserta dan password di daftar ujian.
        Masukkan ID dan nama, impor CSV, atau buat ID berurutan. Salin atau unduh password saat
        dibuat/reset karena password lama tidak bisa ditampilkan kembali. Reset password juga
        digunakan untuk perpindahan perangkat dengan persetujuan guru. Isian form jadwal disimpan di
        perangkat per akun dan sekolah.
      </p>
      <ol class="guide-steps">
        <li class="panel guide-step">
          <div class="guide-step-content">
            <h2>Masuk dan siapkan sekolah</h2>
            <p>
              Gunakan tombol Masuk atau Daftar akun di header. Setelah masuk, buat ruang sekolah
              atau pilih sekolah yang sudah terhubung ke akun Anda.
            </p>
            <p class="field-hint">Pemilik sekolah dapat mengundang guru lain melalui Pengaturan.</p>
            <A class="text-link" href="/pengaturan">
              Buka pengaturan sekolah
            </A>
          </div>
        </li>
        <li class="panel guide-step">
          <div class="guide-step-content">
            <h2>Buat bank soal</h2>
            <p>
              Buka Bank soal, pilih Buat bank soal, lalu beri nama draft. Ketik soal atau tempel isi
              dokumen ke editor.
            </p>
            <p class="field-hint">
              Ketik <code>%%%</code> pada baris tersendiri untuk membuat soal berikutnya. Anda juga
              bisa memakai Tambah soal atau Ctrl/Cmd + Enter.
            </p>
            <A class="text-link" href="/bank-soal">
              Buka bank soal
            </A>
          </div>
        </li>
        <li class="panel guide-step">
          <div class="guide-step-content">
            <h2>Lengkapi pilihan dan penilaian</h2>
            <p>
              Pilih soal yang ingin diatur. Buka Jenis soal dan penilaian untuk memilih pilihan
              tunggal, pilihan jamak, jawaban singkat, atau esai, lalu isi bobotnya.
            </p>
            <p class="field-hint">
              Lengkapi pilihan dan kunci untuk soal pilihan. Isi jawaban yang diterima untuk jawaban
              singkat. Jawaban esai diperiksa oleh guru setelah ujian.
            </p>
            <p class="field-hint">
              Saat mengekstrak jawaban, pilih hanya isi daftar jawabannya. Bullet dan label awal
              seperti A., B), atau (C) dibersihkan otomatis, termasuk jika keduanya bertumpuk.
              Aplikasi memberi label opsi sesuai urutan; baris lanjutan dan format isi tetap
              dipertahankan. Urungkan atau Kembalikan ke soal memulihkan teks asalnya.
            </p>
            <p class="field-hint">
              Pilihan jawaban tampil dalam kotak hijau di bawah masing-masing soal. Kartu putih
              mengikuti jumlah dan panjang jawaban. Gunakan Tampilkan jawaban atau Sembunyikan
              jawaban untuk membuka dan melipatnya; opsi tetap tersimpan saat disembunyikan.
            </p>
            <p class="field-hint">
              Gambar bisa digunakan di soal maupun pilihan jawaban. Untuk soal, buka Sisipkan gambar
              atau tempel/seret file gambar ke editor. Untuk opsi yang sudah dibuat, buka Gambar
              jawaban pada kartu putih, isi deskripsi dan lebar tampil, lalu pilih Tambahkan gambar.
              Untuk jawaban berupa gambar saja, sisipkan gambar di soal, seleksi gambarnya, lalu
              pilih Jadikan opsi.
            </p>
            <p class="field-hint">
              PNG, JPG, dan WebP dikompres sebelum diunggah, dengan target 250 KB dan batas 500 KB
              per gambar. File sumber maksimal 20 MB. Jika masih terlalu besar, aplikasi meminta
              Anda memotong gambar; file asli tidak diunggah sebagai pengganti.
            </p>
            <div class="guide-shortcuts">
              <h3>Shortcut saat menyeleksi jawaban</h3>
              <p>
                Di editor, seleksi teks lalu tekan <kbd>Ctrl/Cmd + K</kbd> untuk membuka menu
                tindakan. Setelah menu terbuka, tekan satu huruf berikut tanpa menahan Ctrl/Cmd:
              </p>
              <p>
                <kbd>S</kbd> untuk satu opsi, <kbd>D</kbd> untuk beberapa opsi, <kbd>P</kbd> untuk
                memisahkan soal di kursor, dan <kbd>N</kbd> untuk menambah soal. Format teks
                tersedia melalui <kbd>B</kbd> (tebal), <kbd>I</kbd> (miring), dan <kbd>U</kbd>{' '}
                (garis bawah).
              </p>
              <p class="field-hint">
                Untuk beberapa opsi, seleksi minimal dua baris berlabel A/B/C atau diawali tanda -.
                Opsi tampil di panel Pilihan jawaban; gunakan Kembalikan ke soal untuk memulihkan
                teks. Tindakan S dan D memerlukan seleksi teks.
              </p>
              <p class="field-hint">
                Anda juga bisa memakai ↑/↓ lalu Enter, atau mengeklik tindakan. Tekan Esc untuk
                menutup menu. Huruf S/D dan lainnya hanya menjadi shortcut saat menu terbuka.
              </p>
            </div>
            <p class="field-hint">
              Tunggu keterangan Tersimpan di sekolah sebelum meninggalkan editor. Gambar dapat
              ditambahkan lewat Sisipkan gambar.
            </p>
            <p class="field-hint">
              Gunakan ikon pin di bar alat untuk menyematkannya saat menggulir soal. Bar yang
              disematkan tampil ringkas; buka Alat soal untuk format teks, ekstraksi opsi, serta
              penilaian.
            </p>
          </div>
        </li>
        <li class="panel guide-step">
          <div class="guide-step-content">
            <h2>Terbitkan dan jadwalkan ujian</h2>
            <p>
              Buka Ujian. Pada Terbitkan ke bank sekolah, pilih draft dan tekan Terbitkan versi.
              Gunakan versi itu pada bagian Jadwalkan ujian.
            </p>
            <p class="field-hint">
              Isi waktu mulai, waktu selesai, durasi, dan instruksi peserta. Aktifkan kode peserta
              jika akses ujian perlu dibatasi.
            </p>
            <A class="text-link" href="/ujian">
              Buka pengelolaan ujian
            </A>
          </div>
        </li>
        <li class="panel guide-step">
          <div class="guide-step-content">
            <h2>Bagikan tautan dan lihat hasil</h2>
            <p>
              Bagikan tautan ujian kepada peserta. Pantau pengerjaan melalui Monitoring; kode
              peserta juga dapat dibuat di sana untuk ujian yang membutuhkannya.
            </p>
            <p class="field-hint">
              Setelah waktu ujian habis, buka Nilai dan analisis lalu tekan Perbarui hasil untuk
              memproses jawaban terakhir yang tersimpan. Tinjau jawaban, koreksi esai, lalu rilis
              nilai jika sudah siap.
            </p>
            <div class="guide-links">
              <A class="text-link" href="/monitoring">
                Buka monitoring
              </A>
              <A class="text-link" href="/nilai">
                Buka nilai dan analisis
              </A>
            </div>
          </div>
        </li>
      </ol>
      <aside class="guide-tip">
        <h2>Coba satu ujian singkat dulu</h2>
        <p>
          Buat satu atau dua soal dengan durasi 1 menit. Buka tautan peserta di jendela privat,
          jawab soal, dan tunggu keterangan jawaban tersimpan. Setelah waktu habis, perbarui hasil
          dari akun guru.
        </p>
      </aside>
    </section>
  );
}
