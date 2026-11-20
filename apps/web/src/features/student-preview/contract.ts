import type { JSONContent } from '@tiptap/core';
import type { QuestionOptionV1, QuestionV1 } from '../question-import/question-contract';

// Shared boundary with answer extraction; persistence is owned by the editor.
export type QuestionOption = QuestionOptionV1;
export type PreviewSourceQuestion = QuestionV1;

export interface StudentQuestion {
  readonly id: string;
  readonly content: readonly JSONContent[];
  readonly options: readonly Readonly<QuestionOption>[];
}

const blocks = new Set([
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
]);
const marks = new Set(['bold', 'italic', 'underline', 'strike']);

// Copy only supported display fields. Never forward arbitrary attributes or HTML.
export function copyRichText(content: readonly JSONContent[]): JSONContent[] {
  return content.map((node) => {
    if (node.type === 'text' && typeof node.text === 'string') {
      if (node.marks?.some((mark) => !marks.has(mark.type))) throw new Error('Unsupported mark');
      return {
        type: 'text',
        text: node.text,
        ...(node.marks ? { marks: node.marks.map(({ type }) => ({ type })) } : {}),
      };
    }
    if (node.type === 'hardBreak') return { type: 'hardBreak' };
    if (!node.type || !blocks.has(node.type)) throw new Error('Unsupported content');
    return {
      type: node.type,
      ...(node.type === 'heading' ? { attrs: { level: node.attrs?.level === 3 ? 3 : 2 } } : {}),
      ...(node.type === 'orderedList'
        ? { attrs: { start: Number.isSafeInteger(node.attrs?.start) ? node.attrs?.start : 1 } }
        : {}),
      content: copyRichText(node.content ?? []),
    };
  });
}

export function toStudentQuestions(source: readonly PreviewSourceQuestion[]): StudentQuestion[] {
  const questions = copyStudentQuestions(source);
  for (const question of source) {
    if (
      question.correctOptionId !== null &&
      !question.options.some((option) => option.id === question.correctOptionId)
    )
      throw new Error('Invalid answer key');
  }
  return questions;
}

// Validate and sanitize the canonical student projection without reintroducing a key.
export function copyStudentQuestions(source: readonly StudentQuestion[]): StudentQuestion[] {
  const questionIds = new Set<string>();
  return source.map((question) => {
    if (typeof question.id !== 'string' || !question.id || questionIds.has(question.id))
      throw new Error('Invalid question ID');
    questionIds.add(question.id);
    const optionIds = new Set<string>();
    const options = question.options.map((option) => {
      if (typeof option.id !== 'string' || !option.id || optionIds.has(option.id))
        throw new Error('Invalid option ID');
      optionIds.add(option.id);
      return { id: option.id, content: copyRichText(option.content) };
    });
    return { id: question.id, content: copyRichText(question.content), options };
  });
}

export function hasText(content: readonly JSONContent[]): boolean {
  return content.some((node) => Boolean(node.text?.trim()) || hasText(node.content ?? []));
}
