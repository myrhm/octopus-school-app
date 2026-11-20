# OCTOPUS — Technical Architecture & Engineering Specification

**Version:** 1.0  
**Architecture:** Modular Monolith, API-First, Multi-Client  
**Package Manager:** pnpm  
**Primary Frontend:** SolidJS + TypeScript + Vite  
**Backend:** Supabase + PostgreSQL  
**Deployment:** Vercel + Supabase  
**Future Clients:** Tauri Desktop, Flutter Android  
**AI Dependency:** None

---

# 1. Architecture Objectives

Octopus adalah platform manajemen ujian yang menangani tiga domain utama:

1. **Question Authoring:** Pembuatan soal manual, bulk import, bank soal, dan pengelolaan media.
2. **Exam Delivery:** Pembuatan ujian, pengaturan akses, penyelenggaraan ujian, pengerjaan siswa, dan pengawasan.
3. **Grading & Analytics:** Penilaian otomatis, koreksi manual, statistik nilai, dan pelaporan.

Arsitektur harus memenuhi persyaratan berikut:

- Satu backend dapat melayani beberapa jenis aplikasi.
- Business logic otoritatif tidak bergantung pada frontend.
- Frontend tidak mempunyai akses langsung yang tidak terkontrol terhadap data sensitif.
- Shared TypeScript packages dapat digunakan Web dan Tauri.
- Flutter dapat menggunakan API yang sama tanpa perlu menulis ulang backend.
- Fitur dapat dikembangkan sebagai modul independen.
- Kode mudah diuji dengan unit, integration, dan end-to-end tests.
- Aplikasi dapat berkembang menjadi SaaS untuk banyak sekolah.
- Kompleksitas awal tetap proporsional dengan kebutuhan MVP.

Gunakan **Modular Monolith**, bukan microservices.

Masing-masing modul mempunyai tanggung jawab yang jelas, tetapi seluruh sistem tetap berada dalam satu repository dan menggunakan satu Supabase project per environment.

---

# 2. Technology Stack

## 2.1. Web Frontend

- SolidJS
- TypeScript dengan strict mode
- Vite
- Solid Router / @solidjs/router
- Tailwind CSS
- Kobalte untuk accessible UI primitives
- Tiptap / ProseMirror untuk rich-text editor
- Zod untuk validasi dan parsing data eksternal
- Lucide untuk ikon

Gunakan SolidJS SPA sebagai basis MVP.

Hindari penambahan framework SSR apabila tidak diperlukan.

## 2.2. Backend

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- PostgreSQL Functions / RPC
- Supabase Realtime

Distribusi tanggung jawab:

**PostgreSQL**

Data integrity, relasi, constraints, RLS, transaksi atomik, dan state transition yang harus konsisten.

**Edge Functions**

HTTP API, pemeriksaan autentikasi/otorisasi, verifikasi kredensial peserta, orkestrasi domain, validasi request, rate limiting melalui mekanisme yang sesuai, dan respons terstruktur.

**Storage**

Penyimpanan gambar soal dan aset lainnya.

**Realtime**

Sinkronisasi status peserta dan monitoring guru.

## 2.3. Testing

- Vitest untuk unit tests.
- Playwright untuk browser E2E.
- PostgreSQL integration tests untuk database functions, constraints, dan RLS.
- Supabase local environment untuk integration testing.
- TypeScript typecheck dan ESLint.
- Formatter konsisten melalui Prettier atau Biome; pilih satu konfigurasi utama.

## 2.4. Package Management

Gunakan pnpm Workspace.

Commit file:

- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- Root `package.json`

Konfigurasi harus memastikan semua package menggunakan versi dependency yang kompatibel.

---

# 3. Repository Structure

