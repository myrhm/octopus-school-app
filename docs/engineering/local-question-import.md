# Impor soal lokal

Editor awal menyediakan alur dokumen → draft soal tanpa backend. Pilih **Impor soal** pada Bank Soal untuk membuat draft baru. Tempel teks dari dokumen, susun batas antarsoal, beri nama draft, lalu lanjutkan kembali dari daftar draft lokal.

## Kemampuan yang tersedia

- Rich-text editor Tiptap/ProseMirror dengan paragraf, bold, italic, underline, serta daftar.
- Ctrl/Cmd + Enter langsung membagi soal dan memfokuskan bagian berikutnya, termasuk membuat soal kosong ketika kursor berada di akhir teks atau draft masih kosong. Tombol **Tambah soal** membuat soal kosong setelah soal aktif tanpa membagi isinya.
- Mengetik `%%%` pada baris tersendiri langsung mengubahnya menjadi batas soal dan memindahkan fokus ke soal berikutnya. Baris Enter dan Shift+Enter sama-sama didukung. Delimiter inline di dalam kalimat tetap menjadi teks biasa.
- Dokumen yang di-paste dapat dipisah sekaligus menggunakan tombol **Pisahkan dengan %%%**. Delimiter pada akhir dokumen membuat soal berikutnya yang kosong; tidak perlu menulis isi soal berikutnya terlebih dahulu.
- Merge dengan soal sebelumnya/berikutnya, tanpa menghilangkan urutan isi.
- Undo/redo teks dan perubahan struktur dalam satu history editor. Satu split/merge menjadi satu operasi undo.
- Autosave lokal, daftar draft, pencarian judul, reload/resume, dan unduhan JSON berisi salinan draft terkini.
- Seleksi teks menjadi satu atau beberapa opsi, pengurutan naik/turun, pemilihan satu kunci berdasarkan ID, serta pengembalian opsi ke teks soal. Seluruh operasi mengikuti undo/redo editor.

Soal kosong diperbolehkan selama penyusunan draft dan dapat dilengkapi kemudian. Delimiter tunggal maupun berurutan menghasilkan kartu soal yang dapat diedit. Jika draft lama masih berisi baris delimiter, Enter atau Ctrl/Cmd + Enter di baris itu akan mengonsumsinya menjadi batas soal. Split di tengah daftar atau elemen yang tidak aman tetap meminta pengguna memilih paragraf biasa. Nomor soal asli tidak dihapus otomatis. Label urutan kartu dikelola terpisah dari teks asli.

Gambar, tabel, penilaian, dan publikasi belum tersedia. Jika clipboard membawa gambar, editor menyatakan keterbatasannya dan tetap mengambil teks yang didukung. Tidak ada AI, parser dokumen berbayar, atau request penyimpanan ke server.

## Ekstraksi dan pengaturan opsi

Seleksi hanya teks jawaban dalam satu soal, lalu pilih **Jadikan opsi**. Untuk beberapa opsi sekaligus, seleksi baris berlabel berurutan seperti A., B), (C), atau huruf kecil, lalu pilih **Ekstrak beberapa opsi**. Paragraf lanjutan tetap menjadi bagian opsi sebelumnya. Baris Shift+Enter dikenali. Jika label tidak berurutan atau seleksi ambigu, editor menjelaskan fallback ekstraksi satu per satu dan tidak mengubah konten.

Konten dipindahkan dari pertanyaan ke attrs opsi sebagai blok rich text; label sumber dihapus hanya dari tampilan opsi. Anchor internal mengikuti lokasi sumber di dokumen agar **Kembalikan ke soal** memulihkan slice beserta label/format asal. Jika pengguna menghapus anchor ketika mengedit badan soal, isi opsi tetap tersimpan dan pengembalian memakai akhir soal. Opsi dapat diedit dengan mengembalikannya ke badan soal, memperbaiki teks, lalu mengekstraknya kembali.

Urutan array menentukan label A/B/C. Kunci disimpan sebagai correctOptionId sehingga tetap benar saat urutan berubah. Mengembalikan opsi yang menjadi kunci mengosongkan kunci tersebut. Split/delimiter memindahkan opsi mengikuti anchor; opsi yang anchor-nya sudah dihapus tetap pada soal asal. Merge mempertahankan semua opsi. Jika dua soal memiliki kunci berbeda, editor menyimpan kandidat internal dan meminta guru memilih ulang, tanpa memilih salah satunya secara diam-diam.

Panel menampilkan opsi untuk soal aktif. Tombol naik/turun, radio kunci, dan pengembalian dapat dipakai tanpa drag. Format ekstraksi, pengurutan, kunci, dan metadata pemulihan ikut tersimpan pada draft lokal. Draft lama tetap dibaca dengan options kosong dan correctOptionId null.

Kontrak bersama pekerjaan preview tersedia di [kontrak soal v1](question-contract-v1.md). Preview memakai fixture/snapshot terpisah tanpa kunci atau metadata editor; pekerjaan akun 1 ini tidak menambahkan layar preview.

Verifikasi ekstraksi opsi pada 21 November 2026: `pnpm check` lulus (format, lint, typecheck, 23 unit/component test, build). `pnpm test:e2e` lulus 53 skenario dengan satu skip khusus mobile pada konfigurasi desktop. Kasus tambahan mencakup seleksi parsial, label ambigu, opsi multibaris, source anchor yang terhapus, split/merge berkunci, snapshot siswa tanpa kunci, reorder, reload, pengembalian opsi, serta aksesibilitas kedua tema dan viewport mobile.

