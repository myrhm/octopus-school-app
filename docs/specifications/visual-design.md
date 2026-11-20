# Identitas visual dan desain antarmuka Octopus

Versi 1.0 · 20 November 2026 · Draft desain

Octopus memakai karakter ramah dari maskot gurita akademik: teal, indigo, krem, coral, emas, dan mint. Antarmuka mengutamakan keterbacaan dokumen dan ketenangan saat ujian. Warna di bawah adalah token rancangan yang diselaraskan secara visual dengan logo, bukan klaim hasil ekstraksi warna presisi dari gambar.

## 1. Aset logo

| Aset                                                  | Sumber pengguna               | Penggunaan                                                                  |
| ----------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| [Wordmark light](../brand/octopus-wordmark-light.png) | Gambar 3, tulisan gelap       | Login dan halaman dengan latar terang                                       |
| [Wordmark dark](../brand/octopus-wordmark-dark.png)   | Gambar 1, tulisan krem terang | Login dan halaman dengan latar gelap                                        |
| [Simbol](../brand/octopus-symbol.png)                 | Gambar 2, tanpa tulisan       | Sidebar ringkas, avatar aplikasi, favicon/app icon setelah penyiapan ukuran |

Nama file light/dark merujuk tema tempat logo dipakai. Wordmark gelap dari pengguna secara visual bernuansa indigo, sehingga teks UI juga memakai keluarga indigo, bukan harus hitam murni.

Pertahankan proporsi, warna, dan isi aset asli. Jangan memotong maskot/wordmark atau menambahkan efek bayangan, outline, maupun recolor. Ketiga gambar adalah varian ilustrasi tersendiri; jangan mencoba menukar tulisan dengan memotong gambar lain.

Usulan clear space minimum: 12,5% dari lebar ilustrasi yang terlihat. Pada sidebar ringkas, simbol ditempatkan dalam area 40–48 px; wordmark lengkap hanya dipakai ketika tulisan masih terbaca. Favicon kecil memerlukan turunan aset yang ditinjau terpisah karena detail ilustrasi dapat hilang. Periksa alpha/transparansi dan tepi raster di light/dark sebelum membuat aset produksi. Salinan sumber tidak diubah.

## 2. Palet merek

| Warna      | Nilai acuan | Peran                                          |
| ---------- | ----------- | ---------------------------------------------- |
| Teal       | `#16B8B2`   | Identitas utama, sorotan, ilustrasi            |
| Teal dalam | `#087F83`   | Aksi utama pada light mode                     |
| Indigo     | `#343153`   | Teks utama, navigasi, struktur                 |
| Krem       | `#FFF4E8`   | Permukaan hangat, hubungan dengan wajah maskot |
| Mint       | `#CCEEE5`   | Latar sorotan lembut                           |
| Coral      | `#FF6B5E`   | Aksen dan keluarga warna tindakan berisiko     |
| Emas       | `#FFC64D`   | Perhatian, penanda tinjau, aksen kecil         |
| Lavender   | `#A5A1C6`   | Elemen sekunder dan grafik                     |

Teal menjadi warna dominan setelah warna netral. Coral dan emas digunakan hemat, sesuai makna aksi/status. Jangan membuat seluruh kartu, tabel, dan tombol memakai warna jenuh atau gradient maskot.

## 3. Token semantik light dan dark

| Token            | Light     | Dark      |
| ---------------- | --------- | --------- |
| `background`     | `#FFFBF6` | `#171827` |
| `surface`        | `#FFFFFF` | `#222339` |
| `surface-subtle` | `#FFF4E8` | `#2B2C45` |
| `text-primary`   | `#343153` | `#FFF4E8` |
| `text-muted`     | `#625F79` | `#B9B6CE` |
| `border-subtle`  | `#E4DFE8` | `#41435D` |
| `control-border` | `#807B95` | `#85819E` |
| `primary`        | `#087F83` | `#49D3C9` |
| `on-primary`     | `#FFFFFF` | `#122C33` |
| `primary-soft`   | `#E0F5EF` | `#173C40` |
| `focus-ring`     | `#087F83` | `#49D3C9` |
| `danger`         | `#B93832` | `#FF9388` |
| `warning-text`   | `#775300` | `#FFD271` |
| `success-text`   | `#096A60` | `#69DCC5` |
| `info-text`      | `#514589` | `#C3BAF3` |

