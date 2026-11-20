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

Soal kosong diperbolehkan selama penyusunan draft dan dapat dilengkapi kemudian. Delimiter tunggal maupun berurutan menghasilkan kartu soal yang dapat diedit. Jika draft lama masih berisi baris delimiter, Enter atau Ctrl/Cmd + Enter di baris itu akan mengonsumsinya menjadi batas soal. Split di tengah daftar atau elemen yang tidak aman tetap meminta pengguna memilih paragraf biasa. Nomor soal asli tidak dihapus otomatis. Label urutan kartu dikelola terpisah dari teks asli.

Gambar, tabel, ekstraksi opsi, kunci jawaban, penilaian, dan publikasi belum tersedia. Jika clipboard membawa gambar, editor menyatakan keterbatasannya dan tetap mengambil teks yang didukung. Tidak ada AI, parser dokumen berbayar, atau request penyimpanan ke server.

## Model dan batas modul

`features/question-import/document.ts` berisi schema dan transformasi ProseMirror tanpa komponen UI. `extensions.ts` menentukan node/mark yang didukung. `QuestionWorkspace.tsx` menghubungkan lifecycle SolidJS, selection, toolbar, keyboard, dan status penyimpanan. `draft-store.ts` menyediakan adapter IndexedDB; penyimpanan server nantinya dapat ditambahkan tanpa mengubah operasi split/merge.

Satu dokumen berisi satu atau lebih node question dengan ID stabil dan konten rich-text. Transaksi menambahkan ID yang hilang/duplikat setelah edit atau paste. Soal disimpan sebagai JSON terstruktur, bukan HTML yang langsung dieksekusi. Schema editor membatasi node dan mark yang dirender.

## Penyimpanan dan recovery

Database IndexedDB `octopus-local-drafts`, object store `drafts`, menyimpan formatVersion, ID, judul, dokumen, jumlah soal, revision, serta waktu pembuatan/perubahan. Format awal menggunakan versi 1. Dokumen divalidasi sebelum editor dibuka; draft yang tidak dapat dibaca tidak ditimpa dengan dokumen kosong.

Satu writer menserialisasi save dan menggabungkan snapshot terbaru ketika perubahan datang cepat. Transaksi read-modify-write memeriksa revision sebelum menulis. Tab dengan revision lama menampilkan konflik dan tidak menimpa tab lain. Pengguna dapat mengunduh salinan perubahan yang belum tersimpan. Gagal simpan dipertahankan sebagai error terlihat dan dapat dicoba lagi jika bukan konflik.

Status **Tersimpan di browser ini** berarti transaksi IndexedDB selesai, bukan tersimpan ke server. Navigasi atau penutupan halaman dengan perubahan belum tersimpan memicu peringatan browser. Sebelum reload atau menutup tab, tunggu status tersimpan. Browser yang memblokir penyimpanan menampilkan error, bukan mengklaim draft berhasil dibuat.

Data terikat pada profil browser, perangkat, dan origin URL yang sama. `localhost`, `127.0.0.1`, atau port yang berbeda memiliki penyimpanan berbeda. Menghapus data situs, profil privat yang ditutup, atau penggusuran storage oleh browser dapat menghapus draft. Unduh JSON untuk menyimpan salinan di luar browser. Pemulihan otomatis dari file JSON belum tersedia pada tahap ini.

History undo tidak dipulihkan setelah reload; konten draft terakhir yang berhasil tersimpan tetap tersedia. Media tidak disimpan pada tahap ini.

Pemisahan otomatis hanya dipicu oleh input teks, bukan saat memuat ulang draft atau menjalankan undo/redo. Undo pada delimiter yang baru diketik mengembalikan keadaan sebelum karakter pemicu terakhir; redo mengembalikan batas soal beserta fokusnya. Isi soal dan formatting tetap dipertahankan.

## Pengujian

Unit tests memeriksa 50 soal, delimiter inline/kosong, formatting, ID, split di tengah paragraf, merge, undo/redo, revision conflict, dan antrean autosave cepat. Browser tests mencakup paste rich text, perubahan struktur, reload/resume, daftar draft, download cadangan, konflik dua tab, kegagalan storage, aksesibilitas kedua tema, dan viewport mobile.

Verifikasi perangkat fisik, dokumen Word dari guru nyata, dan pengujian lintas browser masih diperlukan sebelum penerimaan sekolah. Alur ini adalah editor lokal untuk dicoba, bukan bank soal server atau engine ujian yang sudah siap dipakai.

Hasil lokal pada 20 November 2026: `pnpm check` lulus (format, lint, typecheck, 9 unit/component test, build). `pnpm test:e2e` lulus 37 skenario dengan satu skip untuk skenario khusus mobile pada konfigurasi desktop. Pemeriksaan Axe mencakup editor terang/gelap dan viewport 360 px. Animasi dialog ditunggu selesai sebelum pengukuran kontras; transisi background tombol dihapus agar perpindahan tema tidak melewati warna yang kontrasnya rendah.
