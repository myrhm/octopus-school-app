# Spesifikasi Tambahan — Exam Management, Student Portal & Grading Analytics

**Produk:** Platform Ujian Online / CBT  
**Versi spesifikasi:** 1.1 — Extension  
**Status:** Tambahan terhadap spesifikasi Bulk Question Import v1.0  
**Frontend:** SolidJS + TypeScript  
**Hosting:** Vercel  
**Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)  
**Arsitektur:** Modular, API-first, Multi-tenant Ready

---

# 1. Perluasan Cakupan Produk

## 1.1. Tujuan

Memperluas sistem pembuatan soal menjadi platform penyelenggaraan ujian yang dapat digunakan oleh guru dan siswa.

Platform harus menyediakan tiga kemampuan utama:

1. **Create:** Membuat, mengimpor, menyusun, dan mengelola soal.
2. **Conduct & Monitor:** Menyelenggarakan ujian, mengelola peserta, mengatur waktu dan akses, serta mengawasi aktivitas ujian.
3. **Grade & Analyze:** Mengoreksi jawaban secara otomatis atau manual, merekap nilai, dan menyajikan analisis hasil ujian.

## 1.2. Tipe Pengguna

### Guru

Guru dapat:

- Membuat dan mengelola bank soal.
- Membuat ujian dari bank soal.
- Mengatur jadwal dan durasi ujian.
- Memilih metode akses peserta.
- Menghasilkan identitas peserta.
- Membagikan link ujian.
- Memantau pengerjaan secara real-time.
- Mengatur konsekuensi pelanggaran.
- Mengoreksi jawaban esai.
- Melihat dan mengekspor hasil ujian.

### Siswa / Peserta

Siswa dapat:

- Membuka link ujian.
- Mengisi identitas atau menggunakan kredensial yang diberikan.
- Membaca instruksi ujian.
- Mengerjakan soal.
- Berpindah antarsoal sesuai kebijakan.
- Melihat status jawaban.
- Mengirim jawaban.
- Melihat hasil apabila guru mengizinkannya.

Siswa tidak wajib memiliki akun permanen untuk mengikuti ujian.

### Administrator Sekolah (Future-Ready)

Administrator dapat mengelola guru, kelas, peserta, dan konfigurasi sekolah.

Role ini tidak harus memiliki dashboard lengkap pada MVP, tetapi arsitektur database perlu mendukung keberadaannya.

---

# 2. Exam Management

## 2.1. Create Exam

Guru dapat membuat ujian baru dengan informasi:

- Judul ujian.
- Mata pelajaran.
- Deskripsi dan instruksi.
- Kelas atau kelompok peserta (opsional).
- Daftar soal.
- Jumlah soal.
- Total nilai.
- Durasi pengerjaan.
- Jadwal mulai dan selesai.
- Metode akses.
- Kebijakan keamanan.
- Kebijakan hasil dan penilaian.

Guru dapat memilih soal yang sudah tersedia di bank soal maupun membuat soal baru.

Soal yang dimasukkan ke ujian harus menggunakan versi atau snapshot tertentu agar perubahan bank soal di masa depan tidak mengubah ujian yang sedang berjalan atau telah selesai.

## 2.2. Exam Lifecycle

Gunakan state:

`draft` — Ujian masih disusun.

`published` — Konfigurasi telah diterbitkan, tetapi peserta belum tentu bisa mengaksesnya.

`open` — Ujian menerima peserta sesuai aturan akses.

`paused` — Penerimaan atau aktivitas ujian dihentikan sementara sesuai kebijakan.

`closed` — Ujian tidak menerima pengerjaan baru.

`archived` — Ujian selesai diselenggarakan dan disimpan sebagai arsip.

State harus dikelola oleh backend.

Jangan menjadikan perubahan tampilan frontend sebagai sumber kebenaran status ujian.

---

# 3. Exam Access Modes

Sediakan dua mode utama.

## 3.1. Open Link Exam

**Deskripsi:** Siapa pun yang memiliki link ujian dapat mencoba mengikuti ujian selama aksesnya dibuka.

Contoh:

`https://exam.example.com/e/abc123xyz`

Alur:

1. Guru membuat ujian.
2. Guru memilih Open Link.
3. Sistem menghasilkan link unik dengan token yang sulit ditebak.
4. Guru membagikan link tersebut.
5. Peserta membuka halaman ujian.
6. Peserta mengisi nama dan informasi tambahan yang diwajibkan.
7. Sistem membuat sesi pengerjaan.
8. Peserta mengerjakan ujian.

