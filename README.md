# Octopus

Platform ujian sekolah untuk menyusun soal dari dokumen, menyelenggarakan ujian, mengoreksi jawaban, dan mengevaluasi hasil belajar.

Fondasi web dan editor impor lokal sudah tersedia. Dari Bank Soal, pilih **Impor soal**, tempel dokumen, pisahkan/gabungkan soal, lalu seleksi teks jawaban untuk diekstrak menjadi opsi. Opsi dapat diurutkan, diberi satu kunci jawaban, dan dikembalikan ke teks soal. Undo/redo serta autosave IndexedDB menyimpan struktur agar dapat dilanjutkan setelah reload. Integrasi Appwrite menyediakan login guru, Teams sekolah, penyimpanan draft server, upload gambar privat, penerbitan versi soal, jadwal ujian pilihan ganda, akses peserta lewat tautan, dan penilaian server. Konfigurasi cloud dan pengujian langsung masih diperlukan.

## Menjalankan proyek

Gunakan Node.js 22.12+ pada major 22, atau major 24/26+, serta pnpm 10.24.0. Versi baseline lokal tercatat di `.node-version`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Buka http://127.0.0.1:5173. Halaman yang tersedia: ringkasan (`/`), bank soal (`/bank-soal`), dan pengaturan tampilan (`/pengaturan`). Dengan konfigurasi Appwrite, halaman ujian, monitoring, dan nilai membuka pengelolaan ujian serta hasil. Tanpa konfigurasi, aplikasi memakai draft lokal. Referensi visual komponen tersedia di `/komponen`, terpisah dari navigasi guru.

```sh
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` menjalankan format check, lint, typecheck, component tests, dan build. E2E membangun aplikasi mode lokal di port 5174 dan menjalankan server terpisah di port 5175 untuk alur peserta dengan API simulasi.

Perintah tambahan: `pnpm test:watch`, `pnpm format`, dan `pnpm preview`.

## Struktur fondasi

```text
apps/web/              Aplikasi SolidJS dan konfigurasi Vite/Vitest
packages/config/       Konfigurasi TypeScript strict bersama
tests/e2e/             Browser smoke tests desktop dan mobile
.github/workflows/     Pemeriksaan CI
docs/                  Spesifikasi, aset sumber, dan panduan engineering
```

Panduan batas modul dan toolchain tersedia di [fondasi engineering](docs/engineering/foundation.md). Implementasi tema, komponen, dan batas pratinjau dijelaskan di [fondasi desain](docs/engineering/design-foundation.md).

Alur editor dan batas penyimpanan browser dijelaskan di [impor soal lokal](docs/engineering/local-question-import.md).

Integrasi preview independen mengikuti [kontrak soal v1](docs/engineering/question-contract-v1.md) dan [fixture siswa tanpa kunci](contracts/fixtures/student-question-v1.json).

## Spesifikasi

- [Spesifikasi produk dan engineering](docs/specifications/octopus-v1.md)
- [Identitas visual dan desain antarmuka](docs/specifications/visual-design.md)
- [Dokumen sumber](docs/references/README.md)

Stack yang ditetapkan: SolidJS, TypeScript, Vite, Tailwind CSS, Appwrite, dan Vercel. Tauri desktop dan Flutter Android merupakan pengembangan setelah web stabil.

## Konfigurasi Appwrite

Ikuti [panduan backend Appwrite](docs/engineering/appwrite-backend.md) untuk konfigurasi cloud dan batas implementasi saat ini.
