# Spesifikasi Fitur — Bulk Question Import & Visual Question Structuring

**Produk:** Platform Ujian Online / CBT  
**Modul:** Question Bank & Exam Authoring  
**Versi spesifikasi:** 1.0  
**Prioritas:** MVP — Core Feature  
**Frontend:** SolidJS + TypeScript  
**Backend:** Supabase (PostgreSQL, Auth, Storage)  
**Prinsip utama:** Zero AI Dependency, Non-Destructive Editing, Progressive Structuring

---

# 1. Ringkasan Produk

## 1.1. Tujuan

Membangun sistem pembuatan soal yang memungkinkan guru mengubah kumpulan soal yang sudah ditulis dalam dokumen menjadi data soal terstruktur dengan interaksi seminimal mungkin.

Sistem harus mendukung dua cara pembuatan soal:

1. **Manual Question Creation:** Membuat soal baru satu per satu melalui editor formulir.
2. **Bulk Question Import:** Menempelkan seluruh kumpulan soal sekaligus, kemudian memisahkan, menyusun, dan melengkapinya secara visual.

Bulk Import menjadi fitur utama yang membedakan aplikasi dari formulir konvensional.

Sistem tidak menggunakan AI, tidak memerlukan layanan parsing berbayar, dan tidak mewajibkan guru mengikuti format dokumen khusus.

## 1.2. Masalah yang Diselesaikan

Guru umumnya sudah mempunyai soal di Microsoft Word atau dokumen lain. Namun, ketika ingin menggunakan Google Forms atau platform CBT, guru perlu berulang kali:

- Menyalin pertanyaan.
- Membuat item soal baru.
- Menempelkan pertanyaan.
- Menyalin setiap pilihan jawaban.
- Menentukan jawaban benar.
- Mengunggah ulang gambar.
- Mengulangi proses tersebut untuk seluruh soal.

Sistem yang dikembangkan harus mengurangi pekerjaan repetitif tersebut dengan mempertahankan sebanyak mungkin konten dari dokumen asli, kemudian memungkinkan guru melakukan transformasi struktur langsung di dalam editor.

## 1.3. Prinsip Desain

**A. Progressive Structuring**

Konten tidak harus langsung memiliki struktur sempurna. Guru boleh memulai dari dokumen mentah dan menyempurnakannya secara bertahap.

**B. Non-Destructive Transformation**

Pemisahan, penggabungan, ekstraksi jawaban, dan operasi lain tidak boleh menghilangkan konten tanpa persetujuan pengguna.

**C. Reversibility**

Semua operasi transformasi harus dapat dibatalkan melalui Undo atau operasi kebalikan yang jelas.

**D. No Mandatory Formatting**

Guru tidak wajib mengikuti template atau menambahkan delimiter secara manual. Delimiter dan shortcut hanya merupakan fasilitas tambahan.

**E. Separation of Content and Structure**

Teks soal, pilihan jawaban, kunci jawaban, dan aset gambar merupakan bagian data yang berbeda, tetapi tetap terhubung dalam satu question draft.

**F. Human-Controlled Interpretation**

Sistem boleh membantu mendeteksi pola, tetapi tidak boleh menentukan makna jawaban atau mengarang konten secara otomatis.

---

# 2. Ruang Lingkup MVP

## 2.1. Termasuk

- Pembuatan soal manual.
- Bulk paste dari dokumen.
- Dukungan teks dan formatting dasar.
- Pemisahan soal menggunakan delimiter.
- Pemisahan soal pada posisi kursor.
- Penggabungan soal.
- Ekstraksi teks terpilih menjadi pilihan jawaban.
- Ekstraksi beberapa pilihan sekaligus.
- Pengembalian pilihan jawaban menjadi teks pertanyaan.
- Penentuan kunci jawaban.
- Pengunggahan gambar melalui drag-and-drop.
- Gambar pada pertanyaan maupun pilihan jawaban.
- Undo/redo.
- Auto-detect pola nomor soal dan pilihan jawaban.
- Preview soal.
- Draft autosave.
- Validasi hasil.
- Penyimpanan ke bank soal.

## 2.2. Tidak Termasuk MVP