### Konfigurasi

Guru dapat menentukan:

- Nama peserta wajib diisi.
- Nomor induk atau identifikasi tambahan opsional.
- Apakah nama peserta boleh sama.
- Maksimum pengerjaan per sesi peserta.
- Apakah peserta boleh memulai ulang.
- Apakah hasil langsung ditampilkan.

### Catatan keamanan

Mode ini tidak dapat menjamin identitas peserta.

Nama yang diisi merupakan identitas deklaratif, bukan autentikasi.

Sistem perlu menyatakan secara eksplisit bahwa Open Link cocok untuk kuis, latihan, survei pengetahuan, atau ujian dengan kebutuhan verifikasi identitas rendah.

Jangan menganggap dua nama berbeda sebagai dua orang berbeda, atau satu nama yang sama sebagai orang yang pasti sama.

## 3.2. Credential-Based Exam

**Deskripsi:** Hanya peserta dengan ID dan password yang valid yang dapat memulai ujian.

Contoh kredensial:

    Student ID: MATH8A-001
    Password: K7p9Q2vL

ID merupakan identitas peserta untuk ujian, bukan harus sama dengan akun Supabase Auth atau nomor induk siswa.

### Alur

1. Guru membuka pengaturan peserta.
2. Guru memilih Generate Student Credentials.
3. Guru menentukan jumlah peserta atau mengimpor daftar nama.
4. Sistem membuat ID dan password unik.
5. Guru mendistribusikan kredensial.
6. Siswa membuka link ujian.
7. Siswa memasukkan ID dan password.
8. Backend memverifikasi kredensial.
9. Sistem membuat sesi pengerjaan untuk peserta tersebut.
10. Siswa diarahkan ke halaman ujian.

### Generate Credentials

Dukung:

- Generate untuk satu peserta.
- Generate untuk sejumlah N peserta.
- Generate berdasarkan daftar nama.
- Import daftar peserta melalui CSV.
- Regenerate password peserta tertentu.
- Disable atau revoke credentials.
- Export kredensial untuk distribusi guru.

### Perlindungan kredensial

- Password dihasilkan menggunakan cryptographically secure random generator.
- Password disimpan dalam bentuk hash menggunakan algoritma password hashing yang sesuai, seperti Argon2id.
- Password asli hanya tersedia pada saat pembuatan atau reset.
- Backend menerapkan rate limiting pada percobaan login.
- ID peserta harus unik dalam cakupan ujian yang ditentukan.
- Guru dapat mengatur ulang password jika hilang.
- Kredensial tidak boleh dipublikasikan melalui endpoint peserta.

### Batasan

Metode ini mengurangi risiko siswa memasukkan nama peserta lain secara sembarangan, tetapi tidak dapat mencegah siswa membagikan ID dan password kepada orang lain.

Identitas kredensial dan identitas fisik peserta merupakan dua hal berbeda.

---

# 4. Exam Availability & Scheduling

## 4.1. Scheduled Availability

Guru dapat menentukan:

- `opens_at`
- `closes_at`
- `duration_minutes`

Contoh:

    Ujian: Matematika Kelas 8
    Dibuka: 08.00
    Ditutup: 10.00
    Durasi: 60 menit

Peserta yang memulai pada pukul 08.15 memiliki batas pengerjaan 09.15.

Peserta yang memulai pukul 09.30 hanya mempunyai waktu sampai pukul 10.00 apabila kebijakan penutupan bersifat hard deadline.

Rumus default:

`attempt_deadline = min(started_at + duration, closes_at)`

Guru dapat memilih kebijakan lain di masa depan, misalnya waktu penutupan hanya membatasi dimulainya ujian, sedangkan peserta yang sudah mulai tetap memperoleh durasi penuh.

Untuk MVP, gunakan hard deadline sebagai default dan tampilkan konsekuensinya dengan jelas di editor ujian.

## 4.2. Manual Open/Close

Guru dapat membuka atau menutup ujian secara manual.

Tombol:

- Open Exam
- Close Exam
- Reopen Exam

Saat guru menutup ujian, sistem harus membedakan:

**Close Entry:** Menolak peserta baru, tetapi peserta yang sedang mengerjakan dapat melanjutkan sampai tenggat masing-masing.

