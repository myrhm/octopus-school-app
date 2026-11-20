# Spesifikasi produk dan engineering Octopus

Versi 1.0 · 20 November 2026 · Draft untuk dasar implementasi

Octopus menyatukan pekerjaan guru dari dokumen soal yang sudah dimiliki sampai hasil ujian yang siap digunakan. Pembeda utamanya adalah impor dan penyusunan soal secara visual tanpa AI, dengan transformasi yang dapat dibatalkan dan tidak menghilangkan isi secara diam-diam.

Spesifikasi ini mengonsolidasikan [tiga dokumen sumber](../references/README.md). Detail perilaku impor pada sumber pertama tetap berlaku. Dokumen ini menetapkan batas rilis, keputusan lintas modul, serta hal yang masih perlu dibuktikan saat implementasi. Tidak ada provisioning layanan atau pembangunan aplikasi pada tahap spesifikasi ini.

## 1. Sasaran dan prinsip produk

- Guru dapat memakai kembali 20–50 soal dari dokumen tanpa mengulang salin-tempel setiap pertanyaan dan pilihan.
- Peserta dapat masuk melalui link atau kredensial ujian tanpa membuat akun permanen.
- Jawaban, waktu resmi, penilaian, dan publikasi hasil dijaga konsisten oleh backend.
- Sekolah memiliki batas data yang tegas sejak awal.
- Antarmuka terasa ramah seperti maskot Octopus, tetapi tenang dan mudah dipakai saat ujian.

Prinsip wajib: zero AI dependency, progressive structuring, non-destructive editing, undo/redo, aturan server sebagai sumber kebenaran, dan keamanan browser yang dinyatakan secara realistis.

## 2. Pengguna dan otorisasi

| Pengguna      | Kemampuan                                                     | Batas akses                                      |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| Guru          | Bank soal, impor, ujian, peserta, monitoring, koreksi, ekspor | Resource sekolah dan kewenangan yang diberikan   |
| Peserta       | Entry, instruksi, pengerjaan, hasil yang dirilis              | Attempt dan hasil miliknya melalui sesi terbatas |
| Admin sekolah | Keanggotaan dan konfigurasi sekolah                           | Model role disiapkan; dashboard lengkap menyusul |

Usulan default awal: bank soal dan ujian dapat diubah oleh pembuatnya; akses guru lain membutuhkan izin eksplisit. Menjadi anggota sekolah tidak otomatis memberi hak mengubah seluruh ujian. Matriks izin final harus tersedia sebelum migrasi otorisasi ditulis.

## 3. Batas rilis

| Area         | MVP web untuk pilot                                                                          | Pengembangan berikutnya                                             |
| ------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Authoring    | Manual, bulk paste, split/merge, ekstraksi opsi, media, undo, draft, preview, bank soal      | Batch editing lanjutan, kolaborasi simultan                         |
| Jenis soal   | Single choice dan esai sebagai alur pertama; multiple answer dan short answer melengkapi MVP | Partial credit dan tipe soal lanjutan                               |
| Bantuan pola | Saran pemisahan dan ekstraksi berbasis aturan, selalu dapat ditinjau                         | Deteksi format lebih luas                                           |
| Ujian        | Jadwal, durasi, snapshot soal, dua mode akses, kredensial, publish/open/close                | Kebijakan jadwal lanjutan                                           |
| Peserta      | Mobile/desktop, navigasi bebas, penanda tinjau, timer, autosave, recovery, submit            | Navigasi berurutan yang dapat dikonfigurasi                         |
| Penilaian    | Otomatis objektif, manual esai, override diaudit, kelulusan, rilis nilai                     | Kebijakan penilaian lanjutan                                        |
| Analitik     | Rekap, mean/median/min/max, kelulusan, ranking, distribusi, statistik per soal, CSV          | Perbandingan lintas ujian, psikometrik; XLSX dianjurkan setelah CSV |
| Monitoring   | Event, status peserta, warning, lock/unlock, intervensi guru                                 | Integrasi kemampuan native                                          |
| Platform     | SolidJS web di Vercel                                                                        | Tauri desktop dan Flutter Android setelah web stabil                |

