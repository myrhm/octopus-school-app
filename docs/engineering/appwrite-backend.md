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

Untuk pengujian tanpa scheduler, membuka Nilai/Monitoring atau menekan **Perbarui hasil** juga memfinalisasi sesi yang waktunya sudah habis. Backend membatasi pemeriksaan ini ke ujian milik guru pada sekolah aktif, memakai jawaban autosave terbaru, dan mempertahankan hasil yang sudah difinalisasi. Kedua halaman memperbarui data setiap 30 detik selama tab terlihat. Ujian yang masih berlangsung tidak difinalisasi lebih awal.

Paket gratis project saat pengujian menolak cron serta interval di bawah 60 menit. Jalur finalisasi saat membaca hasil memungkinkan tes ujian satu menit tanpa menunggu interval tersebut. Jika seluruh browser ditutup, tidak ada pemeriksaan berkala dari halaman guru; hasil akan diproses ketika halaman guru dibuka kembali. Finalisasi tanpa browser tetap memerlukan scheduler yang tersedia pada paket Appwrite atau worker terpisah.

Peserta dapat masuk lewat tautan atau kode per peserta. Guru membuat kode di Monitoring. Tab menyimpan salinan sesi dan jawaban sementara untuk recovery setelah reload. Database menyimpan hash token attempt baru dan revisi autosave. Akses gambar siswa diperiksa terhadap snapshot ujian. Cookie akses terpisah per konteks tab dan ujian. Token peserta untuk sesi baru ditempatkan oleh endpoint satu origin /api/participant pada cookie HttpOnly SameSite=Strict dengan Secure di production. sessionStorage menyimpan soal dan pilihan sementara. Deploy web dengan project root apps/web dan pastikan /api/participant dilayani Node Function serta memiliki VITE_APPWRITE_ENDPOINT dan VITE_APPWRITE_PROJECT_ID di runtime. Server dev/preview Vite menyediakan adapter yang sama untuk localhost.

Halaman Nilai menyediakan koreksi per butir dengan alasan, perhitungan nilai berbobot, rilis hasil, dan ekspor CSV. Bank baru dimiliki pembuatnya; akses baca dapat diberikan ke anggota sekolah. Bank lama tanpa metadata pemilik tetap mengikuti akses baca sekolah sebelumnya. Team owner dapat mengundang guru dari Pengaturan. Daftarkan hostname aplikasi sebagai platform Web agar tautan undangan dapat kembali ke rute /undangan.

Tes Function menggunakan adapter penyimpanan simulasi. Setelah deployment cloud, verifikasi upload dan pembacaan gambar private, pengiriman email undangan, recovery, eksekusi terjadwal, dan pemberian nilai menggunakan akun uji.

### Browser image preparation

Question and answer-option images share the private `question-media` upload path. The browser re-encodes PNG/JPEG/WebP to WebP (PNG fallback), resizes the longest edge to at most 1600 pixels, and reduces quality/dimensions toward 250 KB. Output above 500 KB is rejected with a visible message; the original is never uploaded as a fallback. Source files are limited to 20 MB and 40 million decoded pixels. Existing server MIME/signature checks and the 1 MB storage limit remain an independent safeguard. Browser compression is a client policy, not a server-enforced 500 KB limit.

Options reference image file IDs in their rich-text content, just like questions. Published exam snapshots retain those references; removing an image from an editor does not physically delete its file. Participant access continues through the function's exam/snapshot authorization.

### Participant credentials and schedule drafts

New exams explicitly choose `accessMode: open | credentials`. The former requires a name; the latter accepts a teacher-assigned ID (case-insensitive ASCII letters, digits, hyphen, underscore; 1–40 characters) and a server-generated password. Credential creation accepts up to 100 named participants, including sequential IDs or CSV input in the web UI. Passwords are returned only upon creation/reset; storage contains a random salt and scrypt hash. A partial batch response retains successfully created credentials for export. If a response is lost, reset the affected participants rather than attempting to retrieve passwords.

Authentication permits five attempts per participant ID per minute using unique server-side rate slots. Credential attempts have a stable ID, while each session uses a random token whose digest resolves to the attempt. A second login conflicts with an existing session. Teacher-confirmed password reset invalidates the old credential/session version and allows device transfer without clearing accepted answers or restarting the deadline. Revocation blocks both entry and active API access. Legacy code-based exams retain their existing entry path; new exams use the explicit methods.

The teacher schedule form stores its fields and selected question IDs in localStorage under an account-and-school-specific key. It retains values after errors and successful creation; clearing requires confirmation. Participant passwords are never written to this cache. Exam deletion is a soft delete: it records `deleted_at`, archives the exam, hides it from teacher lists, and denies participant access while preserving historical rows and shared bank/media assets.

These changes require deployment of both the updated Appwrite Function and web/API code together. This implementation session intentionally did not run checks, tests, or builds and did not deploy the changes.
