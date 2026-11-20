# Fondasi engineering Octopus

Tahap 1 tersedia secara lokal: workspace pnpm, SolidJS SPA, TypeScript strict, routing, ESLint, Prettier, Vitest, Playwright, dan konfigurasi CI. Belum ada integrasi backend, autentikasi, data contoh yang menyerupai data nyata, atau provisioning layanan.

## Struktur dan batas modul

- `apps/web/src/app`: bootstrap routing dan shell aplikasi.
- `apps/web/src/routes`: komposisi halaman; belum ada aturan bisnis ujian.
- `apps/web/src/styles`: stylesheet awal untuk keterbacaan halaman fondasi.
- `packages/config`: konfigurasi TypeScript yang dipakai aplikasi melalui dependency `workspace:*`.
- `tests/e2e`: smoke tests terhadap build produksi melalui Vite preview.

Package domain, impor, API, dan UI bersama ditambahkan ketika diperlukan. Package bersama tidak boleh mengimpor aplikasi. Tahap 2 menambahkan halaman pengaturan, referensi komponen, serta placeholder ujian/monitoring/nilai; bank soal menjelaskan bahwa fitur penyimpanan belum tersedia.

Fondasi desain kini memakai Tailwind, logo sumber, komponen dasar, serta tema light/dark/sistem. Detailnya tercatat di [fondasi desain](design-foundation.md). Editor dan SDK backend belum dipasang.

## Toolchain dan reproduksibilitas

Baseline lokal adalah Node 22.12.0 dan pnpm 10.24.0. Dependency langsung memakai versi exact dan dependency transitif dicatat dalam `pnpm-lock.yaml`. CI memakai `pnpm install --frozen-lockfile`. Workspace menolak peer dependency tidak cocok dan menunda paket yang baru terbit kurang dari 24 jam. Build script dependency hanya diizinkan untuk `esbuild`.

SolidJS 1.9.19 dan router 0.16.3 dipilih sebagai pasangan yang sesuai peer dependency plugin Vite. Tidak mencampur Solid major 2 dengan toolchain yang masih mendeklarasikan Solid major 1.

TypeScript 5.9.3, typescript-eslint 8.46.4, dan jsdom 26.1.0 dipilih agar dapat berjalan pada Node lokal. ESLint 9.39.5 sudah diberi peringatan deprecated oleh registry; ini tooling development, bukan runtime aplikasi. Sebelum memperbarui lint stack ke major yang didukung, naikkan baseline Node ke versi yang memenuhi seluruh dependency, lalu jalankan ulang seluruh pemeriksaan. Upgrade Node sistem tidak dilakukan otomatis oleh proyek.

Dokumentasi acuan setup: [Vite](https://vite.dev/guide/), [Solid Router](https://github.com/solidjs/solid-router), [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files), [Vitest](https://vitest.dev/guide/), dan [Playwright](https://playwright.dev/docs/test-configuration). Paket yang benar-benar dipasang dan lockfile menjadi bukti kompatibilitas lokal.

## Pemeriksaan

`pnpm check` berhenti pada pemeriksaan pertama yang gagal. Typecheck mencakup aplikasi dan konfigurasi browser tests. Vitest menguji navigasi, browser history, direct entry, dan fallback 404. Component tests memakai stub scrolling dan media query karena jsdom tidak mengimplementasikan kedua API browser tersebut.

`pnpm test:e2e` menguji navigasi, refresh deep link, browser back, recovery dari URL salah, runtime errors, dan overflow halaman pada Chromium desktop serta emulasi Pixel 7. Pengujian ini bukan bukti dukungan perangkat Android fisik atau seluruh browser.

CI memuat install, format/lint/typecheck, tests, build, dan E2E pada Linux. Repository sudah terhubung ke GitHub setelah fondasi awal di-push. Hasil lokal tidak dianggap sebagai bukti keberhasilan workflow CI atau deployment.

## Environment dan deployment

Tahap ini dapat berjalan tanpa `.env` atau akun layanan. Jangan menambahkan secret backend ke `VITE_*` karena variabel tersebut ditanam ke bundle browser. Konfigurasi Supabase diperkenalkan bersamaan dengan integrasinya dan template environment yang tervalidasi.

Vite preview mendukung fallback SPA untuk pengujian lokal. Konfigurasi rewrite pada Vercel perlu ditambahkan dan diuji saat tahap deployment; keberhasilan reload lokal tidak membuktikan konfigurasi hosting production.

## Langkah berikutnya

Setelah fondasi desain tahap 2, backend awal menyediakan Auth, sekolah/membership, bank soal, draft, Storage, dan RLS sebelum fitur impor disambungkan ke penyimpanan resmi.

## Verifikasi lokal tahap 1 pada 20 November 2026

- `pnpm install --frozen-lockfile --offline`: berhasil menggunakan cache instalasi.
- `pnpm check`: format, lint, typecheck, tiga component test, dan build produksi lulus.
- `pnpm test:e2e`: empat test lulus pada Chromium desktop dan emulasi mobile.

E2E dijalankan dengan akses localhost di luar pembatasan socket sandbox. Ini hasil lokal Windows; workflow CI Linux dan deployment hosting belum dijalankan.