- AI question extraction.
- OCR gambar atau dokumen scan.
- Interpretasi semantik otomatis.
- Penentuan kunci jawaban oleh AI.
- Konversi PDF kompleks.
- DOCX layout reconstruction yang menjamin kesetiaan penuh terhadap dokumen asli.
- Collaborative editing secara bersamaan.
- Generasi soal otomatis.

Arsitektur tidak boleh menghalangi penambahan fitur tersebut pada masa depan.

---

# 3. Alur Utama Pengguna

Sistem terdiri atas tiga tahap utama:

**Tahap 1 — Structure Questions**

Guru menempelkan seluruh teks soal, memisahkan pertanyaan, mengekstraksi pilihan jawaban, dan menetapkan kunci.

**Tahap 2 — Attach Media**

Guru menambahkan gambar, diagram, atau ilustrasi ke pertanyaan dan pilihan jawaban.

**Tahap 3 — Review & Save**

Guru memeriksa hasil akhir, memperbaiki kesalahan, kemudian menyimpannya ke bank soal.

Wizard bersifat non-linear. Pengguna dapat kembali ke tahap sebelumnya tanpa kehilangan progres.

## 3.1. User Journey

1. Guru membuka halaman Bank Soal.
2. Guru memilih Create Questions.
3. Sistem menyediakan pilihan Manual atau Bulk Import.
4. Guru memilih Bulk Import.
5. Guru menempelkan dokumen lengkap.
6. Sistem menampilkan seluruh konten dalam satu blok.
7. Guru memisahkan blok menjadi beberapa soal.
8. Guru mengekstraksi pilihan jawaban dari masing-masing soal.
9. Guru menentukan kunci jawaban.
10. Guru berpindah ke tahap Attach Media.
11. Guru memasukkan gambar pada lokasi yang diperlukan.
12. Guru membuka tahap Review.
13. Sistem menampilkan peringatan untuk soal yang belum lengkap.
14. Guru memperbaiki soal jika diperlukan.
15. Guru menyimpan hasilnya sebagai kumpulan soal dalam bank soal.

Pada setiap tahapan, draft tersimpan otomatis.

---

# 4. Tahap 1 — Structure Questions

## 4.1. Bulk Paste Editor

### Deskripsi

Pada awal impor, guru melihat satu rich text editor besar.

Editor menerima teks yang disalin dari Microsoft Word, Google Docs, halaman web, atau sumber lainnya.

### Perilaku

- Mendukung paste menggunakan Ctrl+V.
- Mempertahankan paragraf, line break, bold, italic, underline, dan daftar sejauh didukung editor.
- Tidak menampilkan kode HTML mentah.
- Membersihkan HTML berbahaya.
- Mendukung teks Unicode, simbol matematika, dan karakter khusus.
- Menyediakan Clear, Undo, Redo, serta shortcut standar.
- Menampilkan jumlah karakter dan perkiraan jumlah soal.
- Tidak menghapus nomor soal secara otomatis.

### Penanganan gambar yang ikut ter-paste

Jika clipboard menyertakan gambar yang dapat diekstrak, sistem boleh menerimanya dan menyimpannya sebagai aset draft.

Jika gambar gagal terbawa dari Word, konten teks tetap dapat diimpor dan guru dapat menambah gambar pada tahap berikutnya.

Tidak boleh menjanjikan bahwa setiap format Word pasti mempertahankan gambar ketika ditempelkan.

### Teknologi

Gunakan Tiptap/ProseMirror dengan integrasi SolidJS atau editor rich text setara yang mendukung akses ke posisi selection dan transaksi dokumen.

Catatan implementasi: integrasi SolidJS perlu dibuat melalui lifecycle yang tepat dan tidak boleh mengasumsikan seluruh API React dapat digunakan langsung.

---

# 5. Question Splitting

## 5.1. Model Awal

Seluruh dokumen yang di-paste diperlakukan sebagai satu `QuestionDraft` sementara.

Contoh:

    Question Draft 1
    ├── 1. Apa ibu kota Indonesia?
    ├── A. Bandung
    ├── B. Jakarta
    ├── C. Surabaya
    ├── D. Medan
    ├── 2. Berapa hasil 12 × 3?
    ├── A. 24
    ├── B. 30
    ├── C. 36
    └── D. 48

Guru dapat membagi draft tersebut menjadi beberapa question drafts.

## 5.2. Split Using Delimiter

Delimiter default: `%%%`

Syarat:

- Delimiter hanya dikenali jika berada pada baris tersendiri.
- Whitespace di sekitar delimiter boleh diabaikan.
- Delimiter yang terdeteksi menjadi batas antarsoal.
- Delimiter tidak dimasukkan ke konten soal.
- Delimiter yang muncul sebagai bagian teks biasa tidak otomatis memicu pemisahan.
- Hasil pemisahan tidak boleh menghasilkan soal kosong tanpa peringatan.

Contoh:

    1. Apa ibu kota Indonesia?
    A. Bandung
    B. Jakarta
    %%%
    2. Berapa hasil 12 × 3?
    A. 24
    B. 36

Hasil:

    Question Draft 1
    Question Draft 2

Delimiter harus dapat dikonfigurasi di masa depan, tetapi tidak memerlukan UI pengaturan khusus pada MVP.

**Catatan UX:** Pemisahan langsung ketika guru mengetik karakter `%%%` sebaiknya hanya dilakukan setelah delimiter selesai sebagai baris tersendiri. Hindari mengubah struktur ketika pengguna masih mengetik karakter biasa.

## 5.3. Split at Cursor

Guru meletakkan kursor di posisi tertentu, kemudian memilih:

**Split Here**

Shortcut yang disarankan: `Ctrl+Enter` pada Windows/Linux, `Cmd+Enter` pada macOS, selama tidak bertabrakan dengan perintah editor lain.

Perilaku:

1. Identifikasi posisi kursor dalam question draft aktif.
2. Pisahkan konten menjadi bagian sebelum dan sesudah kursor.
3. Pertahankan formatting dan urutan blok.
4. Buat question draft baru untuk bagian setelah kursor.
5. Letakkan draft baru tepat setelah draft sebelumnya.
6. Pindahkan fokus ke draft baru bila sesuai.
7. Catat operasi sebagai satu transaksi Undo.

Jika kursor berada di tengah paragraf, sistem boleh membelah paragraf pada posisi tersebut, tetapi harus mempertahankan seluruh teks.

Jika kursor berada di dalam elemen kompleks yang tidak dapat dipisahkan dengan aman, tampilkan pesan dan minta pengguna memilih batas paragraf.

## 5.4. Merge Questions

Setiap question card memiliki menu:

- Merge with Previous
- Merge with Next

Fitur ini terutama digunakan ketika guru salah memisahkan satu soal menjadi dua.

Perilaku:

- Konten kedua draft digabung sesuai urutan.
- Tidak ada konten yang dibuang.
- Gambar dan pilihan jawaban dipertahankan.
- Jika kedua draft sudah mempunyai kunci jawaban, sistem tidak boleh diam-diam memilih salah satunya.
- Konflik struktur harus ditandai untuk ditinjau.
- Operasi tercatat dalam Undo history.

Question draft ID yang digabung tidak boleh menyebabkan referensi gambar atau jawaban menjadi yatim.

---

# 6. Answer Option Extraction

## 6.1. Extract Selected Text

Guru dapat menyeleksi bagian teks di dalam pertanyaan dan menggunakan toolbar kontekstual:

**Make Answer Option**

Contoh kondisi awal:

    Apa ibu kota Indonesia?

    A. Bandung
    B. Jakarta
    C. Surabaya
    D. Medan

Guru menyeleksi `A. Bandung`.

Sistem memindahkan teks tersebut ke sebuah answer option terstruktur.

Hasil:

    QUESTION
    Apa ibu kota Indonesia?

    OPTIONS
    A. Bandung

Sisa teks tetap berada dalam editor pertanyaan.

### Perilaku

- Teks yang dipilih dipindahkan, bukan diduplikasi.
- Formatting dasar dipertahankan.
- Huruf label `A.` dapat dihapus otomatis jika cocok dengan pola yang didukung.
- Label baru dikelola oleh sistem berdasarkan posisi pilihan.
- Selection tidak boleh menghapus konten di luar rentang yang dipilih.
- Mendukung Undo.

## 6.2. Extract Multiple Options

Guru dapat menyeleksi beberapa baris sekaligus lalu memilih:

**Extract as Multiple Options**

Contoh:

    A. Bandung
    B. Jakarta
    C. Surabaya
    D. Medan

Sistem menghasilkan empat answer options.