`border-subtle` memisahkan area dekoratif; input dan kontrol yang perlu batas untuk dikenali memakai `control-border`. Teks tombol selalu memakai pasangan foreground/background yang ditentukan, bukan warna logo mentah di atas putih.

Target aksesibilitas: rasio kontras minimal 4,5:1 untuk teks normal, 3:1 untuk teks besar dan elemen UI yang relevan. Semua pasangan, termasuk hover, disabled, badge, dan chart, perlu diuji pada implementasi; token bukan bukti bahwa seluruh kombinasi otomatis memenuhi target.

Tema mendukung terang, gelap, dan mengikuti sistem, dengan preferensi tersimpan. Grafik, editor, dialog, dropdown, dan konten soal mengikuti tema yang sama. Media soal tidak di-invert karena warna gambar dapat memengaruhi makna pertanyaan.

## 4. Aturan warna aksi dan status

- **Teal:** aksi utama seperti Simpan soal, Terbitkan, Mulai ujian, dan Kirim jawaban. Satu aksi utama yang jelas per area.
- **Indigo/netral:** navigasi, aksi sekunder, edit, filter, serta menu.
- **Emas:** peringatan, soal ditandai untuk tinjau, dan sisa waktu yang perlu diperhatikan. Emas bukan latar semua tombol.
- **Coral/danger:** gagal menyimpan, cabut akses, hapus, akhiri pengerjaan. Konsekuensi tertulis dan konfirmasi mengikuti dampaknya.
- **Mint/teal lembut:** berhasil tersimpan, selesai, atau memenuhi standar, disertai ikon/teks.
- **Lavender/indigo:** informasi dan status menunggu koreksi, dengan label yang tidak menyerupai status lulus.

Status tidak dibedakan hanya berdasarkan warna. Navigator soal memakai angka, label aksesibel, ikon jawaban/penanda, dan outline aktif. Kunci jawaban guru memakai tanda centang dan label; pilihan peserta memakai radio/checkbox native atau primitive aksesibel.

## 5. Tipografi dan layout

Usulan font antarmuka: **Plus Jakarta Sans**, self-hosted bila dipilih, dengan fallback `system-ui, sans-serif`. Nama Octopus tetap menggunakan wordmark asli, bukan diketik ulang memakai font UI. Lisensi dan file font diverifikasi saat pengadaan aset.

Ukuran dasar 16 px, label sekunder 14 px, isi soal 18 px dengan line-height sekitar 1,6. Ukuran kontrol mobile tidak dibuat lebih kecil untuk mengejar kepadatan. Panjang paragraf soal dibatasi agar nyaman dibaca, sementara tabel nilai dapat memakai area lebih lebar.

Gunakan skala spasi 4/8/12/16/24/32/48 px. Radius kontrol sekitar 10 px, kartu 14–16 px, dialog 18–20 px. Bayangan ringan hanya membantu hirarki. Sudut membulat mengikuti maskot tanpa menjadikan seluruh aplikasi seperti permainan anak.

Usulan breakpoint: di bawah 768 px satu kolom, 768–1023 px panel ringkas, mulai 1024 px sidebar dan workspace penuh. Sidebar desktop sekitar 240 px; area baca soal sekitar 720–800 px. Tabel dapat menggulir horizontal tanpa membuat halaman keseluruhan melebar. Target sentuh minimal 44 × 44 px.

## 6. Pola halaman utama

### Dashboard guru

Sidebar indigo/netral dengan item aktif teal lembut. Bagian atas berisi nama halaman, konteks sekolah, dan aksi utama. Ringkasan hanya menampilkan informasi yang menuntun tindakan: ujian aktif/mendatang dan koreksi tertunda. Maskot boleh muncul pada empty state atau onboarding, bukan pada setiap kartu.

### Bank soal dan impor

Bank soal memiliki pencarian, filter, daftar/kartu, tombol **Impor soal** dan **Buat soal**. Workspace impor desktop memiliki daftar nomor/status di kiri, editor luas di tengah, dan informasi validasi yang dapat dibuka. Hindari tiga panel permanen pada layar sempit.