**End All Attempts:** Mengakhiri seluruh sesi aktif, menyimpan jawaban terakhir, dan memfinalisasi sesuai kebijakan.

Kedua tindakan harus dibedakan secara eksplisit untuk menghindari pengakhiran ujian yang tidak disengaja.

## 4.3. Server Time Authority

Semua aturan waktu ditentukan server.

Frontend hanya menampilkan countdown berdasarkan waktu dan deadline yang diberikan backend.

Jika pengguna mengubah jam perangkat, durasi resmi tidak berubah.

Simpan timestamp dalam UTC dan tampilkan menggunakan timezone sekolah.

---

# 5. Student Exam Portal

## 5.1. Entry Page

Halaman entry menampilkan:

- Judul ujian.
- Mata pelajaran.
- Instruksi.
- Durasi.
- Jadwal.
- Status ujian.
- Form identitas atau login sesuai access mode.

Jangan mengekspos konten soal sebelum peserta dinyatakan berhak mengakses ujian.

## 5.2. Exam Instructions

Sebelum ujian dimulai, tampilkan:

- Jumlah soal.
- Jenis soal.
- Durasi.
- Aturan navigasi.
- Kebijakan perpindahan tab.
- Konsekuensi pelanggaran.
- Kebijakan penyimpanan dan submit.
- Informasi apakah nilai akan ditampilkan.

Peserta harus melakukan konfirmasi sebelum memulai.

## 5.3. Exam Interface

Tampilan peserta mengutamakan responsivitas untuk desktop dan HP.

Komponen utama:

**Exam Header**

- Judul ujian.
- Waktu tersisa.
- Status penyimpanan.
- Tombol Submit.

**Question Viewer**

- Pertanyaan.
- Gambar.
- Tabel atau konten rich text.
- Pilihan jawaban atau input esai.

**Question Navigator**

- Daftar nomor soal.
- Status sudah dijawab.
- Status belum dijawab.
- Soal ditandai untuk ditinjau.
- Nomor soal aktif.

**Exam Footer**

- Previous.
- Next.
- Mark for Review.
- Submit Exam.

Untuk mobile, navigasi soal dapat menggunakan bottom sheet atau panel yang dapat dibuka.

## 5.4. Question Navigation

Guru dapat memilih:

**Free Navigation:** Peserta dapat berpindah soal secara bebas.

**Sequential Navigation:** Peserta harus mengerjakan soal berurutan, dengan aturan kembali ke soal sebelumnya yang dapat dikonfigurasi.

Default MVP: Free Navigation.

## 5.5. Autosave

Jawaban otomatis tersimpan.

Mekanisme:

- Simpan ketika jawaban berubah.
- Gunakan debounce untuk teks panjang.
- Kirim ke backend menggunakan request idempotent.
- Simpan antrean perubahan lokal ketika offline.
- Sinkronisasi ketika koneksi kembali.
- Tampilkan indikator status penyimpanan.

Backend wajib memvalidasi apakah attempt masih aktif dan belum melewati deadline.

Autosave tidak boleh berhasil mengubah jawaban setelah ujian difinalisasi.

## 5.6. Submit Exam

Peserta menekan Submit.

Tampilkan konfirmasi:

- Jumlah soal dijawab.
- Jumlah soal belum dijawab.
- Peringatan bahwa jawaban tidak dapat diubah setelah submit.

Setelah submit berhasil:

- Attempt menjadi final.
- Jawaban terkunci.
- Sistem menampilkan halaman penyelesaian.
- Penilaian otomatis dijalankan jika memungkinkan.

Submit harus idempotent agar retry tidak menghasilkan penilaian atau submission ganda.

---

# 6. Exam Attempts & Session Management

Setiap pengerjaan ujian direpresentasikan sebagai `exam_attempt`.

State:

- `in_progress`
- `locked`
- `submitted`
- `timed_out`
- `terminated`

Guru dapat mengizinkan satu atau lebih pengerjaan sesuai kebijakan ujian.

Default untuk ujian formal: satu attempt per peserta terautentikasi.

Untuk Open Link tanpa identitas terverifikasi, batas pengerjaan hanya bersifat best-effort.

## 6.1. Single Active Session

Untuk Credential-Based Exam, sistem sebaiknya hanya mengizinkan satu sesi aktif per attempt.

Jika kredensial digunakan pada perangkat lain:

- Sistem mendeteksi konflik sesi.
- Peserta tidak otomatis memperoleh akses ke sesi baru.
- Pengawas dapat mengizinkan perpindahan perangkat.
- Perubahan sesi dicatat di audit log.

Session token tidak boleh digunakan sebagai satu-satunya pembuktian identitas jangka panjang.

## 6.2. Recovery

Jika browser ditutup atau koneksi terputus:

- Peserta dapat masuk kembali dengan kredensial yang valid.
- Sistem memulihkan attempt yang sama.
- Jawaban yang telah tersimpan tetap tersedia.
- Timer tetap berjalan berdasarkan waktu server.
- Pengawas dapat menangani sesi terkunci.

---

# 7. Exam Security & Monitoring

## 7.1. Security Modes

Sediakan:

**Standard:** Timer, autosave, randomisasi, pembatasan sesi.

**Monitored:** Standard + deteksi halaman tidak aktif, warning, dan log pengawas.

**Strict:** Monitored + kebijakan penguncian berdasarkan jumlah kejadian tertentu.

Default: Monitored.

## 7.2. Event Monitoring

Event yang dapat direkam:

    PAGE_HIDDEN
    PAGE_VISIBLE
    WINDOW_BLUR
    WINDOW_FOCUS
    CONNECTION_LOST
    CONNECTION_RESTORED
    SESSION_CONFLICT
    EXAM_STARTED
    EXAM_SUBMITTED
    EXAM_LOCKED

Tidak semua event merupakan pelanggaran.

Contohnya, kehilangan koneksi tidak boleh otomatis dianggap sebagai upaya kecurangan.

Deteksi browser bersifat best-effort dan dapat dibatasi oleh OS, browser, atau manipulasi klien.

## 7.3. Violation Policy

Guru dapat mengatur:

- Jumlah kejadian yang memicu peringatan.
- Jumlah kejadian yang memicu notifikasi pengawas.
- Jumlah kejadian yang memicu penguncian.
- Apakah pengawas dapat memberikan pengecualian.

Sistem tidak boleh menghapus jawaban ketika attempt terkunci.

## 7.4. Dashboard Pengawas

Guru dapat melihat:

- Jumlah peserta yang terdaftar.
- Jumlah peserta yang belum mulai.
- Jumlah peserta aktif.
- Jumlah peserta sudah submit.
- Peserta yang kehilangan koneksi.
- Peserta dengan pelanggaran.
- Peserta yang terkunci.
- Waktu tersisa.
- Progress pengerjaan.

Sediakan filter berdasarkan status peserta.

Realtime dapat menggunakan Supabase Realtime atau mekanisme polling yang sesuai.

Event harus diterapkan dengan idempotency agar retry tidak menggandakan penghitung pelanggaran.

### Aksi Pengawas

Guru dapat:

- Melihat detail sesi.
- Membuka kembali sesi terkunci.
- Memperpanjang waktu peserta tertentu.
- Mengakhiri attempt.
- Mengizinkan perpindahan perangkat.
- Memberi catatan pengawasan.

Semua tindakan penting tercatat di audit log.

---

# 8. Automatic Grading

## 8.1. Multiple Choice

Sistem otomatis memberikan nilai setelah attempt difinalisasi.

Untuk single choice:

`score = question_points` apabila pilihan peserta sama dengan kunci.

Jika tidak sesuai:

`score = 0`

Jawaban kosong mendapat nilai 0.

Contoh:

    Question 1: 10 points
    Correct answer: B
    Student answer: B
    Score: 10

    Question 2: 10 points
    Correct answer: C
    Student answer: A
    Score: 0

Penilaian harus dijalankan di backend dengan kunci yang tidak dapat dibaca peserta.

## 8.2. Multiple Correct Answers

Untuk soal dengan beberapa jawaban benar, gunakan exact match sebagai default MVP.

Peserta mendapat nilai penuh hanya jika seluruh pilihan benar dipilih dan tidak ada pilihan salah yang dipilih.

Partial credit dapat ditambahkan kemudian sebagai kebijakan penilaian tersendiri.

## 8.3. Essay Grading

Jawaban esai dikoreksi guru secara manual.

UI koreksi menampilkan:

- Pertanyaan.
- Jawaban siswa.
- Model jawaban jika tersedia.
- Bobot maksimum.
- Input nilai.
- Catatan guru.

Guru dapat berpindah antarjawaban siswa tanpa kembali ke daftar utama.

## 8.4. Short Answer

