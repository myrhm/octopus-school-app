# Pratinjau soal siswa

## Kontrak integrasi v1

Disetujui pengguna pada 21 November 2026 untuk pekerjaan ekstraksi dan preview. Kedua branch perlu mulai dari `main` commit `e98ce2d` (merge PR #2). Worktree preview terpisah, branch `feat/student-question-preview`.

Boundary bertipe ada di `apps/web/src/features/student-preview/contract.ts`:

```ts
interface PreviewSourceQuestion {
  id: string;
  content: JSONContent[];
  options: { id: string; content: JSONContent[] }[];
  correctOptionId: string | null;
}
```

- `content` adalah array blok rich-text Tiptap/ProseMirror, bukan HTML dan bukan wrapper `doc`/`question`. Paragraf, heading 2/3, daftar, blockquote, hard break, bold, italic, underline, dan strike didukung.
- ID soal unik dalam kumpulan; ID opsi unik dalam soal dan stabil saat teks atau urutan berubah. Urutan pertanyaan dan opsi mengikuti array. Label A/B/C hanya presentasi, bukan identitas.
- `correctOptionId` merujuk ID opsi yang ada, atau `null` bila belum ditentukan. Soal/opsi kosong diperbolehkan. Array opsi kosong berarti belum ada opsi, bukan otomatis tipe esai.
- `toStudentQuestions` memproyeksikan field tampilan secara eksplisit dan menyalin rich-text. Kunci dan atribut lain tidak diteruskan ke komponen. ID duplikat, kunci tidak valid, dan konten yang belum didukung ditolak.
- Komponen `StudentPreview` hanya menerima `StudentQuestion[]` tanpa field kunci. Jawaban percobaan berada di memori komponen, dipetakan dari ID soal ke ID opsi. Tidak menulis IndexedDB, tidak memberi skor, dan direset saat keluar/reload.

Kontrak ini adalah boundary UI, bukan keputusan format penyimpanan. Akun 1 memiliki schema editor, serialisasi opsi, migrasi, history, dan autosave. Pada branch integrasi, `load-preview.ts` memvalidasi dokumen lalu memakai proyeksi siswa kanonis dari modul `question-import/question-contract.ts`, dilanjutkan validasi tampilan `copyStudentQuestions`. Tipe guru dan opsi menggunakan alias kontrak kanonis. Objek guru mentah tidak diteruskan ke komponen siswa. Lihat [catatan integrasi sementara](preview-options-integration.md) untuk batas versi dan temuan review yang masih terbuka.

## Alur

- Bank Soal → **Contoh pratinjau siswa** (`/pratinjau-siswa/contoh`): fixture eksplisit berisi dua soal pilihan ganda dan satu soal tanpa opsi. Tidak membuat draft atau memerlukan IndexedDB.
- Bank Soal → **Pratinjau siswa** pada draft: membaca snapshot terakhir yang tersimpan, termasuk opsi asli dan urutannya dari PR #4. Draft versi 1 legacy dan versi 2 didukung melalui guard bersama modul storage. Format tak dikenal ditolak; preview tidak menulis migrasi kembali ke penyimpanan.
- Tampilan terpisah dari sidebar guru, memakai tema dan identitas Octopus yang sama. Pilihan radio native mendukung keyboard. Klik isi pilihan memilih radio.
- Navigasi sebelumnya/berikutnya atau nomor soal mempertahankan pilihan sementara dan memindahkan fokus ke judul soal. Navigator mobile dapat dibuka/tutup; kontrol tidak menutupi isi soal.
- Soal kosong/tanpa opsi ditandai jelas. Draft hilang, format tidak didukung, dan storage error tidak diganti dengan data contoh.

Ini preview lokal untuk guru, bukan portal ujian terpublikasi. Proyeksi tanpa kunci mencegah kunci masuk ke UI preview, tetapi bukan batas keamanan untuk data guru yang sudah ada di browser. Backend/otorisasi/publikasi tidak termasuk pekerjaan ini.

## Verifikasi

Jalankan `pnpm check`, kemudian `pnpm test:e2e` setelah build. Tes mencakup salinan data tanpa kunci, ID/urutan, formatting, konten literal aman, pilihan sementara, fokus navigasi, reload, draft tidak berubah, error storage, tema terang/gelap, viewport 360 px, reflow 640 px, dan Axe WCAG AA. Emulasi mobile bukan pengujian perangkat fisik.

Hasil lokal Windows/Chromium 21 November 2026: `pnpm check` lulus dengan 18 unit/component tests; suite E2E terakhir 53 lulus, 1 skip khusus mobile di konfigurasi desktop. Satu run sebelumnya gagal pada tes editor lama Shift+Enter setelah redo (karakter awal input tidak masuk); run penuh berikutnya lulus tanpa perubahan editor. Delapan skenario E2E preview lulus. Build memberi peringatan bundle utama sekitar 508 kB sebelum gzip, bukan kegagalan build.
