import type { Node } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { Plugin } from '@tiptap/pm/state';
import { readOptions } from './question-contract';

export function questionMetadataPlugin() {
  return new Plugin({
    appendTransaction(transactions, old, state) {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;
      const seen = new Set<string>();
      const tr = state.tr;
      state.doc.forEach((node, position) => {
        const id = node.attrs.id as string | null;
        if (!id || seen.has(id))
          tr.setNodeMarkup(position, undefined, { ...node.attrs, id: crypto.randomUUID() });
        seen.add(tr.doc.nodeAt(position)!.attrs.id as string);
      });
      reconcileOptions(tr, old.doc);
      return tr.docChanged ? tr : null;
    },
  });
}

/** Keep option ownership with its source anchor when questions are split or merged. */
export function reconcileOptions(tr: Transaction, oldDoc: Node) {
  const pool = new Map<string, ReturnType<typeof readOptions>[number]>();
  const owners = new Map<string, string>();
  const sources = new Map<string, unknown>();
  oldDoc.forEach((question) => {
    for (const option of readOptions(question.attrs.options)) {
      pool.set(option.id, option);
      owners.set(option.id, question.attrs.id as string);
    }
    for (const [id, source] of Object.entries(question.attrs.optionSources ?? {}))
      sources.set(id, source);
  });
  const present = new Set<string>();
  const keys = new Set<string>();
  const anchorOwners = new Map<string, string>();
  const questionIds = new Set<string>();
  tr.doc.forEach((question) => {
    questionIds.add(question.attrs.id as string);
    for (const option of readOptions(question.attrs.options)) {
      pool.set(option.id, option);
      present.add(option.id);
      if (!owners.has(option.id)) owners.set(option.id, question.attrs.id as string);
    }
    if (typeof question.attrs.correctOptionId === 'string')
      keys.add(question.attrs.correctOptionId);
    for (const id of question.attrs.keyConflictIds as string[]) keys.add(id);
    for (const [id, source] of Object.entries(question.attrs.optionSources ?? {}))
      sources.set(id, source);
    question.descendants((node) => {
      if (node.type.name === 'optionAnchor')
        anchorOwners.set(node.attrs.optionId as string, question.attrs.id as string);
    });
  });
  for (const [id] of pool) if (!present.has(id) && !anchorOwners.has(id)) pool.delete(id);
  tr.doc.forEach((question, position) => {
    const id = question.attrs.id as string;
    const belongs = (optionId: string) =>
      anchorOwners.get(optionId) === id ||
      (!anchorOwners.has(optionId) &&
        (owners.get(optionId) === id ||
          (!questionIds.has(owners.get(optionId)!) &&
            readOptions(question.attrs.options).some((option) => option.id === optionId))));
    const options = readOptions(question.attrs.options).filter((option) => belongs(option.id));
    for (const option of pool.values())
      if (belongs(option.id) && !options.some((item) => item.id === option.id))
        options.push(option);
    const selected = options.filter((option) => keys.has(option.id)).map((option) => option.id);
    const attrs = {
      ...question.attrs,
      options,
      correctOptionId: selected.length === 1 ? selected[0]! : null,
      keyConflictIds: selected.length > 1 ? selected : [],
      optionSources: Object.fromEntries(
        options
          .filter((option) => sources.has(option.id))
          .map((option) => [option.id, sources.get(option.id)]),
      ),
    };
    if (JSON.stringify(attrs) !== JSON.stringify(question.attrs))
      tr.setNodeMarkup(position, undefined, attrs);
  });
}