Tidak termasuk MVP: AI, OCR, parsing PDF kompleks, jaminan rekonstruksi DOCX, generasi soal, jaminan anti-cheating, PWA offline penuh, dan microservices.

## 4. Struktur halaman dan alur

Navigasi guru: **Ringkasan → Bank Soal → Ujian → Monitoring → Nilai dan Analisis → Pengaturan**. Monitoring dan nilai juga tersedia dari detail ujian sehingga konteks ujian selalu jelas.

Alur guru: buat bank soal → pilih manual/impor massal → susun soal → tambahkan media → tinjau dan simpan → buat ujian → pilih soal/versi → atur jadwal dan akses → siapkan peserta → terbitkan → pantau → koreksi → rilis hasil → ekspor.

Alur peserta: link ujian → identitas/kredensial → instruksi dan konfirmasi → mulai attempt → jawab dan tinjau → konfirmasi submit → penyelesaian → hasil jika diizinkan. Entry tidak memuat soal sebelum otorisasi berhasil.

## 5. Bank soal dan impor visual

Wizard non-linear memiliki tiga tahap: **Susun soal, Tambahkan media, Tinjau dan simpan**. Guru dapat berpindah tahap tanpa kehilangan draft. Manual editor memakai model soal dan validasi yang sama.

### 5.1. Paste dan struktur

- Paste awal menjadi satu draft; simpan representasi sumber untuk recovery.
- Pertahankan paragraf, line break, bold, italic, underline, daftar, Unicode, dan simbol sejauh format editor mendukungnya. Sanitasi konten aktif.
- Gambar clipboard diterima jika browser menyediakan data yang dapat diekstrak. Jika tidak, teks tetap dipertahankan dan tersedia upload manual.
- Delimiter `%%%` hanya berlaku pada baris tersendiri, dengan whitespace di sekitarnya diabaikan. Sesuai revisi UX 21 November 2026, delimiter yang diketik langsung membuka soal berikutnya; soal kosong diperbolehkan selama penyusunan draft. Enter dan Shift+Enter sama-sama dikenali sebagai batas baris.
- Split pada kursor mempertahankan isi sebelum/sesudah, formatting, dan urutan, lalu memindahkan fokus ke soal berikutnya. Ctrl/Cmd + Enter pada akhir teks atau draft kosong langsung membuat soal baru yang dapat dilengkapi. Elemen kompleks yang tidak aman dibelah meminta batas paragraf.
- Merge sebelumnya/berikutnya mempertahankan seluruh isi, opsi, dan referensi media. Konflik kunci ditandai untuk ditinjau.
- Deteksi nomor soal dan opsi menghasilkan `matched`, `ambiguous`, atau `unmatched`; pengguna melihat preview sebelum menerapkan. Nomor daftar dalam pertanyaan tidak otomatis menjadi batas soal.

### 5.2. Pilihan dan kunci

Seleksi dapat dipindahkan menjadi satu opsi atau beberapa opsi. Label A/B/C berasal dari urutan tampilan; identitas opsi adalah UUID stabil. Parser mendukung pola `A.`, `B)`, `(C)`, dan huruf kecil. Opsi panjang dapat terdiri atas beberapa paragraf. Format ambigu dikembalikan ke preview atau ekstraksi manual.

Reorder tersedia melalui drag dan tombol naik/turun. Kunci mengikuti ID opsi. Mengembalikan opsi ke pertanyaan memakai lokasi sumber jika masih valid, atau lokasi fallback yang dijelaskan; referensi kunci pada opsi tersebut dihapus. Tidak ada isi di luar seleksi yang ikut terhapus.

Single choice mempunyai tepat satu kunci; multiple answer mempunyai himpunan kunci; esai memakai model jawaban/rubrik opsional; short answer mempunyai accepted answers dan aturan normalisasi eksplisit. Bobot default tersedia dan dapat diubah. Sistem tidak menebak kunci; baris `Kunci: B` hanya boleh menjadi saran yang ditinjau.

