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
      {
        class: 'option-anchor',
        'data-option-id': node.attrs.optionId,
        contenteditable: 'false',
        'aria-hidden': 'true',
      },
      '',
    ];
  },
});

type Result = { transaction: Transaction } | { error: string };
const labelPattern = /^\s*(?:\(([A-Za-z])\)|([A-Za-z])[.)])\s+/;
const bulletPattern = /^\s*[-–—•●▪◦‣∙\uF0B7](?:[ \t]+|(?=[^\s\d])|$)/;

function optionPrefix(text: string) {
  let length = 0;
  // Word/PDF pastes can contain both a literal bullet and an A/B/C label.
  for (let i = 0; i < 8; i++) {
    const bullet = text.slice(length).match(bulletPattern);
    if (!bullet) break;
    length += bullet[0].length;
  }
  const label = text.slice(length).match(labelPattern);
  if (label) length += label[0].length;
  return length ? { length } : undefined;
}

function whitespaceOnly(node: Node): boolean {
  if (node.isText) return !node.text?.trim();
  if (node.isLeaf) return node.type.name === 'hardBreak';
  let empty = true;
  node.forEach((child) => {
    if (!whitespaceOnly(child)) empty = false;
  });
  return empty;
}

function trimEdges(content: Fragment): Fragment {
  const nodes: Node[] = [];
  content.forEach((node) => nodes.push(node));
  while (nodes.length && whitespaceOnly(nodes[0]!)) nodes.shift();
  while (nodes.length && whitespaceOnly(nodes[nodes.length - 1]!)) nodes.pop();
  return Fragment.fromArray(nodes);
}

function stripLabel(content: Fragment): Fragment {
  content = trimEdges(content);
  // Only remove the outer list that supplies the option marker. Lists within
  // the answer stay intact, and the original slice remains available to restore.
  while (content.childCount === 1) {
    const list = content.firstChild!;
    if (!['bulletList', 'orderedList'].includes(list.type.name)) break;
    const items = trimEdges(list.content);
    if (items.childCount !== 1 || items.firstChild?.type.name !== 'listItem') break;
    content = trimEdges(items.firstChild.content);
  }
  const first = content.firstChild;
  if (!first?.isTextblock) return content;
  const match = optionPrefix(first.textContent);
  if (!match) return content;
  return Fragment.from(first.copy(first.content.cut(match.length))).append(
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
      error:
        'Seleksi mencakup jawaban yang sudah menjadi opsi. Pilih hanya teks jawaban baru, atau gunakan Kembalikan ke soal sebelum mengekstraknya lagi.',
    };
  let hasImage = false;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.type.name === 'schoolImage') hasImage = true;
  });
  if (!state.doc.textBetween(from, to).trim() && !hasImage)
    return { error: 'Seleksi belum berisi teks atau gambar jawaban.' };

  const starts: Array<{ position: number; end?: number }> = [];
  if (multiple) {
    let unsupported = false;
    state.doc.nodesBetween(from, to, (node, position, parent) => {
      if (node.type.name === 'listItem') {
        // One top-level HTML list item is one answer, including wrapped lines
        // and paragraphs. Its nested lists belong to that same answer.
        if (state.doc.resolve(position).depth !== 2) {
          unsupported = true;
          return false;
        }
        const start = Math.max(from, position + 1);
        const end = Math.min(to, position + node.nodeSize - 1);
        if (end > start && state.doc.textBetween(start, end).trim())
          starts.push({ position: start, end });
        return false;
      }
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
        const match = optionPrefix(text);
        if (match) starts.push({ position: start });
        else if (text.trim() && (!starts.length || starts[starts.length - 1]!.end !== undefined))
          unsupported = true;
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
    if (unsupported || starts.length < 2)
      return {
        error:
          'Format beberapa opsi belum terbaca. Pilih minimal dua jawaban dalam daftar atau pada baris terpisah dengan A., B), (C), atau bullet. Jangan sertakan teks pertanyaan; untuk struktur bertingkat yang ambigu, pindahkan satu jawaban dahulu.',
      };
  } else starts.push({ position: from });

  const options: QuestionOptionV1[] = [];
  const sources: Record<string, unknown> = { ...active.node.attrs.optionSources };
  const ranges = starts.map((start, index) => ({
    from: start.position,
    to: start.end ?? starts[index + 1]?.position ?? to,
    id: crypto.randomUUID(),
  }));
  for (const range of ranges) {
    const original = rangeContent(state, range.from, range.to);
    const content = stripLabel(original);
    let containsImage = false;
    content.descendants((node) => {
      if (node.type.name === 'schoolImage') containsImage = true;
    });
    if (!content.textBetween(0, content.size).trim() && !containsImage)
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