Gunakan monorepo dengan pemisahan aplikasi, shared packages, backend, dan dokumentasi.

    octopus/
    │
    ├── apps/
    │   ├── web/
    │   │   ├── src/
    │   │   │   ├── app/
    │   │   │   ├── routes/
    │   │   │   ├── features/
    │   │   │   ├── components/
    │   │   │   ├── hooks/
    │   │   │   └── styles/
    │   │   ├── public/
    │   │   ├── package.json
    │   │   └── vite.config.ts
    │   │
    │   ├── desktop/                # Future Tauri
    │   │   └── src-tauri/
    │   │
    │   └── android/                # Future Flutter
    │       └── ...
    │
    ├── packages/
    │   ├── domain/
    │   ├── api-contract/
    │   ├── api-client/
    │   ├── question-import/
    │   ├── exam-client/
    │   ├── ui/
    │   └── config/
    │
    ├── supabase/
    │   ├── migrations/
    │   ├── functions/
    │   ├── tests/
    │   └── config.toml
    │
    ├── contracts/
    │   └── openapi.yaml
    │
    ├── docs/
    │   ├── architecture/
    │   ├── decisions/
    │   ├── security/
    │   └── product/
    │
    ├── package.json
    ├── pnpm-workspace.yaml
    ├── pnpm-lock.yaml
    └── tsconfig.base.json

Folder future clients dapat dibuat ketika pengembangannya dimulai; tidak perlu mengisi seluruh struktur sejak MVP.

## 3.1. pnpm Workspace

Contoh:

    packages:
      - "apps/web"
      - "apps/desktop"
      - "packages/*"

Flutter bukan package JavaScript dan tidak dikelola secara native oleh pnpm.

Flutter tetap berada di monorepo, tetapi menggunakan Dart/Flutter toolchain sendiri.

## 3.2. Root Scripts

Sediakan command standar:

    pnpm dev
    pnpm build
    pnpm test
    pnpm test:e2e
    pnpm typecheck
    pnpm lint
    pnpm format

Root scripts dapat menjalankan perintah workspace menggunakan `pnpm --filter`.

Misalnya:

    pnpm --filter @octopus/web dev

Buat root scripts setelah nama package dan struktur aktual ditetapkan.

---

# 4. Module Boundaries

## 4.1. Domain Package

`packages/domain`

Berisi model data dan fungsi domain murni yang dapat digunakan bersama klien TypeScript.

Contoh:

    Question
    QuestionOption
    Exam
    ExamStatus
    ExamAttempt
    ExamAnswer
    Grade
    SecurityEvent

Termasuk:

- TypeScript types.
- Zod schemas.
- Enum/domain constants.
- Pure validation helpers.
- Formatting-independent domain utilities.

Tidak boleh bergantung pada:

- SolidJS.
- Browser DOM.
- Tauri.
- Supabase SDK.
- UI components.

Domain package bukan sumber otoritatif untuk keamanan. Server harus tetap menjalankan validasinya sendiri.

## 4.2. API Contract Package

`packages/api-contract`

Berisi kontrak request/response yang digunakan untuk komunikasi backend.

Canonical contract menggunakan OpenAPI.

TypeScript types dapat dihasilkan dari kontrak tersebut.

Untuk Flutter, generate Dart API client atau DTO berdasarkan kontrak yang sama menggunakan generator yang kompatibel.

Hindari mempertahankan definisi API secara manual di beberapa bahasa yang berbeda.

## 4.3. API Client Package

`packages/api-client`

Tanggung jawab:

- HTTP requests.
- Authentication/session header.
- Request/response parsing.
- Error normalization.
- Retry policy terbatas.
- API versioning.
- Typed response handling.

Tidak boleh mengandung:

- Komponen SolidJS.
- Tampilan dialog.
- Business rules keamanan otoritatif.
- Database queries yang melewati kontrak API.

## 4.4. Question Import Package

`packages/question-import`

Berisi logika semi-manual import:

    parseDelimiter()
    detectQuestionBoundaries()
    detectAnswerOptions()
    splitQuestion()
    mergeQuestions()
    extractOption()
    extractMultipleOptions()
    returnOptionToQuestion()
    reorderOptions()

Fungsi domain transformasi harus terpisah dari interaksi editor Tiptap.

Adapter Tiptap bertanggung jawab menerjemahkan selection dan transaction ProseMirror menjadi operasi transformasi.