Untuk jawaban singkat, guru dapat menentukan accepted answers.

Gunakan normalisasi yang eksplisit, seperti trimming whitespace dan case-insensitive matching.

Jangan menggunakan semantic similarity tanpa persetujuan atau algoritma yang jelas.

## 8.5. Grade Status

Gunakan:

- `not_graded`
- `partially_graded`
- `graded`
- `released`

Nilai pilihan ganda dapat langsung dihitung, tetapi nilai akhir ujian yang mengandung esai belum dianggap selesai sampai seluruh bagian wajib dikoreksi.

## 8.6. Grade Overrides

Guru dapat mengubah nilai hasil koreksi otomatis melalui tindakan override yang disengaja.

Setiap override wajib mencatat:

- Nilai awal.
- Nilai baru.
- Guru yang mengubah.
- Waktu perubahan.
- Alasan perubahan.

Jangan mengubah kunci jawaban historis secara diam-diam ketika guru melakukan override satu peserta.

---

# 9. Grading Dashboard & Analytics

## 9.1. Exam Overview

Dashboard nilai menampilkan:

- Total peserta.
- Peserta yang telah submit.
- Peserta belum mengerjakan.
- Peserta belum selesai.
- Jumlah jawaban yang menunggu koreksi.
- Nilai rata-rata.
- Nilai median.
- Nilai tertinggi.
- Nilai terendah.
- Persentase kelulusan.

Statistik hanya boleh menggunakan attempt yang memenuhi kriteria perhitungan yang dinyatakan jelas.

Misalnya, peserta yang belum mengerjakan tidak boleh otomatis dianggap memiliki nilai nol dalam rata-rata nilai peserta yang telah dinilai.

## 9.2. Grade Standard

Guru dapat menentukan batas kelulusan.

Contoh:

`Passing Grade = 75`

Secara UI, siswa dapat dikelompokkan menjadi:

- Meets Standard: nilai >= 75.
- Below Standard: nilai < 75.
- Pending: belum mempunyai nilai final.

Passing grade disimpan per ujian.

Istilah KKM/KKTP dapat digunakan sebagai label yang dapat dikonfigurasi sesuai kebijakan sekolah, tanpa mengasumsikan semuanya memiliki makna administratif yang identik.

## 9.3. Student Ranking

Tampilkan tabel nilai yang dapat diurutkan.

Kolom:

    Rank
    Student Name
    Student ID
    Score
    Correct Answers
    Incorrect Answers
    Unanswered
    Submission Time
    Status

Guru dapat mengurutkan berdasarkan:

- Nilai tertinggi.
- Nilai terendah.
- Nama.
- Waktu submit.
- Status kelulusan.

Sistem ranking harus mempunyai aturan tie yang konsisten.

Default: nilai sama mendapatkan peringkat yang sama.

Tidak perlu menggunakan waktu pengerjaan sebagai pemecah seri kecuali guru memilih kebijakan tersebut.

## 9.4. Grade Distribution

Tampilkan grafik distribusi nilai.

Contoh kelompok:

    0–19
    20–39
    40–59
    60–79
    80–100

Untuk ujian yang menggunakan skala berbeda, data dinormalisasi ke persentase agar perbandingan mudah dipahami.

## 9.5. Question-Level Analytics

Untuk setiap soal, tampilkan:

- Jumlah peserta yang menjawab.
- Jumlah jawaban benar.
- Jumlah jawaban salah.
- Jumlah tidak menjawab.
- Persentase benar.
- Distribusi pilihan jawaban.

Contoh:

    Question 17
    Correct Answer: C

    A: 5 students
    B: 8 students
    C: 24 students
    D: 3 students

    Correct Rate: 60%

Ini memungkinkan guru mengidentifikasi soal yang paling banyak dijawab salah.

Analisis lanjutan seperti daya pembeda, reliabilitas, dan analisis butir psikometrik dapat menjadi fitur versi selanjutnya.

## 9.6. Student Detail

Guru dapat membuka detail setiap siswa untuk melihat:

- Identitas.
- Waktu mulai.
- Waktu selesai.
- Durasi pengerjaan.
- Jawaban seluruh soal.
- Jawaban benar dan salah.
- Total nilai.
- Status kelulusan.
- Catatan koreksi.
- Riwayat kejadian pengawasan.

## 9.7. Export Results

MVP harus menyediakan ekspor CSV.

