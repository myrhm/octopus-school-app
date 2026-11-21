# Backend Appwrite

Backend memakai Appwrite Cloud, Account untuk sesi guru, Teams untuk sekolah, TablesDB untuk data, Storage privat untuk gambar, dan Functions untuk otorisasi serta aturan ujian.

## Konfigurasi cloud

1. Buat project dan platform Web untuk hostname pengembangan dan deployment.
2. Buat database TablesDB dengan ID octopus dan tabel records. Tambahkan kolom wajib scopeKey berupa string panjang 64, serta payload berupa long text. Buat key index pada scopeKey. Kosongkan permissions tabel dan baris karena akses data melalui Function.
3. Buat bucket question-media dengan file security aktif dan permissions bucket kosong.
4. Buat Function ber-ID octopus, runtime Node.js 22, entrypoint main.js. Deploy isi appwrite/function dengan package.json di root arsip. Execute access memakai Any untuk akses peserta. Aktifkan scope teams.read, rows.read, rows.write, dan files.write pada dynamic API key.
5. Buat akun guru, Team sekolah, dan membership terkonfirmasi dengan role teacher atau admin.
6. Isi apps/web/.env.local mengikuti apps/web/.env.example, lalu jalankan pnpm dev. Variabel browser hanya berisi endpoint dan project ID.

## Penyimpanan dan akses

Function memeriksa membership dan role pada setiap operasi guru. Draft dibatasi per sekolah dan pengguna. Versi draft disimpan sebagai baris immutable dengan ID deterministik berdasarkan sekolah, pemilik, ID draft, dan revisi. Dua penulisan revisi yang sama menghasilkan konflik create. Seluruh revisi dipertahankan dan daftar memakai revisi tertinggi.

Penerbitan membuat salinan soal yang terpisah dari draft. Ujian mengacu pada versi terbit tersebut. Fungsi peserta memeriksa jadwal dan memproyeksikan data tanpa kunci. Finalisasi memakai ID submission deterministik agar retry tidak menggandakan hasil.

## Cakupan implementasi dan pekerjaan lanjutan

Implementasi awal mencakup login, pemilihan sekolah, draft server, Sampah/pemulihan, impor lokal eksplisit, upload gambar privat, versi bank soal, jadwal, open link dengan nama peserta, dan hitungan jawaban pilihan ganda yang benar.

Spesifikasi produk memuat target lanjutan. Durasi per peserta, lifecycle pause/close/archive, kredensial peserta, resume setelah reload, autosave jawaban server, token peserta kedaluwarsa/dapat dicabut, timeout worker, rate limiting, koreksi esai, publikasi hasil, serta ekspor belum tersedia. Upload gambar belum terhubung ke penyisipan media dalam editor. Portal peserta saat ini memakai ID attempt sebagai rahasia akses selama sesi halaman.

Tes lokal memakai API simulasi untuk Function dan tes browser mode lokal. Verifikasi end-to-end terhadap Appwrite Cloud diperlukan sebelum pemakaian data nyata.