## Model dan batas modul

`features/question-import/document.ts` berisi schema dan transformasi ProseMirror tanpa komponen UI. `extensions.ts` menentukan node/mark yang didukung. `QuestionWorkspace.tsx` menghubungkan lifecycle SolidJS, selection, toolbar, keyboard, dan status penyimpanan. `draft-store.ts` menyediakan adapter IndexedDB; penyimpanan server nantinya dapat ditambahkan tanpa mengubah operasi split/merge.

Satu dokumen berisi satu atau lebih node question dengan ID stabil dan konten rich-text. Transaksi menambahkan ID yang hilang/duplikat setelah edit atau paste. Soal disimpan sebagai JSON terstruktur, bukan HTML yang langsung dieksekusi. Schema editor membatasi node dan mark yang dirender.

## Penyimpanan dan recovery

Database IndexedDB `octopus-local-drafts`, object store `drafts`, menyimpan formatVersion, ID, judul, dokumen, jumlah soal, revision, serta waktu pembuatan/perubahan. Draft baru dan semua save memakai formatVersion 2 untuk melindungi atribut opsi/kunci dari editor lama yang hanya menerima versi 1. Versi database IndexedDB tetap 1; versi format record berbeda dari versi database maupun kontrak publik soal v1.

Draft versi 1 diterima dan dimigrasi di memori tanpa mengubah dokumen, revision, atau record tersimpan hanya karena dibuka. Edit berikutnya disimpan secara atomik sebagai versi 2 dengan revision check yang sama. Record dengan versi yang belum didukung ditolak dan tidak ditimpa, termasuk bila revision cocok. Dokumen divalidasi sebelum editor dibuka; draft yang tidak dapat dibaca tidak ditimpa dengan dokumen kosong.

Satu writer menserialisasi save dan menggabungkan snapshot terbaru ketika perubahan datang cepat. Transaksi read-modify-write memeriksa revision sebelum menulis. Tab dengan revision lama menampilkan konflik dan tidak menimpa tab lain. Pengguna dapat mengunduh salinan perubahan yang belum tersimpan. Gagal simpan dipertahankan sebagai error terlihat dan dapat dicoba lagi jika bukan konflik.

Status **Tersimpan di browser ini** berarti transaksi IndexedDB selesai, bukan tersimpan ke server. Navigasi atau penutupan halaman dengan perubahan belum tersimpan memicu peringatan browser. Sebelum reload atau menutup tab, tunggu status tersimpan. Browser yang memblokir penyimpanan menampilkan error, bukan mengklaim draft berhasil dibuat.

Data terikat pada profil browser, perangkat, dan origin URL yang sama. `localhost`, `127.0.0.1`, atau port yang berbeda memiliki penyimpanan berbeda. Menghapus data situs, profil privat yang ditutup, atau penggusuran storage oleh browser dapat menghapus draft. Unduh JSON untuk menyimpan salinan di luar browser. Pemulihan otomatis dari file JSON belum tersedia pada tahap ini.

History undo tidak dipulihkan setelah reload; konten draft terakhir yang berhasil tersimpan tetap tersedia. Media tidak disimpan pada tahap ini.

Pemisahan otomatis hanya dipicu oleh input teks, bukan saat memuat ulang draft atau menjalankan undo/redo. Undo pada delimiter yang baru diketik mengembalikan keadaan sebelum karakter pemicu terakhir; redo mengembalikan batas soal beserta fokusnya. Isi soal dan formatting tetap dipertahankan.

## Pengujian

Unit tests memeriksa 50 soal, delimiter inline/kosong, formatting, ID, split di tengah paragraf, merge, undo/redo, revision conflict, dan antrean autosave cepat. Browser tests mencakup paste rich text, perubahan struktur, reload/resume, daftar draft, download cadangan, konflik dua tab, kegagalan storage, aksesibilitas kedua tema, dan viewport mobile.

Verifikasi perangkat fisik, dokumen Word dari guru nyata, dan pengujian lintas browser masih diperlukan sebelum penerimaan sekolah. Alur ini adalah editor lokal untuk dicoba, bukan bank soal server atau engine ujian yang sudah siap dipakai.

Hasil lokal pada 20 November 2026: `pnpm check` lulus (format, lint, typecheck, 9 unit/component test, build). `pnpm test:e2e` lulus 37 skenario dengan satu skip untuk skenario khusus mobile pada konfigurasi desktop. Pemeriksaan Axe mencakup editor terang/gelap dan viewport 360 px. Animasi dialog ditunggu selesai sebelum pengukuran kontras; transisi background tombol dihapus agar perpindahan tema tidak melewati warna yang kontrasnya rendah.

## Perbaikan hasil review PR 4

Seleksi di dalam daftar mempertahankan ancestor list beserta atribut start. Ordered list mulai nomor 3 tetap memakai nomor awal 3 pada opsi dan pemulihan. Seleksi mulai item kedua memakai nomor aktualnya (4). Source menyimpan slice asli serta fallback blok lengkap, sehingga penghapusan anchor tidak mengubah ordered list menjadi bullet list.

Regresi mencakup dokumen beropsi setelah semua anchor dihapus, penolakan oleh guard klien lama, migrasi v1 tanpa write saat dibuka, penyimpanan v2, dan pemulihan daftar dengan/tanpa anchor.
