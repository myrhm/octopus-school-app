import { Node as ExtensionNode } from '@tiptap/core';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { Node } from '@tiptap/pm/model';
import { closeHistory } from '@tiptap/pm/history';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { questionAt } from './document';
import { readOptions } from './question-contract';
import type { QuestionOptionV1 } from './question-contract';

export const OptionAnchor = ExtensionNode.create({
  name: 'optionAnchor',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,
  addAttributes() {
    return { optionId: { default: null } };
  },
  // Source anchors are internal: pasted HTML must not create editor references.
  renderHTML({ node }) {
    return [
      'span',
      { class: 'option-anchor', 'data-option-id': node.attrs.optionId, 'aria-hidden': 'true' },
      '',
    ];
  },
});

type Result = { transaction: Transaction } | { error: string };
const labelPattern = /^\s*(?:\(([A-Za-z])\)|([A-Za-z])[.)])\s+/;

function stripLabel(content: Fragment): Fragment {
  const first = content.firstChild;
  if (!first?.isTextblock) return content;
  const match = first.textContent.match(labelPattern);
  if (!match) return content;
  return Fragment.from(first.copy(first.content.cut(match[0].length))).append(
    content.cut(first.nodeSize),
  );
}

function rangeContent(state: EditorState, from: number, to: number): Fragment {
  // Include ancestors up to the question, then remove only the question wrapper.
  // Open slices alone can contain listItem[] and lose orderedList/start context.
  const slice = state.doc.slice(from, to, true);
  const $from = state.doc.resolve(from);
  function contextualize(node: Node, depth: number): Node {
    if (depth > $from.depth || node.type !== $from.node(depth).type) return node;
    let content = node.content;
    if (node.firstChild && depth < $from.depth) {
      content = Fragment.from(contextualize(node.firstChild, depth + 1)).append(
        node.content.cut(node.firstChild.nodeSize),
      );
    }
    const attrs =
      node.type.name === 'orderedList'
        ? { ...node.attrs, start: (node.attrs.start as number) + $from.index(depth) }
        : node.attrs;
    return node.type.create(attrs, content, node.marks);
  }
  const wrapper = slice.content.firstChild;
  if (!wrapper || wrapper.type.name !== 'question')
    throw new Error('Selection is outside a question');
  return contextualize(wrapper, 1).content;
}

export function extractOptions(state: EditorState, multiple = false): Result {
  const { from, to, empty, $to } = state.selection;
  const active = questionAt(state);
  if (!active || empty || $to.depth < 1 || $to.node(1) !== active.node)
    return { error: 'Seleksi teks di dalam satu soal terlebih dahulu.' };
  let hasAnchor = false;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.type.name === 'optionAnchor') hasAnchor = true;
  });
  if (hasAnchor)
    return {
      error: 'Seleksi ini mencakup lokasi opsi yang sudah dipindahkan. Pilih hanya teks baru.',
    };
  if (!state.doc.textBetween(from, to).trim())
    return { error: 'Seleksi belum berisi teks jawaban.' };

  const starts: Array<{ position: number; label: string }> = [];
  if (multiple) {
    let unsupported = false;
    state.doc.nodesBetween(from, to, (node, position, parent) => {
      if (!node.isTextblock) return;
      if (parent?.type.name !== 'question') {
        unsupported = true;
        return false;
      }
      let lineStart = position + 1;
      const line = (end: number) => {
        const start = Math.max(lineStart, from);
        const finish = Math.min(end, to);
        if (finish <= start) return;
        const text = state.doc.textBetween(start, finish);
        const match = text.match(labelPattern);
        if (match) starts.push({ position: start, label: (match[1] ?? match[2])!.toUpperCase() });
        else if (!starts.length && text.trim()) unsupported = true;
      };
      node.forEach((child, offset) => {
        if (child.type.name === 'hardBreak') {
          line(position + 1 + offset);
          lineStart = position + 1 + offset + child.nodeSize;
        }
      });
      line(position + 1 + node.content.size);
      return false;
    });
    if (
      unsupported ||
      starts.length < 2 ||
      starts.some(
        (item, index) =>
          index > 0 && item.label.charCodeAt(0) !== starts[index - 1]!.label.charCodeAt(0) + 1,
      )
    )
      return {
        error:
          'Batas opsi ambigu. Seleksi label berurutan seperti A., B), (C), atau ekstrak satu per satu.',
      };
  } else starts.push({ position: from, label: '' });

  const options: QuestionOptionV1[] = [];
  const sources: Record<string, unknown> = { ...active.node.attrs.optionSources };
  const ranges = starts.map((start, index) => ({
    from: start.position,
    to: starts[index + 1]?.position ?? to,
    id: crypto.randomUUID(),
  }));
  for (const range of ranges) {
    const original = rangeContent(state, range.from, range.to);
    const content = stripLabel(original);
    if (!content.textBetween(0, content.size).trim())
      return { error: 'Ada opsi kosong. Lengkapi isi opsi sebelum mengekstraknya.' };
    options.push({ id: range.id, content: content.toJSON() as QuestionOptionV1['content'] });
    sources[range.id] = {
      ...state.doc.slice(range.from, range.to).toJSON(),
      fallbackContent: original.toJSON(),
    };
  }
  const tr = closeHistory(state.tr);
  for (const range of [...ranges].reverse())
    tr.replaceRangeWith(
      range.from,
      range.to,
      state.schema.nodes.optionAnchor!.create({ optionId: range.id }),
    );
  tr.setNodeMarkup(active.start, undefined, {
    ...active.node.attrs,
    options: [...readOptions(active.node.attrs.options), ...options],
    optionSources: sources,
  });
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(from, tr.doc.content.size - 1))));
  return { transaction: tr.scrollIntoView() };
}