Stepper menampilkan Susun soal → Tambahkan media → Tinjau dan simpan, dapat dikunjungi ulang. Toolbar seleksi berisi aksi singkat; aksi utama juga tersedia lewat keyboard/menu sehingga tidak bergantung pada tooltip atau hover. Status autosave selalu terlihat tanpa menutupi editor. Error menautkan pengguna ke soal bermasalah.

### Editor ujian

Kelompok pengaturan: informasi → soal → jadwal → peserta dan akses → aturan → hasil. Ringkasan sebelum publish memperlihatkan jumlah soal, total poin, jadwal/timezone, hard deadline, metode akses, dan kebijakan monitoring. Tindakan Tutup akses masuk dan Akhiri semua pengerjaan terpisah dengan uraian dampak.

### Portal peserta

Hilangkan sidebar dashboard guru. Header ringkas mempertahankan timer dan status simpan; tombol submit jelas tetapi tidak mudah tersentuh tanpa sengaja. Pertanyaan menjadi fokus layar. Pada mobile, navigator dibuka melalui tombol berlabel jumlah soal; footer tidak menutup teks atau input saat keyboard muncul.

Instruksi menyatakan batas waktu, koneksi, monitoring, dan hasil dalam bahasa sederhana sebelum mulai. Animasi, maskot, atau dekorasi tidak mengganggu pengerjaan. Submit berhasil menampilkan konfirmasi yang tegas; nilai hanya muncul bila sudah dirilis.

### Monitoring dan nilai

Monitoring mengutamakan tabel peserta, status, filter, dan aksi pengawas. Gangguan koneksi ditulis sebagai kondisi koneksi, bukan otomatis sebagai pelanggaran. Nilai dan analisis menampilkan jumlah sampel, filter aktif, chart bersama angka, serta tautan ke detail siswa/soal.

## 7. Grafik dan interaksi

Grafik memakai teal sebagai seri utama; indigo, lavender, emas, dan coral sebagai seri tambahan dengan label/legend. Kelulusan dilengkapi teks; grafik tidak bergantung pada pasangan merah/hijau. Sediakan data angka atau tabel yang setara. Dark mode menggunakan sumbu, grid, tooltip, dan label yang terbaca.

Setiap halaman memiliki keadaan loading, kosong, error, forbidden, dan retry yang relevan. Keberhasilan penyimpanan bersifat tenang; error penyimpanan persisten sampai ditangani. Toast bukan satu-satunya tempat menyatakan jawaban belum tersimpan.

Fokus keyboard terlihat dan dikembalikan secara masuk akal setelah split, merge, dialog, atau penghapusan. Dialog memiliki judul, deskripsi, focus trap, dan tombol batal. Drag memiliki alternatif tombol. Gerakan singkat sekitar 120–180 ms menghormati `prefers-reduced-motion`; countdown tidak diumumkan screen reader setiap detik.

Bahasa awal antarmuka: Indonesia, istilah konsisten seperti **Bank soal, Impor soal, Kunci jawaban, Tandai untuk ditinjau, Tersimpan, Menunggu koreksi**. Jangan menampilkan UUID, istilah RPC, atau detail teknis revision kepada guru/peserta kecuali dalam bantuan diagnostik yang memang diperlukan.

## 8. Kriteria penerimaan desain

1. Logo tulisan gelap dipakai pada latar terang, tulisan krem pada latar gelap, dan simbol pada ruang ringkas.
2. Kedua tema memakai keluarga warna logo; tidak ada warna aksen dominan baru tanpa alasan.
3. Alur guru dan peserta terbaca pada lebar 360 px tanpa scroll horizontal halaman.
4. Semua aksi inti dapat dipakai dengan keyboard dan sentuhan; fokus tetap terlihat.
5. Status simpan, jawaban, penanda tinjau, pending, dan gagal tidak bergantung pada warna saja.
6. Kontras aktual, zoom 200%, teks panjang, soal bergambar, tabel, dan keyboard mobile diuji pada UI jadi.
7. Halaman ujian tetap tenang, tanpa dekorasi yang menggeser konten atau menutupi waktu/status simpan.
