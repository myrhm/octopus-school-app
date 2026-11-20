import { getSchema } from '@tiptap/core';
import { loadDraft } from '../question-import/draft-store';
import { validateDocument } from '../question-import/document';
import { questionExtensions } from '../question-import/extensions';
import { toStudentQuestions } from './contract';
import { exampleQuestions } from './fixture';

export async function loadPreview(id: string) {
  if (id === 'contoh')
    return { title: 'Lingkungan di sekitar kita', questions: exampleQuestions, example: true };
  const draft = await loadDraft(id);
  if (!draft) return undefined;
  if (draft.formatVersion !== 1) throw new Error('Unsupported draft version');
  // This adapter handles the existing text-only draft format. Extraction owns the
  // new storage adapter; do not silently drop options from a newer document.
  const nodes = draft.document.content;
  if (
    !nodes ||
    nodes.some((node) => node.attrs?.options !== undefined || node.options !== undefined)
  )
    throw new Error('Unsupported draft structure');
  validateDocument(getSchema(questionExtensions()), draft.document);
  return {
    title: draft.title,
    example: false,
    questions: toStudentQuestions(
      nodes.map((node) => ({
        id: node.attrs?.id as string,
        content: node.content ?? [],
        options: [],
        correctOptionId: null,
      })),
    ),
  };
}
