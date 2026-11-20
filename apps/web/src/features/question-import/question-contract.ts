import type { JSONContent } from '@tiptap/core';

/** Contract v1 agreed with the independent student-preview work. */
export interface QuestionOptionV1 {
  id: string;
  content: JSONContent[];
}
export interface QuestionV1 {
  id: string;
  content: JSONContent[];
  options: QuestionOptionV1[];
  correctOptionId: string | null;
}
export type StudentQuestionV1 = Omit<QuestionV1, 'correctOptionId'>;

export function readOptions(value: unknown): QuestionOptionV1[] {
  return Array.isArray(value) ? (value as QuestionOptionV1[]) : [];
}

function publicBlocks(blocks: JSONContent[]): JSONContent[] {
  return blocks
    .filter((block) => block.type !== 'optionAnchor')
    .map((block) => {
      const copy = structuredClone(block);
      if (copy.content) copy.content = publicBlocks(copy.content);
      return copy;
    });
}

/** Allowlist output: keys, recovery slices, and editor attributes never reach preview. */
export function toStudentQuestions(document: JSONContent): StudentQuestionV1[] {
  return (document.content ?? [])
    .filter((node) => node.type === 'question')
    .map((node) => ({
      id: node.attrs?.id as string,
      content: publicBlocks(node.content ?? []),
      options: readOptions(node.attrs?.options).map((option) => ({
        id: option.id,
        content: publicBlocks(option.content),
      })),
    }));
}
