import type { PreviewSourceQuestion } from './contract';
import { toStudentQuestions } from './contract';

const paragraph = (text: string) => [{ type: 'paragraph', content: [{ type: 'text', text }] }];

const source: PreviewSourceQuestion[] = [
  {
    id: 'example-ecosystem',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Perhatikan rantai makanan berikut.', marks: [{ type: 'bold' }] },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Rumput → belalang → katak → ular', marks: [{ type: 'italic' }] },
        ],
      },
      ...paragraph(
        'Jika populasi katak menurun, perubahan apa yang paling mungkin terjadi dalam waktu dekat?',
      ),
    ],
    options: [
      {
        id: 'ecosystem-grass',
        content: paragraph('Populasi rumput meningkat karena lebih sedikit dimakan.'),
      },
      {
        id: 'ecosystem-insects',
        content: paragraph('Populasi belalang meningkat karena pemangsanya berkurang.'),
      },
      {
        id: 'ecosystem-snakes',
        content: paragraph('Populasi ular meningkat karena makanan bertambah.'),
      },
      { id: 'ecosystem-unchanged', content: paragraph('Semua populasi tetap sama.') },
    ],
    correctOptionId: 'ecosystem-insects',
  },
  {
    id: 'example-water',
    content: [
      ...paragraph('Sebuah kelompok mencatat cara menghemat air di sekolah:'),
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: paragraph('Menutup keran setelah digunakan.') },
          { type: 'listItem', content: paragraph('Menampung air hujan untuk menyiram tanaman.') },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Kesimpulan', marks: [{ type: 'underline' }] },
          { type: 'text', text: ' yang sesuai adalah…' },
        ],
      },
    ],
    options: [
      { id: 'water-waste', content: paragraph('Air sebaiknya dibiarkan mengalir sepanjang hari.') },
      {
        id: 'water-save',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Kebiasaan sederhana', marks: [{ type: 'bold' }] },
              { type: 'text', text: ' membantu menghemat air.' },
            ],
          },
        ],
      },
      { id: 'water-rain', content: paragraph('Air hujan tidak dapat dimanfaatkan untuk tanaman.') },
    ],
    correctOptionId: 'water-save',
  },
  {
    id: 'example-unfinished',
    content: paragraph('Mengapa keseimbangan lingkungan perlu dijaga?'),
    options: [],
    correctOptionId: null,
  },
];

export const exampleQuestions = toStudentQuestions(source);