## 4.5. Exam Client Package

`packages/exam-client`

Mengelola client-side exam workflow:

- Load exam.
- Initialize attempt.
- Track answer state.
- Queue autosave.
- Detect synchronization failure.
- Resume attempt.
- Track remaining time for display.
- Submit workflow.

Timer frontend hanya bersifat presentasional.

Backend tetap menentukan batas waktu resmi.

## 4.6. UI Package

`packages/ui`

Berisi komponen SolidJS reusable:

- Button.
- Input.
- Dialog.
- Modal.
- DataTable.
- StatusBadge.
- EmptyState.
- LoadingState.
- Form components.
- Responsive layout components.

Jangan menggabungkan business logic ujian ke dalam generic UI components.

Package ini digunakan oleh Web dan Tauri, tetapi tidak oleh Flutter.

---

# 5. Frontend Feature Architecture

Gunakan pendekatan feature-based.

Contoh:

    apps/web/src/features/
    │
    ├── auth/
    ├── schools/
    ├── question-bank/
    ├── question-authoring/
    ├── question-import/
    ├── exams/
    ├── exam-delivery/
    ├── monitoring/
    ├── grading/
    ├── analytics/
    └── settings/

Setiap feature dapat memiliki:

    components/
    services/
    stores/
    hooks/
    schemas/
    tests/

Tidak harus membuat semua subfolder jika belum dibutuhkan.

## 5.1. UI / State / API Separation

Contoh alur:

    ExamPage
       ↓
    ExamController / Store
       ↓
    ExamService
       ↓
    API Client
       ↓
    Backend

Komponen UI tidak seharusnya mengimplementasikan aturan penyelesaian ujian melalui query database langsung.

Contoh:

    const result = await examService.submitAttempt(attemptId);

`examService` menangani interaksi klien dan delegasi API.

Backend memutuskan apakah attempt boleh disubmit.

## 5.2. SolidJS State

Gunakan primitives SolidJS:

- createSignal.
- createMemo.
- createEffect.
- createResource.
- createStore, jika cocok untuk state kompleks.

Tidak perlu menambahkan state management library global sebelum ada kebutuhan nyata.

Gunakan local state untuk UI dan feature-level stores untuk state yang dibagi dalam satu feature.

Server state dan local editing state harus dibedakan.

---

# 6. Backend Domain Architecture

Kelompokkan operasi backend berdasarkan domain:

    supabase/functions/
    │
    ├── exam-api/
    ├── participant-api/
    ├── attempt-api/
    ├── grading-api/
    └── teacher-api/

Shared function helpers dapat diletakkan di:

    supabase/functions/_shared/

Contohnya:

    auth/
    errors/
    validation/
    responses/
    permissions/

Jangan membuat setiap CRUD sederhana sebagai Edge Function terpisah apabila fungsi tersebut aman dan lebih tepat ditangani melalui PostgreSQL serta RLS.

Tetapi operasi sensitif harus melalui entry point server yang memiliki aturan otorisasi jelas.

## 6.1. PostgreSQL RPC

Gunakan RPC untuk operasi atomik.

Contoh:

    start_exam_attempt()
    save_exam_answer()
    submit_exam_attempt()
    finalize_expired_attempt()
    grade_multiple_choice()
    lock_exam_attempt()
    reopen_exam_attempt()

RPC harus menerima identitas actor atau session yang tervalidasi dengan aman.

Hindari mempercayai `teacher_id`, `student_id`, atau `school_id` yang dikirim langsung oleh klien sebagai bukti otorisasi.

Privileged functions harus mempunyai akses EXECUTE yang dibatasi, schema yang sesuai, dan validasi eksplisit.

## 6.2. Backend as Source of Truth

Aturan yang wajib dijalankan backend:

- Siapa yang boleh membuat ujian.
- Siapa yang boleh membaca soal.
- Siapa yang boleh memulai attempt.
- Apakah ujian sedang terbuka.
- Apakah peserta mempunyai kredensial valid.
- Apakah attempt sudah melewati deadline.
- Apakah jawaban boleh diubah.
- Apakah sesi terkunci.
- Apakah ujian sudah selesai.
- Bagaimana nilai dihitung.
- Kapan hasil boleh dipublikasikan.