Pola yang dikenali pada MVP:

    A. Jawaban
    B) Jawaban
    (C) Jawaban
    a. Jawaban
    b) Jawaban

Parser harus mendukung pilihan yang terdiri atas beberapa paragraf atau memiliki teks panjang, tetapi hanya melakukan pemisahan otomatis ketika batas antaropsi dapat dikenali dengan cukup jelas.

Jika format ambigu, jangan memaksakan hasil. Tampilkan preview atau sediakan pilihan untuk membatalkan dan melakukan ekstraksi manual.

### Penanganan nomor dan huruf

Label pilihan seperti A, B, C, D merupakan properti tampilan, bukan bagian permanen dari teks jawaban.

Dengan demikian, jika guru memindahkan pilihan D ke posisi B, label mengikuti urutan baru.

## 6.3. Reordering Answer Options

Guru dapat mengubah urutan pilihan melalui:

- Drag handle.
- Move Up.
- Move Down.

Jangan hanya mengandalkan drag-and-drop karena perangkat sentuh dan aksesibilitas keyboard harus tetap didukung.

Kunci jawaban disimpan berdasarkan ID pilihan, bukan hurufnya.

Contoh: jawaban yang sebelumnya berlabel C tetap menjadi jawaban benar walaupun dipindahkan ke posisi A.

## 6.4. Return Option to Question

Setiap answer option memiliki tindakan:

**Move Back to Question**

Perilaku:

- Konten pilihan dikembalikan ke editor pertanyaan.
- Format aslinya sebisa mungkin dipertahankan.
- Posisi pengembalian menggunakan posisi sumber jika masih valid; jika tidak, sistem menyediakan posisi yang dapat diprediksi dan bisa disunting.
- Jika pilihan merupakan jawaban benar, referensi kunci dihapus.
- Seluruh operasi mendukung Undo.

## 6.5. Manual Answer Option

Guru juga dapat membuat pilihan jawaban kosong dengan tombol:

**Add Option**

Ini berguna ketika opsi tidak ada dalam dokumen atau guru ingin menambahkan pilihan baru.

---

# 7. Question Types and Answer Keys

## 7.1. Tipe Soal MVP

MVP mendukung:

**Single Choice**

Satu jawaban benar dari beberapa pilihan. Kunci dipilih menggunakan radio button.

**Multiple Choice — Multiple Answers**

Lebih dari satu jawaban benar. Kunci dipilih menggunakan checkbox.

**Essay**

Pertanyaan tanpa daftar pilihan. Guru dapat menambahkan model jawaban dan pedoman penilaian.

**Short Answer**

Jawaban berupa teks singkat. Penilaian otomatis opsional melalui kecocokan yang didefinisikan guru, bukan evaluasi makna semantik.

Untuk MVP, prioritas implementasi dapat dimulai dari Single Choice dan Essay terlebih dahulu.

## 7.2. Penentuan Kunci

Setelah pilihan terbentuk, guru menentukan jawaban benar dengan satu klik.

Sistem tidak boleh menebak kunci berdasarkan pengetahuan umum.

Jika dokumen memiliki baris seperti `Kunci: B`, rule-based parser boleh menawarkan penetapan kunci tersebut, tetapi harus dapat ditinjau pengguna.

Jika tidak ditemukan kunci, status soal menjadi `needs_review`.

## 7.3. Bobot Nilai

Setiap soal mempunyai:

- Bobot nilai default.
- Bobot yang dapat diubah.
- Opsi mengikuti nilai default ujian atau bank soal.

Nilai default harus tersedia agar guru tidak diwajibkan mengatur bobot satu per satu.

---

# 8. Rule-Based Auto Detection

## 8.1. Tujuan

Mengurangi pekerjaan manual tanpa menggunakan AI.

Sistem mendeteksi pola tekstual yang umum ditemukan dalam dokumen soal.

## 8.2. Question Number Detection

Pola kandidat:

    1. Pertanyaan
    2. Pertanyaan

    1) Pertanyaan
    2) Pertanyaan

    Soal 1:
    Soal 2:

Pendeteksian harus mempertimbangkan urutan nomor dan konteks paragraf, bukan hanya regex yang mencocokkan angka di awal baris.

Contohnya, daftar bernomor di dalam sebuah soal tidak boleh otomatis dianggap sebagai kumpulan soal baru.

## 8.3. Suggested Split

