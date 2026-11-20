# Fondasi desain Octopus

Tahap 2 menerapkan identitas visual dan komponen antarmuka sebagai dasar pengembangan fitur. Tidak ada backend atau penyimpanan soal yang disimulasikan sebagai data sekolah nyata.

## Tema dan token

Tailwind terintegrasi melalui plugin Vite. CSS semantic tokens berada di `apps/web/src/styles/base.css` dan dipetakan ke theme utilities Tailwind. Warna mengikuti spesifikasi: teal untuk aksi utama, indigo untuk struktur, krem untuk permukaan, serta coral/emas untuk keadaan yang relevan.

Mode terang, gelap, dan mengikuti sistem tersedia pada header serta pengaturan. Pilihan disimpan dengan key `octopus.theme`, tersinkron antar-tab, dan mengikuti perubahan sistem selama mode sistem dipilih. Jika storage diblokir, perubahan tema tetap berfungsi selama halaman aktif. `public/theme-init.js` memasang tema sebelum aplikasi dan stylesheet dimuat untuk mengurangi kilatan tema yang salah; aturan awalnya harus tetap selaras dengan `src/app/theme.tsx`.

Teks navigasi aktif memakai token `primary-text` yang lebih gelap pada light mode agar kontrasnya memenuhi target di atas mint. Warna primary untuk tombol tetap mengikuti palet dasar. Dark mode tidak mengubah warna media soal atau aset logo.

## Logo dan font

Tiga PNG sumber disalin tanpa modifikasi ke `apps/web/public/brand`. Komponen Brand menampilkan wordmark tulisan gelap pada tema terang, wordmark tulisan krem pada tema gelap, serta simbol untuk ruang ringkas. Tidak ada recolor atau pemotongan aset asli. Favicon kecil belum dibuat karena memerlukan peninjauan turunan aset secara terpisah.

Plus Jakarta Sans Variable dimuat lokal melalui paket Fontsource berlisensi OFL 1.1; browser tidak menghubungi layanan font eksternal. Salinan lisensi font didistribusikan di `public/licenses/plus-jakarta-sans.txt`. Font fallback tetap `system-ui, sans-serif`.

## Komponen dan layout

Komponen di `src/components/ui` mencakup Button, TextField, Checkbox, Badge, Modal, dan SaveStatus. TextField serta Modal memakai primitive Kobalte; checkbox memakai input native dengan label terhubung. Ikon menggunakan Lucide. Status penyimpanan memiliki teks dan ikon serta polite live region; tidak ditampilkan sebagai klaim autosave nyata pada halaman guru yang belum memiliki backend.

Import Lucide memakai entry per ikon yang disediakan paket, sehingga dev/test/build tidak perlu mentransformasi seluruh katalog ikon.

Referensi `/komponen` menyediakan contoh yang secara eksplisit tidak menyimpan data, termasuk error input, checkbox, dialog, dan lima keadaan penyimpanan. Halaman ini tidak masuk navigasi utama guru.

Sidebar desktop terlihat mulai lebar 1024 px; layar lebih kecil menggunakan menu dialog dengan focus trap, Escape, dan pemulihan fokus ke trigger. Menu ditutup sesudah navigasi atau ketika berpindah ke ukuran desktop. Animasi menghormati `prefers-reduced-motion`. Skip link dan outline fokus tersedia.

Ringkasan memperlihatkan alur kerja, bukan metrik contoh. Bank soal mempunyai pencarian dan filter untuk antarmuka keadaan kosong; tombol buat/impor dinonaktifkan dengan penjelasan. Ujian, monitoring, dan nilai mempunyai placeholder eksplisit. Pengaturan mengubah tema dan menyediakan dialog tentang produk.

## Pengujian dan batasnya

Pengujian browser mencakup persistensi tema, perubahan sistem, storage diblokir, sinkronisasi antar-tab, validasi input, checkbox keyboard, filter reset, fokus dialog, menu mobile, resize ke desktop, serta layout 360 px. Axe memeriksa tema terang/gelap pada ringkasan, bank soal, referensi komponen, pengaturan, dan dialog/menu terbuka. Tangkapan layar ringkasan/bank soal membantu pemeriksaan visual logo, ruang, dan pemenggalan teks.

Preview dan E2E memakai port 5174 karena port 4173 berada dalam rentang reservasi Windows pada saat pengujian. Dev tetap memakai 5173. E2E menggunakan build produksi; jalankan build sebelum menguji perubahan.

Pemeriksaan Chromium dan emulasi mobile tidak membuktikan penerimaan perangkat fisik, semua browser, atau alur ujian yang belum diimplementasikan. Backend, login, editor soal, dan data analitik menjadi tahap berikutnya.

## Hasil verifikasi lokal pada 20 November 2026

- `pnpm install --frozen-lockfile --offline`: lulus; manifest dan lockfile selaras.
- `pnpm check`: format, lint, typecheck, tiga component test, dan build produksi lulus.
- `pnpm test:e2e`: 25 lulus; satu skenario menu mobile dilewati pada konfigurasi desktop sesuai cakupannya.
- Pemeriksaan Axe pada kedua tema, termasuk dialog dan navigasi mobile terbuka, tidak menemukan pelanggaran pada rule set yang diuji.
- Tangkapan layar ringkasan light/dark dan bank soal mobile diperiksa untuk proporsi logo, keterbacaan, dan pemenggalan layout. Hash ketiga aset produksi identik dengan salinan sumber.

Hasil di atas merupakan verifikasi lokal Windows. CI GitHub dan deployment belum dijalankan untuk perubahan tahap 2.

## Audit UX pemilih tema

Audit singkat menemukan border pada pembungkus kontrol, tetapi outline fokus hanya pada select di dalamnya. Perbedaan batas tersebut membuat kontrol terlihat bertumpuk dan area ikon tidak menjadi bagian select yang utuh.

Border, radius, dan padding kini berada pada select yang memenuhi seluruh kontrol. Ikon dan chevron diposisikan sebagai dekorasi tanpa menangkap pointer. Outline keyboard tetap mengelilingi kontrol penuh. Kontrol input dan dialog lain sudah memiliki batas fokus yang sesuai dan tidak memerlukan perubahan dalam audit ini.

Verifikasi perbaikan: `pnpm check` lulus dan E2E menjadi 27 lulus dengan satu skip khusus desktop. Test tambahan memeriksa ukuran select terhadap kontrol pembungkus serta outline yang terlihat saat fokus keyboard pada desktop dan mobile.