Ekspor XLSX dianjurkan karena lebih nyaman untuk workflow guru.

Data ekspor dapat berisi:

    Student ID
    Student Name
    Exam Title
    Started At
    Submitted At
    Score
    Maximum Score
    Percentage
    Passing Status
    Grading Status

Ekspor detail jawaban dapat menjadi sheet atau file terpisah.

---

# 10. Student Results

Guru mengatur kebijakan publikasi nilai.

Mode:

**Hidden:** Peserta hanya melihat konfirmasi bahwa ujian telah selesai.

**Score Only:** Peserta dapat melihat nilai setelah dirilis.

**Score and Review:** Peserta dapat melihat nilai, jawaban sendiri, dan pembahasan sesuai pengaturan.

**Scheduled Release:** Hasil ditampilkan pada waktu yang ditentukan.

Untuk ujian yang memungkinkan pengerjaan berulang atau masih digunakan oleh peserta lain, kunci jawaban dan pembahasan tidak boleh otomatis diekspos.

Pada mode Open Link, akses hasil individual harus menggunakan token hasil yang aman atau mekanisme autentikasi sesuai tingkat kerahasiaan hasil.

---

# 11. Data Architecture

Tambahkan entitas berikut ke desain database sebelumnya.

## 11.1. Exam

    exams
      id
      school_id
      created_by
      title
      description
      status
      access_mode
      opens_at
      closes_at
      duration_minutes
      passing_grade
      security_policy
      grading_policy
      result_visibility
      created_at
      updated_at

## 11.2. Exam Questions

    exam_questions
      id
      exam_id
      question_version_id
      order_index
      points

Setiap ujian mereferensikan versi soal yang stabil.

## 11.3. Exam Participants

    exam_participants
      id
      exam_id
      student_id
      display_name
      credential_identifier
      credential_hash
      credential_status
      created_at

Untuk mode Open Link, peserta dapat diregistrasikan pada saat memulai ujian.

Untuk Credential-Based Exam, peserta dibuat terlebih dahulu.

## 11.4. Exam Attempts

    exam_attempts
      id
      exam_id
      participant_id
      status
      started_at
      deadline_at
      submitted_at
      locked_at
      session_version
      created_at
      updated_at

## 11.5. Exam Answers

    exam_answers
      id
      attempt_id
      exam_question_id
      selected_option_ids
      text_answer
      revision
      saved_at

Jawaban harus mempunyai batasan keunikan yang sesuai per attempt dan soal.

## 11.6. Grading

    exam_grades
      id
      attempt_id
      total_score
      max_score
      percentage
      grading_status
      graded_at
      released_at

    answer_grades
      id
      exam_answer_id
      awarded_points
      grading_method
      feedback
      graded_by

## 11.7. Security & Audit

    exam_events
      id
      attempt_id
      event_type
      event_idempotency_key
      occurred_at
      received_at
      metadata

    exam_audit_logs
      id
      exam_id
      actor_id
      action
      previous_value
      new_value
      created_at

---

# 12. API Contract

Sediakan antarmuka backend yang independen dari framework frontend.

Contoh operasi:

### Teacher APIs

    POST /exams
    PATCH /exams/{id}
    POST /exams/{id}/publish
    POST /exams/{id}/open
    POST /exams/{id}/close
    POST /exams/{id}/participants/generate
    GET  /exams/{id}/participants
    GET  /exams/{id}/monitoring
    GET  /exams/{id}/grades
    GET  /exams/{id}/analytics
    POST /exams/{id}/grades/release

### Student APIs

    GET  /public/exams/{token}
    POST /public/exams/{token}/entry
    POST /attempts/{id}/resume
    GET  /attempts/{id}
    PUT  /attempts/{id}/answers/{questionId}
    POST /attempts/{id}/events
    POST /attempts/{id}/submit
    GET  /attempts/{id}/result

Endpoint ini merupakan kontrak konseptual. Implementasi dapat menggunakan Supabase Edge Functions dan RPC PostgreSQL.

Pastikan operasi bisnis sensitif divalidasi di backend, bukan hanya menggunakan RLS frontend-facing.

Credential verification, submit, perubahan status ujian, dan grading harus menggunakan otorisasi server yang tegas.

---

# 13. Dashboard Structure

## 13.1. Teacher Dashboard

Halaman utama guru:

**Overview**

Ringkasan ujian aktif, ujian mendatang, ujian selesai, dan pekerjaan koreksi yang menunggu.