Ketika pola ditemukan, sistem menawarkan:

**Detected 25 potential questions — Preview Split**

Guru dapat:

- Menerapkan semua pemisahan.
- Memeriksa titik pemisahan.
- Membatalkan.
- Mengembalikan hasil melalui Undo.

Jangan menerapkan auto-split secara diam-diam.

## 8.4. Option Detection

Setelah soal dipisahkan, sistem dapat mencari kelompok pilihan jawaban dengan pola huruf berurutan.

Misalnya:

    A. ...
    B. ...
    C. ...
    D. ...

Sistem menawarkan:

**Extract 4 Answer Options**

Guru dapat menerima atau menolak.

## 8.5. Confidence dan Keterbatasan

Karena tidak menggunakan AI, sistem tidak membutuhkan confidence probabilistik yang dibuat-buat.

Gunakan hasil pemeriksaan berbasis aturan:

- `matched`: pola memenuhi aturan.
- `ambiguous`: lebih dari satu interpretasi memungkinkan.
- `unmatched`: pola tidak dikenali.

Auto-detect tidak harus berhasil untuk setiap format. Fallback utamanya tetap editor manual yang cepat dan nyaman.

---

# 9. Tahap 2 — Attach Media

## 9.1. Tujuan

Memberikan mekanisme untuk menambahkan gambar setelah struktur soal terbentuk.

Namun, gambar yang sudah ada dari tahap pertama tidak boleh dihapus atau diminta diunggah ulang.

## 9.2. Tampilan

Tampilkan daftar question cards.

Setiap question card memiliki area media pada:

- Question content.
- Answer option A.
- Answer option B.
- Answer option C.
- Answer option lainnya.

Untuk pertanyaan yang memerlukan gambar pada posisi spesifik di tengah teks, editor harus mendukung penyisipan gambar pada posisi kursor, bukan hanya satu area lampiran di bagian bawah.

## 9.3. Drag and Drop

Guru dapat:

1. Memilih gambar dari file explorer.
2. Menyeret gambar ke question card.
3. Melepas gambar pada area yang dimaksud.
4. Melihat preview.
5. Mengubah ukuran tampilan gambar.
6. Menghapus atau mengganti gambar.

Dukungan awal:

- PNG.
- JPEG.
- WebP.

GIF, SVG, dan format lain tidak perlu didukung pada MVP.

## 9.4. Clipboard Images

Guru dapat menempelkan gambar langsung dari clipboard apabila browser menyediakan data gambar.

Jika clipboard hanya menyediakan representasi yang tidak dapat diekstrak, tampilkan pesan yang jelas dan tawarkan upload file.

## 9.5. Asset Handling

Setiap gambar memiliki ID unik.

Simpan metadata:

- Asset ID.
- Original filename.
- MIME type.
- File size.
- Storage path.
- Owner/tenant.
- Upload status.
- Reference count atau mekanisme referensi yang setara.

Gunakan Supabase Storage dengan validasi MIME type dan batas ukuran file.

Jangan menghapus gambar fisik hanya karena guru melakukan Undo, Merge, atau menghapus salah satu referensi gambar. Gunakan lifecycle aset dan pembersihan terkontrol untuk file yang benar-benar tidak lagi digunakan.

## 9.6. Upload Failure

Jika upload gagal:

- Draft pertanyaan tetap tersedia.
- Sistem menampilkan status gagal.
- Guru dapat mencoba upload ulang.
- Tidak boleh menampilkan gambar seolah-olah sudah berhasil tersimpan.
- Tombol Save/Publish harus mempertimbangkan aset yang belum selesai diunggah.

---

# 10. Tahap 3 — Review & Save

## 10.1. Question Review

Tampilkan seluruh hasil impor dalam format yang mendekati tampilan siswa.

Setiap soal memperlihatkan:

- Nomor soal.
- Pertanyaan.
- Gambar.
- Pilihan jawaban.
- Kunci jawaban.
- Jenis soal.
- Bobot nilai.
- Status validasi.

Guru dapat langsung mengedit soal tanpa mengulang proses impor.

## 10.2. Validation

Validasi dilakukan pada dua tingkat:

**Draft Validation**

Memeriksa kondisi yang mungkin memerlukan perhatian, tetapi masih diperbolehkan pada draft.

Contoh:

- Pertanyaan kosong.
- Tidak ada pilihan jawaban.
- Kunci jawaban belum ditentukan.
- Ada upload gambar yang gagal.
- Ada teks sisa yang belum dipisahkan.
- Ada lebih dari satu kunci pada soal single choice.

**Publish Validation**

Memastikan soal siap digunakan dalam ujian sesuai aturan tipe soal.

Contohnya, soal single choice wajib memiliki pertanyaan, pilihan yang valid, dan tepat satu jawaban benar sebelum digunakan untuk ujian yang dinilai otomatis.

Draft tetap boleh disimpan walaupun belum lengkap.

## 10.3. Review Status

Gunakan status:

- `ready`
- `needs_review`
- `incomplete`

Status merupakan hasil validasi terkini, bukan label yang diubah secara sembarangan oleh AI atau pengguna.

## 10.4. Batch Actions

Guru dapat:

- Memilih beberapa soal.
- Mengubah bobot secara massal.
- Memindahkan soal ke bank soal tertentu.
- Menghapus draft terpilih dengan konfirmasi.
- Menyimpan semua soal.
- Menyimpan hanya soal yang valid.

## 10.5. Save to Question Bank

Setelah konfirmasi:

1. Validasi setiap soal.
2. Simpan soal terstruktur.
3. Simpan pilihan jawaban.
4. Simpan hubungan dengan aset gambar.
5. Simpan kunci jawaban secara aman.
6. Laporkan soal yang berhasil maupun gagal disimpan.
7. Hindari duplikasi akibat klik ulang atau retry.

Penyimpanan bulk sebaiknya menggunakan operasi server yang atomik per batch atau strategi transaksi yang hasilnya jelas bagi pengguna.

Jangan menghapus import draft sebelum keberhasilan penyimpanan terkonfirmasi.

---

# 11. Draft Persistence & Undo/Redo

## 11.1. Autosave

Sistem menyimpan draft secara otomatis, menggunakan debounce untuk membatasi frekuensi request.

Tampilkan status:

- Saving…
- Saved
- Unsaved changes
- Save failed

Gunakan revision number untuk mencegah request lama menimpa perubahan baru.

## 11.2. Local Recovery

Jika koneksi terputus, simpan perubahan yang belum terkirim ke penyimpanan lokal yang sesuai, misalnya IndexedDB.

Ketika koneksi kembali, sistem mencoba sinkronisasi.

Jika versi lokal dan server berbeda, jangan menimpa salah satunya tanpa penanganan konflik.

## 11.3. Undo/Redo

Operasi yang harus bisa dibatalkan:

- Split question.
- Merge question.
- Extract answer option.
- Return answer option.
- Reorder question.
- Reorder option.
- Set correct answer.
- Text editing.
- Media placement dan penghapusan referensinya.

Untuk MVP, history undo/redo boleh dibatasi pada sesi editor aktif.

Pemulihan draft setelah browser dibuka ulang harus tetap tersedia, meskipun riwayat Undo tidak selalu ikut dipulihkan.

---

# 12. Data Model

## 12.1. Import Session

Mewakili satu proses bulk import.

Field konseptual:

    id
    school_id
    created_by
    title
    status
    current_step
    source_document
    revision
    created_at
    updated_at

`source_document` menyimpan representasi konten awal atau referensinya untuk kebutuhan recovery.

## 12.2. Question Draft

    id
    import_session_id
    order_index
    question_type
    content
    options
    correct_option_ids
    model_answer
    points
    media_references
    validation_status
    created_at
    updated_at

Gunakan UUID untuk identitas.

`content` sebaiknya berupa rich-text JSON yang kompatibel dengan editor, bukan string HTML semata.

## 12.3. Answer Option

    id
    question_draft_id
    order_index
    content
    media_references

Answer option menggunakan ID stabil.

Jangan menjadikan huruf A/B/C/D sebagai primary identity.

## 12.4. Question Bank Entities

Setelah draft disimpan:

    question_banks
    questions
    question_versions
    question_options
    question_answer_keys
    question_assets

Detail normalisasi tabel dapat disesuaikan.

Prinsip pentingnya adalah membedakan draft impor dari pertanyaan final dan membedakan konten yang boleh dibaca siswa dari kunci jawaban yang bersifat rahasia.

---

# 13. Arsitektur Modular

