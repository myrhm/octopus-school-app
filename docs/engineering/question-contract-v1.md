# Kontrak konten soal v1

Kontrak bersama akun 1 (ekstraksi opsi) dan akun 2 (preview siswa):

```ts
interface QuestionV1 {
  id: string;
  content: RichTextBlock[];
  options: { id: string; content: RichTextBlock[] }[];
  correctOptionId: string | null;
}
type StudentQuestionV1 = Omit<QuestionV1, 'correctOptionId'>;
```

`RichTextBlock` adalah blok JSON Tiptap/ProseMirror, misalnya paragraph, heading, bulletList, atau orderedList beserta text/marks di dalamnya. Content adalah array blok, bukan HTML atau wrapper `doc`. Urutan opsi mengikuti array options; label A/B/C dihasilkan dari posisi, bukan disimpan dalam konten atau menjadi identitas. ID soal dan opsi tetap stabil saat reorder.

Preview hanya menerima StudentQuestionV1. Jangan mengirim correctOptionId lalu menyembunyikannya di UI. Adapter `toStudentQuestions` pada `apps/web/src/features/question-import/question-contract.ts` membuat salinan dengan allowlist dan menghilangkan anchor serta metadata editor. Preview dapat memakai fixture terlebih dahulu tanpa bergantung pada komponen editor.

Fixture siap pakai: [student-question-v1.json](../../contracts/fixtures/student-question-v1.json). Definisi type dan adapter berdiri sendiri; akun 2 tidak perlu mengimpor QuestionWorkspace atau AnswerOptionsPanel.

Draft lokal tetap berupa dokumen editor. Setiap node question menyimpan options dan correctOptionId sebagai attrs; content berisi badan soal. Attrs tambahan untuk recovery dan konflik merge merupakan data internal, bukan bagian kontrak publik. Draft lama tanpa options/correctOptionId dibaca sebagai array kosong dan null.

Contoh fixture siswa:

```json
{
  "id": "question-1",
  "content": [
    { "type": "paragraph", "content": [{ "type": "text", "text": "Berapa hasil 12 × 3?" }] }
  ],
  "options": [
    {
      "id": "option-24",
      "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "24" }] }]
    },
    {
      "id": "option-36",
      "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "36" }] }]
    }
  ]
}
```

Fixture guru memiliki field tambahan `correctOptionId: "option-36"`. Tidak ada kunci di fixture siswa di atas. Kontrak v1 berfokus pada satu jawaban benar; multi-answer dan media di luar tahap ini.

## Versi penyimpanan editor

Record editor lokal kini memakai `formatVersion: 2`; kontrak publik pada dokumen ini tetap v1. Editor menerima record v1 untuk migrasi di memori dan menyimpannya sebagai v2 pada edit berikutnya. Adapter preview perlu menerima record v1/v2 serta memakai proyeksi kanonis tanpa kunci, anchor, dan metadata recovery. Guard v1 saja pada PR #3 perlu disesuaikan saat integrasi; perbaikan PR #4 tidak mengubah kode preview akun 2.
