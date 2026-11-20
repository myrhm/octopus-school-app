import { getSchema } from '@tiptap/core';
import { loadDraft } from '../question-import/draft-store';
import { validateDocument } from '../question-import/document';
import { questionExtensions } from '../question-import/extensions';
import { toStudentQuestions } from '../question-import/question-contract';
import { copyStudentQuestions } from './contract';
import { exampleQuestions } from './fixture';

export async function loadPreview(id: string) {
  if (id === 'contoh')
    return { title: 'Lingkungan di sekitar kita', questions: exampleQuestions, example: true };
  const draft = await loadDraft(id);
  if (!draft) return undefined;
  if (draft.formatVersion !== 1) throw new Error('Unsupported draft version');
  // Normalize legacy defaults and validate editor data before dropping private fields.
  // Keep this version guard until the extraction branch supplies its storage migration.
  const document = validateDocument(getSchema(questionExtensions()), draft.document);
  return {
    title: draft.title,
    example: false,
    questions: copyStudentQuestions(toStudentQuestions(document.toJSON())),
  };
}