Struktur yang disarankan:

    apps/
      web/
        src/
          features/
            question-authoring/
            question-import/
            question-bank/

    packages/
      question-schema/
      import-parser/
      import-transform/
      exam-client/

    supabase/
      migrations/
      functions/
      tests/

## 13.1. import-parser

Berisi fungsi murni seperti:

    detectQuestionBoundaries()
    detectAnswerOptions()
    parseDelimiter()
    normalizeOptionLabel()

Tidak boleh bergantung pada UI.

## 13.2. import-transform

Berisi operasi transformasi data:

    splitQuestion()
    mergeQuestions()
    extractOption()
    extractMultipleOptions()
    returnOptionToQuestion()
    reorderQuestions()
    reorderOptions()

Transformasi harus mempertahankan konten serta identitas aset.

Implementasi editor perlu menjaga posisi selection, mapping posisi dokumen, dan metadata sumber secara konsisten.

## 13.3. question-schema

Berisi definisi bentuk data, validasi, dan tipe domain.

Gunakan TypeScript/Zod untuk sisi web.

Kontrak backend harus tetap independen agar nanti dapat digunakan oleh klien Flutter, misalnya melalui OpenAPI dan Dart client generation.

## 13.4. Backend

Supabase bertanggung jawab atas:

- Penyimpanan draft.
- Penyimpanan soal.
- Storage gambar.
- Ownership.
- Multi-tenant isolation.
- Authorization.
- Transaksi save.
- Question versioning.

Gunakan RLS dan validasi server.

Frontend tidak boleh menentukan sendiri bahwa pengguna berhak mengubah soal sekolah lain.

---

# 14. UX Requirements

## 14.1. Desktop First, Responsive

Bulk import dioptimalkan untuk desktop karena proses pengeditan dokumen panjang membutuhkan ruang yang cukup.

Namun, fitur utama harus tetap dapat digunakan pada tablet dan HP.

Hindari operasi yang hanya dapat dilakukan melalui hover atau drag.

## 14.2. Keyboard Efficiency

Shortcut yang disarankan:

    Ctrl/Cmd + Z       Undo
    Ctrl/Cmd + Shift+Z Redo
    Ctrl/Cmd + Enter   Split at cursor
    Esc                Close contextual action

Shortcut lain dapat ditambahkan setelah pengujian pengguna.

## 14.3. Focus Preservation

Setelah melakukan operasi ekstraksi, split, atau merge, fokus editor harus berpindah secara masuk akal.

Guru tidak boleh harus mengklik ulang editor setiap kali selesai melakukan satu operasi.

## 14.4. Visual Feedback

Gunakan animasi singkat ketika sebuah blok terpisah atau konten dipindahkan menjadi jawaban.

Namun, animasi harus ringan dan tidak memperlambat pekerjaan guru yang sedang memproses puluhan soal.

## 14.5. Empty States

Sediakan instruksi pendek dan contoh interaktif.

Jangan menampilkan dokumentasi teknis panjang ketika guru pertama kali membuka fitur.

---

# 15. Security & Data Integrity

- Sanitasi HTML hasil paste.
- Batasi ukuran dokumen dan gambar.
- Validasi tipe file berdasarkan konten, bukan hanya ekstensi.
- Gunakan storage privat atau akses yang sesuai dengan kebijakan sekolah.
- Terapkan RLS berdasarkan sekolah dan hak akses.
- Kunci jawaban tidak boleh tersedia melalui endpoint pengerjaan siswa.
- Operasi bulk save harus idempoten.
- Log perubahan penting yang melibatkan soal final.
- Jangan menjalankan script, macro, atau konten aktif dari dokumen yang ditempelkan.
- Terapkan retention/cleanup policy untuk draft dan media yang tidak digunakan.

---

# 16. Testing & Acceptance Criteria

## 16.1. Split

- Paste 50 soal menjadi satu draft.
- Pisahkan menggunakan delimiter.
- Pisahkan menggunakan kursor.
- Gabungkan dua draft.
- Undo operasi tersebut.
- Seluruh karakter dan aset yang relevan tetap dapat dipulihkan.

## 16.2. Option Extraction

- Seleksi satu baris menjadi pilihan.
- Seleksi empat baris menjadi empat pilihan.
- Reorder pilihan.
- Tentukan kunci.
- Kembalikan pilihan menjadi teks pertanyaan.
- Kunci tidak berubah secara salah ketika urutan pilihan berubah.