### 5.3. Media dan penyimpanan

PNG, JPEG, dan WebP dapat ditambahkan ke pertanyaan atau opsi melalui file picker, drag/drop, dan clipboard yang kompatibel. Media dapat disisipkan di tengah teks, diberi deskripsi alternatif, diatur ukuran tampilannya, diganti, atau dilepas.

Aset memiliki ID, sekolah/pemilik, MIME terverifikasi, ukuran, path privat, dan status upload. Undo atau penghapusan referensi tidak langsung menghapus file fisik. Cleanup memperhitungkan draft, versi soal, dan snapshot ujian yang masih merujuk aset.

Autosave memakai revision, status terlihat, dan antrean lokal. Request lama tidak menimpa versi baru. Bulk save idempoten dan atomik: retry tidak membuat duplikasi atau menyimpan setengah kumpulan soal tanpa status yang jelas. Undo/redo lintas transformasi tersedia selama sesi editor; reopen memulihkan draft, tidak wajib seluruh history.

Draft tidak lengkap boleh disimpan. Penggunaan dalam ujian diblokir bila pertanyaan kosong, opsi/kunci tidak sah, bobot tidak valid, konflik belum diselesaikan, atau media belum berhasil tersimpan. Pertanyaan berisi gambar sah tidak dianggap kosong hanya karena teksnya kosong.

## 6. Pengelolaan ujian

Ujian memuat judul, mapel, instruksi, kelas opsional, soal dan bobot, jadwal, durasi, metode akses, kebijakan sesi, keamanan, kelulusan, dan visibilitas hasil. Total nilai dihitung dari bobot soal dan harus positif.

Publish mengikat ujian ke versi soal dan konfigurasi yang stabil. Edit bank soal sesudahnya tidak mengubah ujian berjalan. Perubahan konfigurasi setelah publish harus dibatasi; perubahan yang memengaruhi peserta aktif membutuhkan tindakan khusus dan audit, bukan edit biasa.

| Status      | Makna                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| `draft`     | Dapat disusun, belum dapat diikuti                                         |
| `published` | Valid dan diterbitkan, menunggu pembukaan/jadwal                           |
| `open`      | Entry dan pengerjaan tersedia sesuai aturan                                |
| `paused`    | Kebijakan pause aktif; detail default dijelaskan di bawah                  |
| `closed`    | Entry baru ditolak; attempt lama mengikuti deadline dan tindakan penutupan |
| `archived`  | Arsip penyelenggaraan, tidak menerima attempt                              |

Usulan default pause MVP: hentikan entry baru, pertahankan pengerjaan aktif dan deadline. UI harus menyebut efek ini. Pembekuan timer seluruh peserta merupakan fitur terpisah dan tidak diasumsikan tersedia.

**Tutup akses masuk** menolak peserta baru dan mempertahankan attempt aktif. **Akhiri semua pengerjaan** memfinalisasi attempt aktif menggunakan jawaban terakhir yang diterima server; tampilkan jumlah peserta terdampak dan konfirmasi. Reopen tidak menghidupkan kembali attempt final atau mengubah deadline lama secara otomatis.

Default waktu: `deadline_at = min(started_at + duration, closes_at)`. Simpan UTC, tampilkan timezone sekolah dengan default rancangan Asia/Jakarta. Mulai terlambat berarti durasi lebih singkat dan harus terlihat sebelum mulai. Perpanjangan waktu oleh guru merupakan pengecualian yang diaudit, dengan deadline efektif baru yang eksplisit; tidak boleh diam-diam melewati batas penutupan.

## 7. Akses dan sesi peserta

**Open Link:** token link sulit ditebak, nama wajib dan identitas tambahan dapat dikonfigurasi. Identitas deklaratif dan batas attempt hanya best-effort; nama sama atau berbeda tidak membuktikan identitas fisik.

