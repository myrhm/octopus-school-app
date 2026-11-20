import { Node as ExtensionNode, mergeAttributes } from '@tiptap/core';
import type { Node, Schema } from '@tiptap/pm/model';
import { Fragment, Slice } from '@tiptap/pm/model';
import { canSplit } from '@tiptap/pm/transform';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { questionMetadataPlugin } from './option-model';
import { readOptions } from './question-contract';

export const QuestionDocument = ExtensionNode.create({
  name: 'doc',
  topNode: true,
  content: 'question+',
});
export const QuestionBlock = ExtensionNode.create({
  name: 'question',
  group: 'block',
  content: 'block+',
  defining: true,
  addProseMirrorPlugins() {
    return [questionMetadataPlugin()];
  },
  addAttributes() {
    return {
      id: { default: null },
      options: { default: [] },
      correctOptionId: { default: null },
      optionSources: { default: {} },
      keyConflictIds: { default: [] },
    };
  },
  parseHTML() {
    return [{ tag: 'section[data-question-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'section',
      mergeAttributes({ class: 'question-card', 'data-question-id': HTMLAttributes.id ?? '' }),
      ['div', { class: 'question-content' }, 0],
    ];
  },
});

export function emptyDocument() {
  return {
    type: 'doc',
    content: [
      { type: 'question', attrs: { id: crypto.randomUUID() }, content: [{ type: 'paragraph' }] },
    ],
  };
}

export function questionAt(state: EditorState) {
  const { $from } = state.selection;
  if ($from.depth < 1 || $from.node(1).type.name !== 'question') return null;
  return { node: $from.node(1), start: $from.before(1), index: $from.index(0) };
}

type Operation = { transaction: Transaction } | { error: string };

function questionWithContent(question: Node, content: Fragment, id: string): Node {
  return question.type.create(
    { ...question.attrs, id },
    content.size ? content : question.type.schema.nodes.paragraph!.create(),
  );
}

function delimiterLines(block: Node): Array<{ start: number; end: number }> {
  if (block.type.name !== 'paragraph') return [];
  const lines: Array<{ start: number; end: number }> = [];
  let start = 0;
  const consider = (end: number) => {
    const line = block.content.cut(start, end);
    if (line.textBetween(0, line.size).trim() === '%%%') lines.push({ start, end });
  };
  block.forEach((node, offset) => {
    if (node.type.name === 'hardBreak') {
      consider(offset);
      start = offset + node.nodeSize;
    }
  });
  consider(block.content.size);
  return lines;
}

export function cursorOnDelimiter(state: EditorState): boolean {
  const { $from, empty } = state.selection;
  return (
    empty &&
    $from.depth === 2 &&
    delimiterLines($from.parent).some(
      (line) => line.start <= $from.parentOffset && line.end >= $from.parentOffset,
    )
  );
}

function splitAtDelimiter(
  state: EditorState,
  active: NonNullable<ReturnType<typeof questionAt>>,
  offset: number,
  marker: Node,
  line: { start: number; end: number },
): Operation {
  let beforeContent = active.node.content.cut(0, offset);
  const prefix = marker.content.cut(0, Math.max(0, line.start - 1));
  if (prefix.size) beforeContent = beforeContent.append(Fragment.from(marker.copy(prefix)));
  let afterContent = active.node.content.cut(offset + marker.nodeSize);
  const suffix = marker.content.cut(Math.min(marker.content.size, line.end + 1));
  if (suffix.size) afterContent = Fragment.from(marker.copy(suffix)).append(afterContent);
  const before = questionWithContent(active.node, beforeContent, active.node.attrs.id as string);
  const after = questionWithContent(active.node, afterContent, crypto.randomUUID());
  const tr = closeHistory(state.tr).replaceWith(active.start, active.start + active.node.nodeSize, [
    before,
    after,
  ]);
  tr.setSelection(TextSelection.near(tr.doc.resolve(active.start + before.nodeSize + 1)));
  return { transaction: tr.scrollIntoView() };
}

export function addQuestion(state: EditorState): Transaction {
  const active = questionAt(state);
  const position = active ? active.start + active.node.nodeSize : state.doc.content.size;
  const node = state.schema.nodes.question!.create(
    { id: crypto.randomUUID() },
    state.schema.nodes.paragraph!.create(),
  );
  const tr = closeHistory(state.tr).insert(position, node);
  tr.setSelection(TextSelection.near(tr.doc.resolve(position + 1)));
  return tr.scrollIntoView();
}

export function splitAtCursor(state: EditorState): Operation {
  const active = questionAt(state);
  const { $from, empty, from } = state.selection;
  if (!active || !empty)
    return { error: 'Letakkan kursor pada titik pemisahan tanpa menyeleksi teks.' };
  if ($from.depth !== 2 || !['paragraph', 'heading'].includes($from.parent.type.name)) {
    return {
      error:
        'Pisahkan pada paragraf biasa. Untuk daftar, pindahkan bagian soal ke paragraf terlebih dahulu.',
    };
  }
  const markerLine = delimiterLines($from.parent).find(
    (line) => line.start <= $from.parentOffset && line.end >= $from.parentOffset,
  );
  if (markerLine) {
    return splitAtDelimiter(
      state,
      active,
      $from.before(2) - active.start - 1,
      $from.parent,
      markerLine,
    );
  }
  const questionType = state.schema.nodes.question!;
  const types = [
    { type: questionType, attrs: { id: crypto.randomUUID() } },
    { type: $from.parent.type, attrs: $from.parent.attrs },
  ];
  if (!canSplit(state.doc, from, 2, types))
    return { error: 'Bagian ini belum dapat dipisahkan dengan aman.' };
  const tr = closeHistory(state.tr).split(from, 2, types);
  tr.setSelection(TextSelection.near(tr.doc.resolve(tr.mapping.map(from, 1))));
  return { transaction: tr.scrollIntoView() };
}

// Treat an explicitly typed delimiter as an editor action, not a parser heuristic.
// Undo/redo and loading a saved document do not call this input handler.
export function delimiterTextInput(
  state: EditorState,
  from: number,
  to: number,
  text: string,
): Transaction | null {
  if (!text.includes('%')) return null;
  const tr = closeHistory(state.tr).insertText(text, from, to);
  const next = state.apply(tr);
  if (!cursorOnDelimiter(next)) return null;
  const result = splitAtCursor(next);
  if ('error' in result) return null;
  for (const step of result.transaction.steps) tr.step(step);
  tr.setSelection(TextSelection.create(tr.doc, result.transaction.selection.from));
  return tr.scrollIntoView();
}

export function mergeQuestion(state: EditorState, direction: 'previous' | 'next'): Operation {
  const active = questionAt(state);
  if (!active) return { error: 'Klik soal yang ingin digabung.' };
  const firstIndex = direction === 'previous' ? active.index - 1 : active.index;
  if (firstIndex < 0 || firstIndex + 1 >= state.doc.childCount)
    return { error: 'Tidak ada soal di arah tersebut.' };
  const first = state.doc.child(firstIndex);
  const second = state.doc.child(firstIndex + 1);
  let start = 0;
  for (let index = 0; index < firstIndex; index++) start += state.doc.child(index).nodeSize;
  const keys = [
    ...new Set(
      [
        first.attrs.correctOptionId,
        second.attrs.correctOptionId,
        ...(first.attrs.keyConflictIds as string[]),
        ...(second.attrs.keyConflictIds as string[]),
      ].filter((id): id is string => typeof id === 'string'),
    ),
  ];
  const merged = first.type.create(
    {
      ...first.attrs,
      options: [...readOptions(first.attrs.options), ...readOptions(second.attrs.options)],
      optionSources: { ...first.attrs.optionSources, ...second.attrs.optionSources },
      correctOptionId: keys.length === 1 ? keys[0]! : null,
      keyConflictIds: keys.length > 1 ? keys : [],
    },
    first.content.append(second.content),
  );
  const tr = closeHistory(state.tr).replaceWith(
    start,
    start + first.nodeSize + second.nodeSize,
    merged,
  );
  tr.setSelection(TextSelection.near(tr.doc.resolve(start + first.nodeSize - 1)));
  return { transaction: tr.scrollIntoView() };
}

export function splitDelimiters(state: EditorState): Operation {
  const questions: Node[] = [];
  let found = false;
  state.doc.forEach((question) => {
    let blocks: Node[] = [];
    let first = true;
    const finish = () => {
      const content = Fragment.fromArray(blocks);
      questions.push(
        questionWithContent(
          question,
          content,
          first ? (question.attrs.id as string) : crypto.randomUUID(),
        ),
      );
      first = false;
      blocks = [];
    };
    question.forEach((block) => {
      const lines = delimiterLines(block);
      if (!lines.length) {
        blocks.push(block);
        return;
      }
      let start = 0;
      for (const line of lines) {
        const prefix = block.content.cut(start, Math.max(start, line.start - 1));
        if (prefix.size) blocks.push(block.copy(prefix));
        found = true;
        finish();
        start = Math.min(block.content.size, line.end + 1);
      }
      const suffix = block.content.cut(start);
      if (suffix.size) blocks.push(block.copy(suffix));
    });
    finish();
  });
  if (!found)
    return { error: 'Belum ada delimiter. Tulis %%% pada baris tersendiri di antara soal.' };
  const tr = closeHistory(state.tr).replaceWith(0, state.doc.content.size, questions);
  // Place the cursor in the last resulting question, including a new empty draft.
  const last = tr.doc.lastChild!;
  tr.setSelection(TextSelection.near(tr.doc.resolve(tr.doc.content.size - last.nodeSize + 1)));
  return { transaction: tr.scrollIntoView() };
}

export function validateDocument(schema: Schema, value: unknown): Node {
  const doc = schema.nodeFromJSON(value);
  doc.check();
  if (doc.type.name !== 'doc') throw new Error('Invalid document');
  const optionIds = new Set<string>();
  doc.forEach((question) => {
    if (!Array.isArray(question.attrs.options)) throw new Error('Invalid options');
    const options = readOptions(question.attrs.options);
    for (const option of options) {
      if (
        !option ||
        typeof option.id !== 'string' ||
        !option.id ||
        optionIds.has(option.id) ||
        !Array.isArray(option.content) ||
        !option.content.length
      )
        throw new Error('Invalid option');
      optionIds.add(option.id);
      for (const value of option.content) {
        const block = schema.nodeFromJSON(value);
        block.check();
        if (!block.isBlock || block.type.name === 'question')
          throw new Error('Invalid option block');
        block.descendants((node) => {
          if (node.type.name === 'optionAnchor') throw new Error('Invalid option anchor');
        });
      }
      if (question.attrs.optionSources[option.id])
        Slice.fromJSON(schema, question.attrs.optionSources[option.id]);
    }
    if (
      question.attrs.correctOptionId !== null &&
      !options.some((option) => option.id === question.attrs.correctOptionId)
    )
      throw new Error('Invalid answer key');
    if (
      !Array.isArray(question.attrs.keyConflictIds) ||
      question.attrs.keyConflictIds.some(
        (id: unknown) => !options.some((option) => option.id === id),
      )
    )
      throw new Error('Invalid key conflict');
  });
  return doc;
}
