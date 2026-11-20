# Integrasi sementara preview dan ekstraksi opsi

Branch lokal `integration/student-preview-options` menggabungkan PR #3 (`40580b5`) dan PR #4 terbaru (`7f14cce`) dengan merge commit. Branch utama dan kedua branch fitur tetap terpisah. Ini lingkungan uji integrasi, bukan persetujuan merge.

## Alur data

`loadDraft` → `validateDocument` dengan schema editor → `question-import/question-contract.toStudentQuestions` → `copyStudentQuestions` → `StudentPreview`.

Adapter kanonis menghapus kunci, source anchor, recovery slice, dan konflik kunci sebelum komponen menerima data. Validasi tampilan tetap memeriksa ID dan menyalin hanya node/mark/atribut yang didukung. Tipe guru/opsi memakai alias kontrak PR #4, bukan definisi kedua yang dapat menyimpang.

Bank Soal → Pratinjau siswa kini menampilkan opsi asli sesuai urutan tersimpan. Soal legacy tanpa opsi tetap dapat dibuka tanpa menulis default kembali ke IndexedDB. Jawaban percobaan hanya berada di memori; reload mengosongkannya. Contoh fixture tetap tersedia melalui tautan terpisah.

## Batas sebelum merge

- PR #4 telah menambahkan perbaikan versi draft (`eed7ae1`) dan konteks daftar (`7f14cce`), termasuk tes regresi. Keduanya ikut digabung ke lingkungan ini.
- Guard versi memakai `isSupportedDraftVersion` dari modul storage: versi 1 legacy dan versi 2 diterima; versi lain ditolak. Membuka preview tidak menyimpan migrasi, menulis draft, atau mengubah revision. Save editor memakai versi 2.
- Gunakan origin pengujian terpisah pada port 5185. Draft pada port lain tidak ikut tersedia karena IndexedDB terikat origin.
- Setelah hasil integrasi ditinjau, commit penghubung dapat dipindahkan ke PR #3 setelah dependency PR #4 masuk sesuai persetujuan pengguna. Tidak perlu membawa merge integrasi sementara ke main.

## Verifikasi

`pnpm check`, lalu `pnpm test:e2e` setelah build. Tes tambahan memeriksa ekstraksi opsi asli, pilihan kunci, reorder berdasarkan ID, reload, rendering formatting di preview, tidak adanya kunci/metadata editor, pilihan percobaan, serta kesamaan seluruh draft dan revision sebelum/sesudah preview. Ada juga pengujian draft legacy, versi tak dikenal, dan kunci tidak valid tanpa perubahan storage.

Hasil lokal 21 November 2026 setelah memasukkan PR #4 `7f14cce`: `pnpm check` lulus dengan 38 unit/component tests dan build; E2E 65 lulus, 1 skip mobile-only pada desktop. Tes delimiter lama kini menunggu fokus editor setelah redo sebelum mengetik, sesuai focus asynchronous Tiptap. Build masih memberi peringatan chunk utama sekitar 519 kB sebelum gzip.