**Kredensial:** ID unik per ujian dan password acak kriptografis. Guru dapat membuat satu/N peserta, memasukkan daftar nama, mengimpor CSV, reset password, mencabut akses, dan mengekspor kredensial saat pembuatan/reset. Simpan hash password, bukan plaintext yang dapat diambil kembali. Login diberi rate limit; distribusi kredensial menjadi tanggung jawab guru.

Default ujian formal: satu attempt per peserta berkredensial dan satu sesi aktif per attempt. Perangkat baru mendapat konflik sesi; perpindahan perangkat membutuhkan persetujuan pengawas dan mencabut sesi sebelumnya. Reload dengan sesi yang masih valid memulihkan attempt yang sama.

Token peserta bersifat terbatas, kedaluwarsa, dapat dicabut, dan disimpan sebagai hash di server. Web menargetkan Secure HttpOnly cookie melalui topologi domain yang sesuai. Sebelum implementasi, buktikan alur cookie, CORS, CSRF, dan resume lintas frontend/API. Jika memerlukan proxy satu origin, batasi tanggung jawabnya pada transport; aturan ujian tetap di backend. Jangan memakai localStorage sebagai batas keamanan token.

## 8. Pengerjaan, autosave, dan finalisasi

Antarmuka peserta memiliki judul, countdown, status simpan, satu viewer soal, navigator status, penanda tinjau, sebelumnya/berikutnya, dan submit. Mobile memakai panel navigator yang dapat dibuka. Default navigasi bebas; opsi dan soal yang diacak disimpan stabil per attempt.

Status attempt: `in_progress`, `locked`, `submitted`, `timed_out`, `terminated`. Lock tidak menghapus jawaban dan timer tetap berjalan. Unlock hanya sah jika masih diizinkan deadline atau guru memperpanjang waktu secara eksplisit. Tiga state terakhir bersifat final pada MVP.

Jawaban objektif disimpan segera setelah perubahan; teks panjang memakai debounce. Setiap mutasi membawa revision dan identitas request. Server memvalidasi sesi, soal/opsi milik snapshot, status, dan deadline dalam transaksi. Save yang tiba setelah submit tidak boleh mengubah jawaban final.

IndexedDB menyimpan perubahan belum terkirim. UI membedakan **Tersimpan, Menyimpan, Offline, Menyinkronkan, Gagal menyimpan**; data lokal belum berarti diterima server. Reconnect memeriksa status dan revision sebelum replay. Perubahan offline yang baru diterima setelah deadline ditolak pada default MVP; peserta diberi tahu sebelum mulai. Jangan menjanjikan ujian offline penuh.

Submit menampilkan jumlah terjawab/kosong, menyinkronkan antrean yang masih sah, lalu finalisasi atomik dan idempoten. Jika masih ada jawaban gagal terkirim, tampilkan keadaan itu secara eksplisit sebelum melanjutkan dengan jawaban server. Timeout harus diproses backend meskipun browser tertutup; pilihan scheduler/worker dan retry dibuktikan saat implementasi. Waktu perangkat hanya membantu tampilan countdown.

## 9. Penilaian dan rilis hasil

| Jenis           | Aturan default                                                           |
| --------------- | ------------------------------------------------------------------------ |
| Single choice   | Benar mendapat bobot penuh; salah/kosong nol                             |
| Multiple answer | Exact set match, tanpa partial credit                                    |
| Short answer    | Trim dan case-insensitive jika diaktifkan guru; tanpa inferensi semantik |
| Esai            | Koreksi manual, nilai antara nol dan bobot maksimum                      |

Koreksi mempunyai `grading_status = not_graded | partially_graded | graded`. Publikasi dipisah menjadi `release_status = hidden | scheduled | released`; `released` bukan status koreksi. Dengan begitu, nilai lengkap tidak otomatis terlihat peserta.

Grading memakai versi aturan dan idempotency. Override mencatat nilai lama/baru, alasan, aktor, serta waktu; tidak mengubah kunci historis. Usulan default: perubahan nilai setelah rilis membuat versi hasil baru dan membutuhkan rilis ulang.