function findQuestion(state: EditorState, id: string) {
  let result: { node: Node; position: number } | undefined;
  state.doc.forEach((node, position) => {
    if (node.attrs.id === id) result = { node, position };
  });
  return result;
}

export function moveOption(
  state: EditorState,
  questionId: string,
  optionId: string,
  direction: -1 | 1,
): Result {
  const question = findQuestion(state, questionId);
  if (!question) return { error: 'Soal tidak ditemukan.' };
  const options = [...readOptions(question.node.attrs.options)];
  const index = options.findIndex((option) => option.id === optionId);
  if (index < 0 || index + direction < 0 || index + direction >= options.length)
    return { error: 'Opsi sudah berada di ujung daftar.' };
  [options[index], options[index + direction]] = [options[index + direction]!, options[index]!];
  return {
    transaction: closeHistory(state.tr).setNodeMarkup(question.position, undefined, {
      ...question.node.attrs,
      options,
    }),
  };
}

export function setCorrectOption(state: EditorState, questionId: string, optionId: string): Result {
  const question = findQuestion(state, questionId);
  if (
    !question ||
    !readOptions(question.node.attrs.options).some((option) => option.id === optionId)
  )
    return { error: 'Pilihan jawaban tidak ditemukan.' };
  return {
    transaction: closeHistory(state.tr).setNodeMarkup(question.position, undefined, {
      ...question.node.attrs,
      correctOptionId: optionId,
      keyConflictIds: [],
    }),
  };
}

export function returnOption(state: EditorState, questionId: string, optionId: string): Result {
  const question = findQuestion(state, questionId);
  const option =
    question && readOptions(question.node.attrs.options).find((item) => item.id === optionId);
  if (!question || !option) return { error: 'Pilihan jawaban tidak ditemukan.' };
  let anchor: number | undefined;
  question.node.descendants((node, position) => {
    if (node.type.name === 'optionAnchor' && node.attrs.optionId === optionId)
      anchor = question.position + 1 + position;
  });
  const source = question.node.attrs.optionSources?.[optionId] as unknown;
  const tr = closeHistory(state.tr);
  const attrs = {
    ...question.node.attrs,
    options: readOptions(question.node.attrs.options).filter((item) => item.id !== optionId),
    correctOptionId:
      question.node.attrs.correctOptionId === optionId ? null : question.node.attrs.correctOptionId,
    keyConflictIds: (question.node.attrs.keyConflictIds as string[]).filter(
      (id) => id !== optionId,
    ),
    optionSources: { ...question.node.attrs.optionSources },
  };
  delete attrs.optionSources[optionId];
  tr.setNodeMarkup(question.position, undefined, attrs);
  if (anchor !== undefined && source) {
    tr.replaceRange(anchor, anchor + 1, Slice.fromJSON(state.schema, source));
  } else {
    const fallback = (source as { fallbackContent?: QuestionOptionV1['content'] } | undefined)
      ?.fallbackContent;
    let content = fallback
      ? Fragment.fromArray(fallback.map((block) => state.schema.nodeFromJSON(block)))
      : source
        ? Slice.fromJSON(state.schema, source).content
        : Fragment.fromArray(option.content.map((block) => state.schema.nodeFromJSON(block)));
    if (content.firstChild?.isInline)
      content = Fragment.from(state.schema.nodes.paragraph!.create(null, content));
    tr.insert(question.position + question.node.nodeSize - 1, content);
  }
  return { transaction: tr.scrollIntoView() };
}
