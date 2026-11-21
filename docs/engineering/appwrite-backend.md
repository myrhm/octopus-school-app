# Backend Appwrite

Backend memakai Appwrite Cloud, Account untuk sesi guru, Teams untuk sekolah, TablesDB untuk data, Storage privat untuk gambar, dan Functions untuk otorisasi serta aturan ujian.

## Konfigurasi cloud

1. Buat project dan platform Web untuk hostname pengembangan dan deployment.
2. Buat database TablesDB dengan ID octopus dan tabel records. Tambahkan kolom wajib scopeKey berupa string panjang 64, serta payload berupa long text. Buat key index pada scopeKey. Kosongkan permissions tabel dan baris karena akses data melalui Function.
3. Buat bucket question-media dengan file security aktif dan permissions bucket kosong.
4. Buat Function ber-ID octopus, runtime Node.js 22, entrypoint main.js. Deploy isi appwrite/function dengan package.json di root arsip. Execute access memakai Any untuk akses peserta. Aktifkan scope teams.read, rows.read, rows.write, files.read, dan files.write pada dynamic API key.
5. Buat akun guru, Team sekolah, dan membership terkonfirmasi dengan role teacher atau admin.
6. Isi apps/web/.env.local mengikuti apps/web/.env.example, lalu jalankan pnpm dev. Variabel browser hanya berisi endpoint dan project ID.

## Penyimpanan dan akses

Function memeriksa membership dan role pada setiap operasi guru. Draft dibatasi per sekolah dan pengguna. Versi draft disimpan sebagai baris immutable dengan ID deterministik berdasarkan sekolah, pemilik, ID draft, dan revisi. Dua penulisan revisi yang sama menghasilkan konflik create. Seluruh revisi dipertahankan dan daftar memakai revisi tertinggi.

Penerbitan membuat salinan soal yang terpisah dari draft. Ujian mengacu pada versi terbit tersebut. Fungsi peserta memeriksa jadwal dan memproyeksikan data tanpa kunci. Finalisasi memakai ID submission deterministik agar retry tidak menggandakan hasil.

## Konfigurasi pengerjaan ujian

Deploy ulang Function octopus dengan main.js, grading.js, dan package.json di root arsip. Atur jadwal Function setiap menit (`* * * * *`) agar server memfinalisasi sesi yang kedaluwarsa dari jawaban terakhir yang sudah diterima. Jadwal aplikasi mengikuti waktu server. Scheduler memindai ujian dan attempt, sehingga perlu diuji beban sebelum penggunaan skala besar.

Peserta dapat masuk lewat tautan atau kode per peserta. Guru membuat kode di Monitoring. Tab menyimpan salinan sesi dan jawaban sementara untuk recovery setelah reload. Database menyimpan hash token attempt baru dan revisi autosave. Akses gambar siswa diperiksa terhadap snapshot ujian. Cookie akses terpisah per konteks tab dan ujian. Token peserta untuk sesi baru ditempatkan oleh endpoint satu origin /api/participant pada cookie HttpOnly SameSite=Strict dengan Secure di production. sessionStorage menyimpan soal dan pilihan sementara. Deploy web dengan project root apps/web dan pastikan /api/participant dilayani Node Function serta memiliki VITE_APPWRITE_ENDPOINT dan VITE_APPWRITE_PROJECT_ID di runtime. Server dev/preview Vite menyediakan adapter yang sama untuk localhost.

Halaman Nilai menyediakan koreksi per butir dengan alasan, perhitungan nilai berbobot, rilis hasil, dan ekspor CSV. Bank baru dimiliki pembuatnya; akses baca dapat diberikan ke anggota sekolah. Bank lama tanpa metadata pemilik tetap mengikuti akses baca sekolah sebelumnya. Team owner dapat mengundang guru dari Pengaturan. Daftarkan hostname aplikasi sebagai platform Web agar tautan undangan dapat kembali ke rute /undangan.

Tes Function menggunakan adapter penyimpanan simulasi. Setelah deployment cloud, verifikasi upload dan pembacaan gambar private, pengiriman email undangan, recovery, eksekusi terjadwal, dan pemberian nilai menggunakan akun uji.
