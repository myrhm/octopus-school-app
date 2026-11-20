import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { questionExtensions } from '../question-import/extensions';
import { questionMetadataPlugin } from '../question-import/option-model';
import { extractOptions, moveOption, setCorrectOption } from '../question-import/answer-options';
import { loadDraft, saveDraft } from '../question-import/draft-store';
import type { LocalDraft } from '../question-import/draft-store';
import type { JSONContent } from '@tiptap/core';
import { loadPreview } from './load-preview';

async function persist(document: JSONContent, formatVersion = 1) {
  return saveDraft({
    id: crypto.randomUUID(),
    formatVersion,
    title: 'Integration',
    document,
    questionCount: document.content?.length ?? 0,
    revision: 0,
    createdAt: '2026-11-21T00:00:00Z',
    updatedAt: '2026-11-21T00:00:00Z',
  } as LocalDraft);
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

  it('normalizes legacy text-only drafts without writing defaults back', async () => {
    const draft = await persist({
      type: 'doc',
      content: [
        {
          type: 'question',
          attrs: { id: 'old' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Legacy' }] }],
        },
      ],
    });
    expect((await loadPreview(draft.id))?.questions[0]?.options).toEqual([]);
    expect(await loadDraft(draft.id)).toEqual(draft);
  });

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