## 16.3. Media

- Upload gambar ke pertanyaan.
- Upload gambar ke pilihan jawaban.
- Paste gambar dari clipboard yang kompatibel.
- Ganti gambar.
- Undo penempatan gambar.
- Simulasikan upload gagal.
- Tidak ada referensi aset yang rusak.

## 16.4. Persistence

- Buat draft dan tutup halaman.
- Buka kembali draft.
- Simulasikan koneksi terputus.
- Lakukan beberapa perubahan.
- Pulihkan koneksi.
- Pastikan perubahan tidak hilang atau tertimpa request lama.

## 16.5. Validation

- Soal single choice tanpa kunci ditandai.
- Soal kosong ditandai.
- Soal esai tidak diwajibkan mempunyai pilihan jawaban.
- Draft tidak lengkap dapat disimpan.
- Soal tidak valid tidak dapat dipublikasikan untuk penggunaan yang mensyaratkan validitas tersebut.

## 16.6. Pengujian dengan Guru

Lakukan pengujian menggunakan dokumen nyata dari beberapa guru dengan format berbeda.

Ukur:

- Waktu mengimpor 20–50 soal.
- Jumlah tindakan manual.
- Jumlah kesalahan struktur.
- Jumlah koreksi yang dibutuhkan.
- Kegagalan penyimpanan.
- Kemudahan menemukan dan memperbaiki kesalahan.

Kriteria keberhasilan utama bukan jumlah fitur, melainkan apakah guru benar-benar dapat menyelesaikan pekerjaan lebih cepat dan lebih sedikit melakukan copy-paste dibandingkan alur sebelumnya.

---

# 17. Urutan Pengembangan

## Milestone 1 — Core Text Structuring

Implementasikan:

- Bulk paste.
- Rich text editor.
- Question cards.
- Split at cursor.
- Delimiter split.
- Merge questions.
- Undo/redo.

Output: dokumen panjang dapat diubah menjadi kumpulan question drafts.

## Milestone 2 — Option Structuring

Implementasikan:

- Extract selected option.
- Extract multiple options.
- Reordering.
- Return to question.
- Correct answer selection.
- Question types dasar.

Output: kumpulan soal pilihan ganda dan esai dapat disusun tanpa mengetik ulang.

## Milestone 3 — Media

Implementasikan:

- Drag/drop images.
- Clipboard image support.
- Storage upload.
- Media references.
- Media preview.
- Media recovery.

Output: soal dan pilihan dapat berisi gambar.

## Milestone 4 — Persistence & Validation

Implementasikan:

- Autosave.
- Resume draft.
- Server-side validation.
- Review.
- Save to question bank.
- Error handling.

Output: alur impor berfungsi secara end-to-end.

## Milestone 5 — Quality of Life

Implementasikan:

- Auto-detect question numbers.
- Suggested splitting.
- Suggested answer extraction.
- Batch editing.
- Keyboard shortcuts lanjutan.
- UX refinement berdasarkan pengujian guru.

Output: pekerjaan manual berkurang tanpa meningkatkan kompleksitas pengguna secara berlebihan.

---

# 18. Definition of Done

Fitur Bulk Question Import dinyatakan siap untuk MVP apabila:

1. Guru dapat menempelkan kumpulan soal secara utuh.
2. Guru dapat memisahkan soal tanpa menyalin ulang satu per satu.
3. Guru dapat mengekstraksi pilihan jawaban melalui seleksi teks.
4. Guru dapat menetapkan kunci jawaban dan bobot nilai.
5. Guru dapat menambahkan gambar ke pertanyaan maupun pilihan.
6. Guru dapat memperbaiki pemisahan yang salah melalui merge atau undo.
7. Seluruh proses dapat disimpan sebagai draft dan dilanjutkan.
8. Hasil akhir dapat divalidasi dan disimpan ke bank soal.
9. Tidak ada kebutuhan menggunakan AI atau API berbayar.
10. Tidak terjadi kehilangan konten secara diam-diam ketika melakukan transformasi.

**Prinsip penutup:** Guru harus merasa sedang merapikan dokumen yang sudah mereka miliki, bukan sedang mengetik ulang seluruh soal ke dalam aplikasi baru.
