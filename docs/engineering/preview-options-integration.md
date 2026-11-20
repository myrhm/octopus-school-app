# Integrasi sementara preview dan ekstraksi opsi

Branch lokal `integration/student-preview-options` menggabungkan PR #3 (`40580b5`) dan PR #4 (`dd68e36`) dengan merge commit. Branch utama dan kedua branch fitur tetap terpisah. Ini lingkungan uji integrasi, bukan persetujuan merge.

## Alur data

`loadDraft` → `validateDocument` dengan schema editor → `question-import/question-contract.toStudentQuestions` → `copyStudentQuestions` → `StudentPreview`.

Adapter kanonis menghapus kunci, source anchor, recovery slice, dan konflik kunci sebelum komponen menerima data. Validasi tampilan tetap memeriksa ID dan menyalin hanya node/mark/atribut yang didukung. Tipe guru/opsi memakai alias kontrak PR #4, bukan definisi kedua yang dapat menyimpang.

Bank Soal → Pratinjau siswa kini menampilkan opsi asli sesuai urutan tersimpan. Soal legacy tanpa opsi tetap dapat dibuka tanpa menulis default kembali ke IndexedDB. Jawaban percobaan hanya berada di memori; reload mengosongkannya. Contoh fixture tetap tersedia melalui tautan terpisah.

## Batas sebelum merge

- Dua temuan review PR #4 (kompatibilitas versi draft lama dan konteks daftar saat ekstraksi) masih menunggu perbaikan akun 1. Integrasi ini tidak menyatakan keduanya selesai.
- Guard versi masih menerima versi 1 sesuai head PR #4 saat ini. Setelah migrasi versi penyimpanan tersedia, perbarui adapter dan tesnya mengikuti aturan final; jangan menerima versi tak dikenal secara otomatis.
- Gunakan origin pengujian terpisah pada port 5185. Draft pada port lain tidak ikut tersedia karena IndexedDB terikat origin. Jangan memindahkan draft penting ke lingkungan ini sebelum perbaikan kompatibilitas selesai.
- Setelah PR #4 diperbaiki, perbarui branch integrasi dan ulangi pemeriksaan sebelum memindahkan commit penghubung ke PR #3. Tidak perlu membawa merge integrasi sementara ke main.

## Verifikasi

`pnpm check`, lalu `pnpm test:e2e` setelah build. Tes tambahan memeriksa ekstraksi opsi asli, pilihan kunci, reorder berdasarkan ID, reload, rendering formatting di preview, tidak adanya kunci/metadata editor, pilihan percobaan, serta kesamaan seluruh draft dan revision sebelum/sesudah preview. Ada juga pengujian draft legacy, versi tak dikenal, dan kunci tidak valid tanpa perubahan storage.