Frontend dapat melakukan pre-validation untuk UX, tetapi tidak boleh menjadi satu-satunya tempat aturan tersebut ditegakkan.

---

# 7. Database Architecture

Gunakan PostgreSQL relational schema dengan UUID primary keys.

Kelompok domain:

## 7.1. Identity & Tenant

    schools
    school_memberships
    user_profiles
    classes
    class_memberships

Setiap resource milik sekolah harus memiliki konteks tenant yang jelas.

Gunakan `school_id` pada tabel yang relevan dan constraint yang mencegah hubungan lintas sekolah secara tidak sah.

## 7.2. Question Authoring

    question_banks
    questions
    question_versions
    question_options
    question_answer_keys
    question_assets
    import_sessions
    import_drafts

## 7.3. Exam Management

    exams
    exam_questions
    exam_participants
    exam_access_credentials

## 7.4. Exam Delivery

    exam_attempts
    exam_answers
    exam_events
    exam_session_tokens

## 7.5. Grading

    answer_grades
    exam_grades
    grade_overrides
    grade_releases

## 7.6. Audit

    audit_logs

Gunakan constraints untuk mencegah:

- Jawaban ganda pada satu attempt dan soal.
- Multiple active attempts yang melanggar kebijakan.
- Duplikasi kredensial peserta dalam cakupan ujian.
- Referensi soal ke versi yang tidak tersedia.
- Nilai di luar rentang sah.
- Data dari tenant berbeda saling terhubung tanpa otorisasi.

---

# 8. Authentication & Authorization

## 8.1. Teacher Authentication

Gunakan Supabase Auth untuk guru dan administrator.

Metode awal:

- Email/password.
- Google Sign-In, opsional.

Authorization didasarkan pada school memberships dan role yang tersimpan secara aman di database.

Jangan mengandalkan user-editable metadata untuk keputusan izin.

## 8.2. Student Authentication

Untuk MVP, siswa tidak perlu mempunyai akun Supabase Auth permanen.

Dukung dua mode:

**Open Link**

Peserta memasukkan identitas deklaratif dan menerima scoped attempt session.

**Credential-Based**

Peserta menggunakan Exam ID/Student ID dan password yang diterbitkan guru.

Backend memverifikasi kredensial kemudian menerbitkan token sesi yang terikat pada attempt tertentu.

## 8.3. Student Session Security

Scoped attempt token harus:

- Sulit ditebak.
- Dibatasi pada satu attempt.
- Mempunyai masa berlaku.
- Dapat dicabut.
- Tidak memberikan akses ke resource guru.
- Tidak memberikan akses bebas ke database.

Simpan representasi token secara aman, misalnya hash token opaque, dan validasi di backend setiap operasi penting.

Jangan mengandalkan localStorage sebagai pengamanan token peserta.

Untuk web, gunakan transport sesi yang sesuai, seperti Secure HttpOnly cookies apabila arsitektur domain dan CORS mendukungnya. Pada native client, gunakan secure storage yang sesuai platform.

## 8.4. RLS

Aktifkan RLS pada seluruh tabel yang diekspos melalui Data API.

Guru hanya boleh mengakses resource sekolah yang menjadi kewenangannya.

Siswa tidak diberi akses Data API generik untuk membaca tabel soal beserta kunci jawaban.

Untuk guest attempts, gunakan API khusus yang mengekspos data paling minimal.

Service-role atau secret key tidak boleh dikirim ke frontend.

---

# 9. API Design

Gunakan versioned HTTP API.

Contoh:

    /v1/questions
    /v1/question-banks
    /v1/exams
    /v1/exams/{examId}/participants
    /v1/exams/{examId}/monitoring
    /v1/exams/{examId}/grades
    /v1/attempts/{attemptId}
    /v1/attempts/{attemptId}/answers
    /v1/attempts/{attemptId}/submit

