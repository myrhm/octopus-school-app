import StarterKit from '@tiptap/starter-kit';
import { QuestionBlock, QuestionDocument } from './document';

export function questionExtensions() {
  return [
    StarterKit.configure({
      document: false,
      link: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      trailingNode: false,
      heading: { levels: [2, 3] },
    }),
    QuestionDocument,
    QuestionBlock,
  ];
}
