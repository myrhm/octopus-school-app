import { fireEvent, render, screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import StudentPreview from './StudentPreview';
import { toStudentQuestions } from './contract';
import type { PreviewSourceQuestion } from './contract';
import { exampleQuestions } from './fixture';

function source(): PreviewSourceQuestion[] {
  return [
    {
      id: 'q1',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '<script>plain text</script>',
              marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }],
            },
          ],
        },
      ],
      options: [
        {
          id: 'stable-b',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B first' }] }],
        },
        {
          id: 'stable-a',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A second' }] }],
        },
      ],
      correctOptionId: 'stable-a',
    },
  ];
}

describe('student preview boundary', () => {
  it('copies display data in array order, omits answer keys and does not share mutable content', () => {
    const original = source();
    const before = JSON.stringify(original);
    const result = toStudentQuestions(original);
    expect(result[0]?.options.map((option) => option.id)).toEqual(['stable-b', 'stable-a']);
    expect(JSON.stringify(result)).not.toContain('correctOptionId');
    expect(result[0]?.content).toEqual(original[0]?.content);
    expect(result[0]?.content).not.toBe(original[0]?.content);
    render(() => <StudentPreview title="Test" questions={result} />);
    fireEvent.click(screen.getAllByRole('radio')[1]!);
    expect((screen.getAllByRole('radio')[1] as HTMLInputElement).checked).toBe(true);
    expect(JSON.stringify(original)).toBe(before);
    expect(document.querySelector('script')).toBeNull();
    for (const mark of ['bold', 'italic', 'underline'])
      expect(screen.getByText('<script>plain text</script>').className).toContain(
        `preview-${mark}`,
      );
  });

  it('rejects duplicate IDs and dangling keys rather than connecting answers to the wrong choice', () => {
    const data = source();
    expect(() => toStudentQuestions([...data, ...data])).toThrow('Invalid question ID');
    data[0]!.options[1]!.id = 'stable-b';
    expect(() => toStudentQuestions(data)).toThrow('Invalid option ID');
    data[0]!.options[1]!.id = 'stable-a';
    data[0]!.correctOptionId = 'deleted';
    expect(() => toStudentQuestions(data)).toThrow('Invalid answer key');
  });

  it('strips arbitrary attributes and rejects unsupported media', () => {
    const data = source();
    data[0]!.content[0]!.attrs = { correctOptionId: 'secret', onclick: 'alert(1)' };
    expect(JSON.stringify(toStudentQuestions(data))).not.toContain('secret');
    expect(JSON.stringify(toStudentQuestions(data))).not.toContain('onclick');
    data[0]!.content = [{ type: 'image', attrs: { src: 'https://example.com/tracker' } }];
    expect(() => toStudentQuestions(data)).toThrow('Unsupported content');
  });

  it('keeps independent temporary answers across navigation and clears a choice', () => {
    render(() => <StudentPreview title="Contoh" questions={exampleQuestions} />);
    fireEvent.click(screen.getAllByRole('radio')[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    expect(document.activeElement?.textContent).toBe('Soal 2 dari 3');
    expect(
      screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true);
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    expect((screen.getAllByRole('radio')[1] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus pilihan' }));
    expect(
      screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true);
    expect(screen.getByText('1 dari 3 soal sudah dipilih')).toBeTruthy();
  });

  it('handles no questions and blank unfinished content without invented choices', () => {
    const view = render(() => <StudentPreview title="Kosong" questions={[]} />);
    expect(screen.getByText('Belum ada soal')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    view.unmount();
    render(() => (
      <StudentPreview
        title="Draft"
        questions={[{ id: 'empty', content: [{ type: 'paragraph' }], options: [] }]}
      />
    ));
    expect(screen.getByText('Isi soal belum ditambahkan.')).toBeTruthy();
    expect(screen.getByText('Pilihan jawaban belum ditambahkan.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Berikutnya' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
