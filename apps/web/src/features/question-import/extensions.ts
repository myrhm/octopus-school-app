import { Node } from '@tiptap/core';
import { call } from '../../backend/client';
import { mediaUrl } from '../../backend/media';
import StarterKit from '@tiptap/starter-kit';
import { QuestionBlock, QuestionDocument } from './document';
import { OptionAnchor } from './answer-options';

export function questionExtensions(
  renderOptions?: (host: HTMLElement, questionId: string) => () => void,
) {
  const questionBlock = renderOptions
    ? QuestionBlock.extend({
        addNodeView() {
          return ({ node }) => {
            const dom = document.createElement('section');
            dom.className = 'question-card';
            const contentDOM = document.createElement('div');
            contentDOM.className = 'question-content';
            const optionsHost = document.createElement('div');
            optionsHost.className = 'question-answers-host';
            optionsHost.contentEditable = 'false';
            dom.append(contentDOM, optionsHost);
            let questionId = String(node.attrs.id ?? '');
            dom.dataset.questionId = questionId;
            let dispose = questionId ? renderOptions(optionsHost, questionId) : undefined;
            return {
              dom,
              contentDOM,
              update(next) {
                if (next.type !== node.type) return false;
                const nextId = String(next.attrs.id ?? '');
                if (nextId !== questionId) {
                  dispose?.();
                  questionId = nextId;
                  dom.dataset.questionId = questionId;
                  dispose = questionId ? renderOptions(optionsHost, questionId) : undefined;
                }
                return true;
              },
              stopEvent: (event) =>
                event.target instanceof globalThis.Node && optionsHost.contains(event.target),
              ignoreMutation: (mutation) =>
                mutation.type !== 'selection' && !contentDOM.contains(mutation.target),
              destroy: () => dispose?.(),
            };
          };
        },
      })
    : QuestionBlock;
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
    questionBlock,
    OptionAnchor,
    Node.create({
      name: 'schoolImage',
      inline: true,
      group: 'inline',
      atom: true,
      draggable: true,
      addAttributes() {
        return { fileId: { default: '' }, alt: { default: '' }, width: { default: 320 } };
      },
      addNodeView() {
        return ({ node }) => {
          const img = document.createElement('img');
          img.alt = node.attrs.alt;
          img.width = node.attrs.width;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          void call<string>('teacher_media', { fileId: node.attrs.fileId })
            .then((src) => {
              img.src = src;
            })
            .catch(() => {
              img.title = 'Gambar belum dapat dimuat.';
            });
          return { dom: img };
        };
      },
      renderHTML({ node }) {
        return [
          'img',
          {
            src: mediaUrl(node.attrs.fileId),
            alt: node.attrs.alt,
            width: node.attrs.width,
            style: 'max-width:100%;height:auto',
          },
        ];
      },
    }),
  ];
}