Untuk MVP, endpoint dapat diimplementasikan melalui Edge Functions dengan routing internal.

Dokumentasikan operasi dalam `contracts/openapi.yaml`.

## 9.1. Response Envelope

Gunakan respons API konsisten.

Contoh sukses:

    {
      "data": {
        "attemptId": "uuid",
        "status": "in_progress",
        "deadlineAt": "2026-11-20T09:00:00Z"
      }
    }

Contoh gagal:

    {
      "error": {
        "code": "EXAM_CLOSED",
        "message": "Ujian sudah ditutup."
      }
    }

Gunakan HTTP status code yang sesuai.

## 9.2. Domain Error Codes

Definisikan error code stabil.

Contoh:

    EXAM_NOT_FOUND
    EXAM_NOT_OPEN
    EXAM_CLOSED
    INVALID_CREDENTIALS
    ATTEMPT_ALREADY_SUBMITTED
    ATTEMPT_LOCKED
    ATTEMPT_EXPIRED
    SESSION_CONFLICT
    ANSWER_REVISION_CONFLICT
    PERMISSION_DENIED

Jangan membuat klien bergantung pada pencocokan string pesan error.

## 9.3. API Versioning

Gunakan `/v1` untuk public API.

Perubahan breaking terhadap kontrak harus diikuti versioning atau strategi migrasi yang eksplisit.

Ini penting karena aplikasi Android mungkin tidak selalu diperbarui bersamaan dengan backend.

---

# 10. Exam Attempt State Machine

Definisikan state yang eksplisit.

    in_progress
    locked
    submitted
    timed_out
    terminated

Contoh transisi:

    in_progress → submitted
    in_progress → timed_out
    in_progress → locked
    in_progress → terminated
    locked → in_progress
    locked → terminated

Transisi ke `in_progress` dari `locked` hanya boleh dilakukan melalui mekanisme recovery yang diizinkan.

`submitted`, `timed_out`, dan `terminated` merupakan final state pada MVP, kecuali tersedia prosedur administrasi khusus yang diaudit.

## 10.1. Atomic Transitions

Perubahan status harus menggunakan conditional database update atau transaksi yang menjamin konsistensi.

Contoh: dua request submit bersamaan tidak boleh menyebabkan dua grading jobs atau dua hasil final.

## 10.2. Deadline

Server menetapkan:

    started_at
    deadline_at
    submitted_at

Setiap operasi save memeriksa deadline aktual berdasarkan waktu server.

Frontend countdown bukan sumber kebenaran.

---

# 11. Question Delivery Security

Kunci jawaban tidak boleh berada pada response API siswa sebelum waktu pengungkapan yang diizinkan.

Pisahkan DTO:

    TeacherQuestionDTO
    StudentQuestionDTO
    QuestionAnswerKeyDTO

`StudentQuestionDTO` hanya berisi:

- Question ID.
- Konten.
- Pilihan.
- Media yang diizinkan.
- Urutan.
- Nilai bobot jika kebijakan mengizinkan.

Jangan menyembunyikan kunci jawaban menggunakan CSS atau frontend conditional rendering apabila data tersebut sudah terlanjur dikirim ke browser.

Randomisasi soal dan opsi perlu disimpan secara stabil per attempt.

Jangan mengacak ulang setiap refresh halaman.

Gunakan immutable exam question version atau snapshot.

---

# 12. Autosave & Offline Recovery

## 12.1. Autosave Strategy

Untuk pilihan ganda, simpan segera setelah perubahan dengan pengendalian request ganda.

Untuk jawaban esai, gunakan debounce.

Sertakan revision number atau mekanisme optimistic concurrency.

## 12.2. Local Queue

Gunakan IndexedDB pada web untuk menyimpan perubahan yang belum terkirim.

Jangan mengandalkan service worker sebagai tempat utama state jawaban.

Tampilkan status:

    Saved
    Saving
    Offline
    Syncing
    Sync Failed

## 12.3. Recovery Rules

Ketika koneksi kembali:

1. Periksa status attempt.
2. Periksa deadline.
3. Ambil revision terbaru.
4. Sinkronkan perubahan yang masih diperbolehkan.
5. Tampilkan konflik jika diperlukan.

Perubahan offline tidak otomatis boleh diterima setelah deadline.

Kebijakan kehilangan koneksi harus dinyatakan secara eksplisit kepada guru dan peserta.

## 12.4. Service Worker

PWA dapat dipertimbangkan setelah MVP stabil.

Jika menggunakan service worker, terapkan caching policy yang ketat:

- Jangan cache respons sensitif seperti kunci jawaban.
- Jangan menyajikan versi lama exam engine secara tidak sengaja.
- Pastikan pergantian versi aplikasi mempunyai mekanisme update yang jelas.
- Jangan mengandalkan cache aplikasi sebagai sistem penyimpanan jawaban resmi.

---

# 13. Grading Engine

Grading dilakukan di backend.

Buat service terpisah secara logis:

    gradeSingleChoice()
    gradeMultipleAnswer()
    gradeShortAnswer()
    finalizeExamGrade()
    overrideGrade()

## 13.1. Single Choice

    correct → full points
    incorrect → zero
    unanswered → zero

## 13.2. Multiple Answer

Default exact match.

Partial credit merupakan konfigurasi lanjutan.

## 13.3. Essay

Manual grading oleh guru.

Nilai akhir tidak dianggap lengkap sebelum seluruh jawaban yang memerlukan koreksi manual selesai dinilai.

## 13.4. Grading Idempotency

Simpan grading version atau mekanisme setara.

Pemanggilan grading berulang dengan input dan versi rubrik yang sama tidak boleh menghasilkan hasil ganda.

Override harus disimpan dalam audit trail.

## 13.5. Grade Release

Pisahkan:

    grading_status
    release_status

Guru dapat melihat nilai sebelum dirilis kepada siswa.

---

# 14. Realtime Monitoring

Gunakan Supabase Realtime untuk pembaruan dashboard yang tidak harus mempunyai jaminan delivery mutlak.

Contoh:

- Peserta mulai.
- Peserta submit.
- Peserta mengalami perubahan status.
- Peserta terkunci.
- Pengawas membuka kembali sesi.

Monitoring event permanen disimpan di PostgreSQL.

Realtime hanya merupakan mekanisme notifikasi perubahan.

Jika event realtime terlewat, dashboard harus dapat melakukan refetch dan menghasilkan tampilan yang benar.

Gunakan heartbeat terbatas untuk estimasi koneksi peserta.

Jangan mengartikan heartbeat yang terputus sebagai bukti kecurangan.

---

# 15. Security Architecture

Gunakan defense in depth:

- Supabase RLS.
- Authorization server.
- Validasi request.
- Rate limiting.
- Password hashing.
- Scoped sessions.
- CSRF protection jika menggunakan cookie session.
- Audit logging.
- Server-authoritative timestamps.
- Idempotency keys.
- Secure media access.
- Input sanitization.

Jangan mengeksekusi HTML atau JavaScript yang berasal dari dokumen guru.

Tiptap JSON dan HTML hasil paste harus divalidasi sebelum digunakan atau ditampilkan.

Untuk soal berupa rich text, sanitasi dan pembatasan node/mark harus diterapkan secara konsisten.

## 15.1. Exam Browser Monitoring

Fitur browser monitoring hanya best-effort.

Implementasi web:

    visibilitychange
    focus / blur
    fullscreenchange
    connectivity events

Semua event dikirim ke backend dan diproses berdasarkan policy ujian.

Sistem tidak boleh mengklaim dapat mencegah seluruh bentuk kecurangan.

---

# 16. Multi-Platform Expansion

## 16.1. Web

Web merupakan klien utama.

Menangani:

- Teacher dashboard.
- Question authoring.
- Bulk import.
- Exam creation.
- Student portal.
- Monitoring.
- Grading.
- Analytics.

Deploy ke Vercel.

## 16.2. Desktop — Tauri

