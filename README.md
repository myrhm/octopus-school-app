# Octopus

Platform ujian sekolah untuk menyusun soal dari dokumen, menyelenggarakan ujian, mengoreksi jawaban, dan mengevaluasi hasil belajar.

Fondasi web sudah tersedia: pnpm workspace, SolidJS + TypeScript + Vite, routing, lint/format, component tests, browser smoke tests, dan workflow CI. Fitur soal, akun, dan ujian belum diimplementasikan.

## Menjalankan proyek

Gunakan Node.js 22.12+ pada major 22, atau major 24/26+, serta pnpm 10.24.0. Versi baseline lokal tercatat di `.node-version`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Buka http://127.0.0.1:5173. Halaman yang tersedia: `/`, `/bank-soal`, dan fallback 404.

```sh
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` menjalankan format check, lint, typecheck, component tests, dan build. E2E memakai hasil build melalui preview server di port 4173; jalankan `pnpm build` jika menjalankan E2E secara terpisah setelah perubahan kode.

Perintah tambahan: `pnpm test:watch`, `pnpm format`, dan `pnpm preview`.

## Struktur fondasi

```text
apps/web/              Aplikasi SolidJS dan konfigurasi Vite/Vitest
packages/config/       Konfigurasi TypeScript strict bersama
tests/e2e/             Browser smoke tests desktop dan mobile
.github/workflows/     Pemeriksaan CI
docs/                  Spesifikasi, aset sumber, dan panduan engineering
```

Panduan batas modul, keputusan toolchain, dan rencana lanjutan tersedia di [fondasi engineering](docs/engineering/foundation.md).

## Spesifikasi

- [Spesifikasi produk dan engineering](docs/specifications/octopus-v1.md)
- [Identitas visual dan desain antarmuka](docs/specifications/visual-design.md)
- [Dokumen sumber](docs/references/README.md)

Stack yang ditetapkan: SolidJS, TypeScript, Vite, Tailwind CSS, Supabase, dan Vercel. Tauri desktop dan Flutter Android merupakan pengembangan setelah web stabil.