Nilai persentase = total poin / total bobot × 100. Usulan presisi: hitung dari nilai tersimpan tanpa pembulatan antara; tampilan dua desimal. Kelulusan dibandingkan dengan nilai sebelum pembulatan. Nilai yang belum lengkap berstatus pending dan tidak diberi label gagal.

Kebijakan hasil memiliki dua dimensi: isi (`hidden`, `score_only`, `score_and_review`) dan waktu (manual atau terjadwal). Rilis mensyaratkan koreksi lengkap; jadwal yang sudah lewat tidak merilis hasil parsial. Kunci/pembahasan memerlukan izin tersendiri, terutama jika ujian masih dipakai peserta lain. Akses hasil individual Open Link memakai sesi/token hasil aman, bukan pencarian nama.

## 10. Rekap dan analitik

Dashboard menampilkan jumlah peserta terdaftar, belum mulai, aktif, final, dan menunggu koreksi. Mean, median, minimum, maksimum, distribusi, ranking, dan kelulusan memakai attempt final yang selesai dikoreksi; tampilkan jumlah sampel serta pengecualian. Usulan default: `terminated` dikecualikan, `timed_out` disertakan setelah koreksi lengkap. Jika belum ada data, tampilkan keadaan kosong, bukan angka nol yang menyesatkan.

Nilai sama mendapat peringkat sama; usulan default competition ranking `1, 2, 2, 4`. Waktu submit tidak menjadi pemecah seri. Untuk retake di masa depan, aturan attempt yang masuk rekap harus dipilih eksplisit.

Distribusi memakai interval `[0,20)`, `[20,40)`, `[40,60)`, `[60,80)`, `[80,100]`. Statistik per soal membedakan benar, salah, kosong, dan menunggu koreksi; distribusi multiple answer menghitung pilihan per opsi sehingga jumlah pilihan dapat melebihi peserta. Esai tidak diberi label benar/salah tanpa aturan eksplisit.

CSV wajib memuat identitas peserta, ujian, waktu mulai/selesai, poin, maksimum, persentase, status koreksi, dan kelulusan. Ekspor mengikuti filter yang terlihat, melindungi formula spreadsheet dari input peserta, dan tidak menyertakan password historis. XLSX menjadi peningkatan kenyamanan setelah alur CSV benar.

## 11. Monitoring dan intervensi

Mode Standard menyediakan timer, autosave, randomisasi, dan pembatasan sesi. Monitored menambah event aktivitas/warning dan menjadi default sumber. Strict menambah lock berbasis kebijakan yang dijelaskan sebelum mulai.

Rekam visibility, focus, koneksi, konflik sesi, start, submit, dan lock dengan ID event unik. Deduplikasi retry dan korelasikan blur/page-hidden dari satu kejadian agar tidak menghitung pelanggaran ganda. Putus koneksi dan heartbeat hilang bukan bukti kecurangan.

Dashboard dapat refetch dari database ketika realtime terlewat. Pengawas dapat unlock, memperpanjang waktu, mengakhiri attempt, mengizinkan perangkat baru, dan memberi catatan. Semua tindakan penting menyimpan aktor, alasan, waktu, dan perubahan. Threshold warning/lock belum ditetapkan; harus dipilih sebelum Strict diaktifkan, bukan menggunakan angka tersembunyi.

## 12. Arsitektur dan stack

Arsitektur **modular monolith, API-first, multi-tenant**, satu repository dan satu Supabase project per environment. Stack mengikuti sumber; versi dependency ditetapkan dan dikunci ketika implementasi dimulai, setelah verifikasi dokumentasi saat itu.

| Lapisan    | Teknologi dan tanggung jawab                                                  |
| ---------- | ----------------------------------------------------------------------------- |
| Web        | SolidJS, TypeScript strict, Vite, Solid Router                                |
| UI         | Tailwind CSS, Kobalte, Lucide, token desain Octopus                           |
| Editor     | Tiptap/ProseMirror melalui lifecycle Solid; tanpa asumsi adapter React        |
| Validasi   | Zod dan validasi backend; batas node rich text terdokumentasi                 |
| Database   | Supabase PostgreSQL, constraints, RLS, transaksi/RPC                          |
| API        | Supabase Edge Functions, autentikasi, otorisasi, orkestrasi                   |
| Media      | Supabase Storage privat dan akses terbatas                                    |
| Monitoring | Supabase Realtime sebagai notifikasi, PostgreSQL sebagai rekam resmi          |
| Tooling    | pnpm workspace, ESLint, Prettier sebagai formatter usulan, Vitest, Playwright |
| Deploy     | Vercel untuk web, Supabase untuk backend; local/staging/production terpisah   |

