import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { questionExtensions } from '../question-import/extensions';
import { questionMetadataPlugin } from '../question-import/option-model';
import { extractOptions, moveOption, setCorrectOption } from '../question-import/answer-options';
import { currentDraftFormatVersion, loadDraft, saveDraft } from '../question-import/draft-store';
import type { LocalDraft } from '../question-import/draft-store';
import type { JSONContent } from '@tiptap/core';
import { loadPreview } from './load-preview';

async function persist(document: JSONContent, formatVersion: number = currentDraftFormatVersion) {
  const saved = await saveDraft({
    id: crypto.randomUUID(),
    formatVersion: currentDraftFormatVersion,
    title: 'Integration',
    document,
    questionCount: document.content?.length ?? 0,
    revision: 0,
    createdAt: '2026-11-21T00:00:00Z',
    updatedAt: '2026-11-21T00:00:00Z',
  });
  if (formatVersion === currentDraftFormatVersion) return saved;
  // Seed legacy/future records directly; the production writer correctly upgrades/rejects them.
  const raw = { ...saved, formatVersion } as LocalDraft;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('octopus-local-drafts', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put(raw);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return raw;
}

describe('saved option draft preview integration', () => {
  it('projects extracted and reordered options without private fields or storage writes', async () => {
    const schema = getSchema(questionExtensions());
    const p = (text: string) =>
      schema.node('paragraph', null, schema.text(text, [schema.mark('bold')]));
    let state = EditorState.create({
      doc: schema.node('doc', null, [
        schema.node('question', { id: 'q' }, [p('Question?'), p('A. First'), p('B. Second')]),
      ]),
      plugins: [questionMetadataPlugin()],
    });
    let from = 0,
      to = 0;
    state.doc.descendants((node, pos) => {
      if (node.text === 'A. First') from = pos;
      if (node.text === 'B. Second') to = pos + node.nodeSize;
    });
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
    const extracted = extractOptions(state, true);
    if ('error' in extracted) throw new Error(extracted.error);
    state = state.apply(extracted.transaction);
    const id = state.doc.firstChild!.attrs.options[1].id as string;
    for (const action of [
      setCorrectOption,
      (s: EditorState, q: string, o: string) => moveOption(s, q, o, -1),
    ]) {
      const result = action(state, 'q', id);
      if ('error' in result) throw new Error(result.error);
      state = state.apply(result.transaction);
    }
    const draft = await persist(state.doc.toJSON());
    expect(draft.formatVersion).toBe(2);
    const before = await loadDraft(draft.id);
    const preview = await loadPreview(draft.id);
    expect(preview?.questions[0]?.options[0]?.id).toBe(id);
    expect(preview?.questions[0]?.options[0]?.content[0]?.content?.[0]).toEqual({
      type: 'text',
      text: 'Second',
      marks: [{ type: 'bold' }],
    });
    expect(JSON.stringify(preview)).not.toMatch(
      /correctOptionId|optionAnchor|optionSources|keyConflictIds/,
    );
    expect(await loadDraft(draft.id)).toEqual(before);
  });

  it.each([1, 2])(
    'reads text-only v%s drafts without writing defaults or migrations back',
    async (version) => {
      const draft = await persist(
        {
          type: 'doc',
          content: [
            {
              type: 'question',
              attrs: { id: 'old' },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Legacy' }] }],
            },
          ],
        },
        version,
      );
      expect((await loadPreview(draft.id))?.questions[0]?.options).toEqual([]);
      expect(await loadDraft(draft.id)).toEqual(draft);
    },
  );

  it('rejects unsupported versions and malformed keys without changing storage', async () => {
    const unsupported = await persist({ type: 'doc', content: [] }, 99);
    await expect(loadPreview(unsupported.id)).rejects.toThrow('Unsupported draft version');
    const invalid = await persist({
      type: 'doc',
      content: [
        {
          type: 'question',
          attrs: { id: 'invalid', correctOptionId: 'missing' },
          content: [{ type: 'paragraph' }],
        },
      ],
    });
    await expect(loadPreview(invalid.id)).rejects.toThrow('Invalid answer key');
    expect(await loadDraft(invalid.id)).toEqual(invalid);
    expect(await loadDraft(unsupported.id)).toEqual(unsupported);
  });
});