**Question Bank**

Kumpulan soal, kategori, search, filter, Bulk Import, dan manual editor.

**Exams**

Daftar ujian, pembuatan ujian, konfigurasi akses, dan jadwal.

**Monitoring**

Dashboard peserta, progress, status koneksi, dan kejadian keamanan.

**Grades & Analytics**

Nilai, ranking, distribusi, evaluasi per soal, dan ekspor.

**Settings**

Profil, pengaturan sekolah, serta preferensi ujian default.

## 13.2. Student Portal

Halaman siswa:

**Exam Entry**

Mengisi identitas atau kredensial.

**Instructions**

Membaca aturan ujian.

**Exam Session**

Mengerjakan soal.

**Completion**

Konfirmasi penyelesaian.

**Results**

Melihat hasil apabila diizinkan.

Tidak diperlukan dashboard siswa yang kompleks pada MVP.

---

# 14. MVP Implementation Priority

## Phase 1 — Question Authoring

- Manual question editor.
- Bulk paste.
- Split and merge questions.
- Answer option extraction.
- Answer key assignment.
- Image attachment.
- Question bank.

## Phase 2 — Exam Delivery

- Create exam.
- Exam scheduling.
- Open Link.
- Credential-Based Access.
- Student interface.
- Autosave.
- Submit.
- Server-authoritative timer.

## Phase 3 — Grading

- Automatic multiple-choice grading.
- Manual essay grading.
- Passing grade.
- Student result table.
- Grade release.
- CSV/XLSX export.

## Phase 4 — Monitoring

- Real-time session dashboard.
- Activity and violation logs.
- Warnings.
- Session locking and recovery.
- Teacher interventions.

## Phase 5 — Advanced Analytics

- Question-level statistics.
- Grade distribution.
- Ranking filters.
- Performance comparison.
- Advanced question analysis.

Core database design must support all five phases from the beginning, but the implementation should remain incremental.

---

# 15. Acceptance Criteria

The system is ready for an initial school pilot when:

1. Guru dapat membuat soal secara manual maupun melalui Bulk Import.
2. Guru dapat membuat ujian menggunakan kumpulan soal tersebut.
3. Guru dapat membagikan link ujian.
4. Guru dapat mengatur waktu mulai, waktu selesai, dan durasi.
5. Guru dapat membuka dan menutup ujian secara manual.
6. Peserta dapat mengikuti Open Link Exam tanpa akun permanen.
7. Guru dapat menghasilkan kredensial individual.
8. Peserta dengan kredensial tidak valid tidak dapat memulai ujian terbatas.
9. Jawaban peserta tersimpan otomatis.
10. Timer tidak dapat dimanipulasi hanya dengan mengubah waktu perangkat.
11. Refresh atau gangguan koneksi tidak otomatis menghapus progres.
12. Multiple-choice grading menghasilkan nilai sesuai kunci dan bobot soal.
13. Jawaban esai dapat dikoreksi secara manual.
14. Guru dapat melihat nilai peserta dan status kelulusan.
15. Guru dapat mengurutkan peserta berdasarkan nilai.
16. Guru dapat mengekspor hasil ujian.
17. Guru dapat memantau status pengerjaan dan melihat catatan kejadian.
18. Data sekolah dan hasil peserta dilindungi melalui authorization yang sesuai.
19. Kunci jawaban tidak dapat dibaca peserta sebelum waktu pengungkapan yang diizinkan.
20. Sistem dapat dijalankan pada browser desktop dan mobile yang didukung.

---

# 16. Product Design Principle

Platform tidak boleh sekadar meniru Google Forms dengan menambahkan timer.

Keunggulan produk harus berasal dari integrasi seluruh workflow guru:

**Existing Documents → Question Import → Question Bank → Exam Publishing → Student Participation → Monitoring → Automatic Grading → Learning Analytics.**

Pembuatan ujian harus sederhana bagi guru yang tidak memiliki pengetahuan teknis.

Peserta seharusnya dapat mengikuti ujian tanpa proses registrasi rumit.

Guru harus memperoleh hasil penilaian yang langsung bisa digunakan untuk evaluasi dan administrasi pembelajaran.

Keamanan ujian diperlakukan sebagai rangkaian kontrol dan mekanisme monitoring yang realistis, bukan klaim bahwa aplikasi dapat menghilangkan seluruh kemungkinan kecurangan.