Struktur target, dibuat bertahap saat dibutuhkan:

```text
apps/web
packages/domain
packages/api-contract
packages/api-client
packages/question-import
packages/exam-client
packages/ui
packages/config
supabase/migrations
supabase/functions
supabase/tests
contracts/openapi.yaml
docs/
```

`domain` berisi model dan fungsi murni, tanpa DOM/Solid/Supabase SDK. `question-import` memisahkan deteksi/transformasi dari adapter transaksi editor. `exam-client` mengelola queue/recovery, bukan keputusan keamanan. Shared packages tidak mengimpor aplikasi atau membentuk circular dependencies. Backend memvalidasi seluruh aturan otoritatif walaupun klien memiliki validasi serupa.

Tauri kelak memakai ulang UI/packages TypeScript dengan adapter native. Flutter memakai kontrak API dan format konten yang sama melalui Dart, bukan komponen Solid. Format rich text harus mempunyai versi schema dan renderer siswa yang terdokumentasi agar multi-client memungkinkan.

## 13. Data dan kontrak API

| Domain     | Entitas utama                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| Identitas  | schools, school_memberships, user_profiles, classes, class_memberships                                |
| Soal       | question_banks, questions, question_versions, question_options, question_answer_keys, question_assets |
| Impor      | import_sessions, import_drafts                                                                        |
| Ujian      | exams, exam_questions, exam_participants, exam_access_credentials                                     |
| Pengerjaan | exam_attempts, exam_answers, exam_events, exam_session_tokens                                         |
| Nilai      | answer_grades, exam_grades, grade_overrides, grade_releases                                           |
| Audit      | audit_logs                                                                                            |

Gunakan UUID, konteks `school_id`, dan constraint relasi lintas tenant. Opsi/kunci harus terikat pada versi soal; jawaban unik per attempt dan soal; ID kredensial unik per ujian; poin berada dalam rentang sah; satu attempt/sesi aktif ditegakkan secara atomik sesuai kebijakan. Transaksi submit/save mengunci atau memeriksa state yang sama agar race tidak membuka perubahan sesudah finalisasi.

OpenAPI di `contracts/openapi.yaml` menjadi kontrak kanonis saat implementasi. Seluruh endpoint memakai `/v1`; types TypeScript/Dart diturunkan dari kontrak tersebut. Kelompok operasi: bank soal dan draft, publish/open/close ujian, generate/reset/revoke kredensial, public entry, start/resume, simpan jawaban, event, submit, koreksi, release, analitik, dan ekspor.

Respons sukses berbentuk `{ data: ... }`; gagal `{ error: { code, message } }` dengan HTTP status sesuai. Kode stabil mencakup `EXAM_NOT_OPEN`, `EXAM_CLOSED`, `INVALID_CREDENTIALS`, `ATTEMPT_EXPIRED`, `ATTEMPT_LOCKED`, `ATTEMPT_ALREADY_SUBMITTED`, `SESSION_CONFLICT`, `ANSWER_REVISION_CONFLICT`, dan `PERMISSION_DENIED`. Klien tidak mencocokkan teks pesan untuk menentukan perilaku.

Pisahkan TeacherQuestionDTO, StudentQuestionDTO, dan QuestionAnswerKeyDTO. DTO siswa menggunakan allowlist; jangan sekadar menyembunyikan kunci pada tampilan. Media privat harus diverifikasi terhadap hak akses attempt dan tidak membuka bank soal seluruh sekolah.

## 14. Keamanan dan operasional