Tauri memakai frontend SolidJS.

Prioritaskan penggunaan shared packages:

    @octopus/domain
    @octopus/api-client
    @octopus/exam-client
    @octopus/ui

Tambahkan platform adapter untuk:

- Fullscreen.
- Window focus monitoring.
- Secure local storage bila diperlukan.
- Native desktop capabilities.
- Future kiosk-related integration.

Jangan membuat UI desktop terpisah sepenuhnya jika UI web dapat digunakan kembali.

Security yang membutuhkan dukungan OS harus diimplementasikan terpisah dari UI.

## 16.3. Android — Flutter

Flutter menjadi aplikasi native tersendiri.

Dapat menggunakan:

- API contract yang sama.
- Database schema dan business rules backend yang sama.
- Authentication/session flows yang kompatibel.
- Question content format yang terdokumentasi.
- Grading dan exam state rules yang sama.

Tidak dapat langsung menggunakan:

- SolidJS components.
- TypeScript UI stores.
- Browser DOM editor logic.
- Tauri Rust commands.

Gunakan Dart API client yang dihasilkan dari OpenAPI apabila praktis.

Sediakan native adapter untuk Android-specific security features.

## 16.4. Platform Capabilities

Definisikan model capability:

    fullscreen
    visibility_detection
    secure_storage
    kiosk_mode
    screen_pin
    app_focus_detection

Capabilities digunakan untuk menyesuaikan UX dan menentukan mode ujian yang secara teknis didukung.

Jangan menganggap self-reported client capabilities sebagai bukti keamanan perangkat.

---

# 17. Deployment & Environments

Gunakan environment terpisah:

    local
    staging
    production

Minimal staging dan production harus menggunakan Supabase project berbeda untuk mengurangi risiko perubahan development merusak data nyata.

## 17.1. Vercel

Vercel menangani build dan hosting web.

Sediakan environment variables yang sesuai.

Public frontend variables hanya boleh memuat nilai yang aman untuk dipublikasikan.

## 17.2. Supabase

Gunakan migrations untuk versioning database schema.

Edge Functions dan database migrations harus dipromosikan secara terkendali antar-environment.

Jangan melakukan perubahan schema production tanpa migrasi yang terdokumentasi.

## 17.3. CI

GitHub Actions atau CI setara menjalankan:

    install
    lint
    typecheck
    unit tests
    build
    integration tests
    e2e tests

Tidak semua integration/E2E harus berjalan pada setiap commit jika biaya terlalu besar, tetapi pemeriksaan kritis harus dijalankan sebelum deployment production.

---

# 18. Testing Strategy

## 18.1. Unit Tests

Fokus:

- Delimiter parsing.
- Question splitting.
- Option extraction.
- Question validation.
- Client-side exam state helpers.
- Grading pure functions.

## 18.2. Integration Tests

Fokus:

- RLS.
- Teacher authorization.
- Credential verification.
- Exam start.
- Answer autosave.
- Attempt submit.
- Timeout.
- Concurrent requests.
- Grading.
- Tenant isolation.

## 18.3. E2E Tests

Skenario Playwright:

1. Guru login.
2. Guru membuat kumpulan soal melalui Bulk Import.
3. Guru menerbitkan ujian.
4. Siswa membuka link.
5. Siswa memulai attempt.
6. Siswa menjawab soal.
7. Browser di-refresh.
8. Jawaban tetap tersedia.
9. Siswa submit.
10. Guru melihat nilai.
11. Guru mengekspor hasil.

Tambahkan pengujian mobile viewport dan browser yang relevan.

## 18.4. Security Tests

Uji secara eksplisit:

- Peserta mencoba membaca jawaban benar.
- Siswa mengubah attempt ID.
- Guru mengakses ujian sekolah lain.
- Peserta mengirim jawaban setelah deadline.
- Peserta mengirim submit berulang.
- Dua perangkat mencoba memakai attempt yang sama.
- Request autosave tiba setelah submit.
- Guest mencoba mengakses endpoint guru.

---

# 19. Engineering Rules

