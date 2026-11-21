import { Node } from '@tiptap/core';
import { call } from '../../backend/client';
import { mediaUrl } from '../../backend/media';
import StarterKit from '@tiptap/starter-kit';
import { QuestionBlock, QuestionDocument } from './document';
import { OptionAnchor } from './answer-options';

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