- Guru memakai Supabase Auth; izin berasal dari membership database yang tidak dapat diubah bebas melalui metadata pengguna.
- RLS dan privileges diperiksa untuk seluruh tabel terekspos; guest tidak mendapat akses Data API generik.
- Secret/service-role tidak masuk frontend; operasi server tetap memeriksa tenant dan actor ketika memakai hak istimewa.
- Sanitasi paste dan rich text, batasi ukuran payload, verifikasi isi file, dan jangan memuat script/macro atau URL gambar eksternal tanpa kebijakan.
- Kredensial, token sesi, jawaban sensitif, dan kunci tidak dicetak pada log aplikasi.
- Rate limit diterapkan pada entry/login dan operasi rawan abuse. Retensi, backup, pemulihan, serta penghapusan data sekolah harus diputuskan sebelum pilot nyata.
- Pisahkan staging/production; semua perubahan skema melalui migration yang dapat membangun environment kosong. Deployment tidak menggunakan perubahan manual tanpa rekam.

## 15. Tahap implementasi dan kriteria selesai

| Tahap          | Hasil yang harus dapat dibuktikan                                                            |
| -------------- | -------------------------------------------------------------------------------------------- |
| 1. Fondasi     | Workspace, routing, token desain light/dark, Auth, tenant, migration, CI, kontrak awal       |
| 2. Authoring   | Dokumen 50 soal dapat disusun, undo, media, reopen draft, dan bulk save tanpa kehilangan isi |
| 3. Pengelolaan | Snapshot, jadwal, dua metode akses, peserta, publish/open/close                              |
| 4. Delivery    | Start/resume, timer server, autosave/revision, recovery, submit/timeout atomik               |
| 5. Penilaian   | Semua tipe MVP, koreksi manual, override, rilis, rekap, CSV, analitik dasar                  |
| 6. Monitoring  | Event idempoten, refetch, warning, lock/recovery, intervensi diaudit                         |
| 7. Pilot       | Uji keamanan, beban, mobile, aksesibilitas, backup/recovery, dokumen guru nyata              |
| 8. Native      | Tauri/Flutter setelah web lolos penerimaan                                                   |

Unit test menargetkan transformasi isi, parser, validasi, dan grading. Integration test mencakup tenant isolation/RLS, deadline, credential verification, finalisasi, idempotency, serta race save-submit. Playwright mencakup guru impor → publish → peserta jawab → refresh → submit → koreksi → rilis → ekspor di desktop dan mobile.

Pilot mensyaratkan: kunci tidak bocor pada network/storage siswa; guru sekolah lain ditolak; perubahan jam lokal tidak mengubah deadline; request setelah finalisasi ditolak; retry tidak menggandakan nilai/event; upload gagal tidak dianggap tersimpan; dua perangkat tidak memegang sesi aktif bersamaan tanpa izin; light/dark tetap terbaca dan semua aksi inti dapat dioperasikan dengan keyboard.

Pengujian guru menggunakan beberapa dokumen nyata dan membandingkan waktu serta jumlah tindakan pada 20–50 soal. Target peningkatan kuantitatif dan kapasitas peserta serentak ditetapkan berdasarkan pilot/load test; belum ada klaim performa pada tahap spesifikasi.

## 16. Keputusan yang perlu diselesaikan sebelum pilot

1. Matriks izin guru/admin, pembuatan sekolah pertama, dan undangan anggota.
2. Batas ukuran impor, gambar, jumlah soal, peserta, serta kapasitas serentak berdasarkan pengujian.
3. Topologi domain/cookie peserta, rate limiter, hashing kredensial, dan backend timeout worker yang terbukti berjalan.
4. Kebijakan retensi jawaban/draft/media, akses hasil, serta backup dan uji pemulihan.
5. Nilai threshold monitoring, kebijakan pengecualian, dan perangkat/browser yang didukung.

Default rancangan dalam dokumen ini menjadi titik awal implementasi; perubahan perlu dicatat sebagai keputusan. Identitas visual mengacu pada [spesifikasi desain](visual-design.md).