Coding agent harus mengikuti aturan berikut:

1. Jangan menggabungkan business logic, data access, dan UI dalam satu komponen besar.
2. Setiap modul harus memiliki batas tanggung jawab yang jelas.
3. Jangan membuat dependensi melingkar antarpackage.
4. Shared packages tidak boleh mengimpor komponen aplikasi.
5. Backend merupakan sumber kebenaran untuk aturan ujian.
6. API contract harus diperbarui ketika request atau response berubah.
7. Perubahan database wajib menggunakan migration.
8. Setiap tabel terekspos wajib diperiksa RLS dan privileges-nya.
9. Jangan memasukkan secret backend ke frontend.
10. Jangan menggunakan `any` tanpa alasan yang terdokumentasi.
11. Jangan melakukan silent failure pada operasi penyimpanan jawaban.
12. Setiap operasi penting harus memiliki error handling.
13. Gunakan operasi idempoten untuk submit, grading, dan bulk save.
14. Setiap fitur harus mempunyai pengujian proporsional dengan risikonya.
15. Jangan menambahkan framework, ORM, atau abstraction layer baru tanpa kebutuhan konkret.
16. Utamakan desain yang sederhana namun dapat diperluas.
17. Jangan mengimplementasikan Tauri dan Flutter sebelum web MVP stabil, tetapi pertahankan kontrak API dan pemisahan modul yang memungkinkan keduanya ditambahkan.
18. Jangan menjanjikan keamanan browser yang tidak dapat ditegakkan secara teknis.

---

# 20. Implementation Roadmap

## Stage 1 — Project Foundation

- pnpm workspace.
- SolidJS + Vite.
- Tailwind.
- Routing.
- Shared packages.
- Supabase initialization.
- Environment configuration.
- Authentication.
- Database migrations.
- Testing setup.
- CI.

## Stage 2 — Question Authoring

- Manual editor.
- Tiptap integration.
- Bulk paste.
- Split/merge.
- Option extraction.
- Media.
- Draft persistence.
- Question bank.

## Stage 3 — Exam Management

- Create exam.
- Question selection.
- Exam schedule.
- Access modes.
- Credential generation.
- Exam publishing.

## Stage 4 — Student Delivery

- Exam entry.
- Scoped session.
- Student UI.
- Timer.
- Autosave.
- Recovery.
- Submit.

## Stage 5 — Grading & Analytics

- Automatic grading.
- Manual grading.
- Teacher grade dashboard.
- Passing grade.
- Ranking.
- Distribution.
- CSV/XLSX export.

## Stage 6 — Monitoring

- Activity events.
- Realtime dashboard.
- Violation policies.
- Session locking.
- Teacher intervention.

## Stage 7 — Product Hardening

- Security testing.
- Performance testing.
- Mobile usability.
- Multi-tenant tests.
- Backup/recovery review.
- Observability.
- Pilot testing at schools.

## Stage 8 — Future Native Clients

- Tauri desktop.
- Flutter Android.
- Native capabilities.
- Platform-specific testing.

---

# 21. Definition of Done — Technical Foundation

Fondasi Octopus dinyatakan siap ketika:

- Web app berjalan melalui pnpm.
- Deployment Vercel berhasil.
- Supabase Auth dan backend API terhubung.
- Struktur monorepo tidak mempunyai circular dependency.
- Question domain terpisah dari UI.
- Exam rules berjalan di server.
- API contract tersedia.
- Database migrations dapat dijalankan ulang pada environment baru.
- RLS dan tenant isolation lulus pengujian.
- Unit tests dan typecheck berjalan.
- API dapat digunakan oleh klien selain SolidJS.
- Tidak ada ketergantungan arsitektural yang mengharuskan Tauri atau Flutter mengimplementasikan ulang backend.
- Seluruh fitur dasar dapat dikembangkan secara bertahap tanpa mengganti fondasi proyek.

**Architectural Principle:**

Build one authoritative backend, multiple independent clients, and reusable domain contracts. Keep the system modular without introducing unnecessary distributed-system complexity.
