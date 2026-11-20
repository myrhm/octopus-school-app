import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { history, undo, redo } from '@tiptap/pm/history';
import { describe, expect, it } from 'vitest';
import { questionExtensions } from './extensions';
import { extractOptions, moveOption, returnOption, setCorrectOption } from './answer-options';
import { questionMetadataPlugin } from './option-model';
import { mergeQuestion, splitAtCursor, validateDocument } from './document';
import { readOptions, toStudentQuestions } from './question-contract';
import { Schema } from '@tiptap/pm/model';
import { createDraft, saveDraft } from './draft-store';

const schema = getSchema(questionExtensions());
function documentFor(lines: string[]) {
  return schema.node('doc', null, [
    schema.node(
      'question',
      { id: 'q1' },
      lines.map((text) =>
        schema.node('paragraph', null, schema.text(text, [schema.mark('italic')])),
      ),
    ),
  ]);
}
function stateFor(lines: string[]) {
  return EditorState.create({
    doc: documentFor(lines),
    plugins: [history(), questionMetadataPlugin()],
  });
}
function selectText(state: EditorState, start: string, end = start) {
  let from = -1;
  let to = -1;
  state.doc.descendants((node, position) => {
    if (node.isText) {
      const first = node.text!.indexOf(start);
      if (first >= 0 && from < 0) from = position + first;
      const last = node.text!.indexOf(end);
      if (last >= 0) to = position + last + end.length;
    }
  });
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
}
function apply(state: EditorState, result: ReturnType<typeof extractOptions>) {
  if ('error' in result) throw new Error(result.error);
  return state.apply(result.transaction);
}

describe('answer options', () => {
  it('protects option-bearing records from the old schema after every anchor is removed', async () => {
    let state = selectText(stateFor(['Question?', 'A. One', 'B. Two']), 'A. One', 'B. Two');
    state = apply(state, extractOptions(state, true));
    const key = readOptions(state.doc.firstChild!.attrs.options)[0]!.id;
    state = apply(state, setCorrectOption(state, 'q1', key));
    const anchors: number[] = [];
    state.doc.descendants((node, position) => {
      if (node.type.name === 'optionAnchor') anchors.push(position);
    });
    const tr = state.tr;
    for (const position of anchors.reverse()) tr.delete(position, position + 1);
    state = state.apply(tr);
    const legacySchema = new Schema({
      nodes: schema.spec.nodes
        .remove('optionAnchor')
        .update('question', { ...schema.nodes.question!.spec, attrs: { id: { default: null } } }),
      marks: schema.spec.marks,
    });
    const legacyDocument = legacySchema.nodeFromJSON(state.doc.toJSON());
    legacyDocument.check();
    expect(legacyDocument.firstChild!.attrs.options).toBeUndefined(); // Reproduces the silent loss.
    const saved = await saveDraft({ ...(await createDraft()), document: state.doc.toJSON() });
    expect(saved.formatVersion).toBe(2); // Legacy clients reject before nodeFromJSON.
    expect(saved.document.content![0]!.attrs!.correctOptionId).toBe(key);
    expect(saved.document.content![0]!.attrs!.options).toHaveLength(2);
  });

  it('moves only the selected text, preserves marks, and round trips through undo/redo', () => {
    let state = selectText(stateFor(['Before A. Jakarta after']), 'A. Jakarta');
    const original = state.doc;
    state = apply(state, extractOptions(state));
    const option = readOptions(state.doc.firstChild!.attrs.options)[0]!;
    expect(option.content[0]!.content![0]!.text).toBe('Jakarta');
    expect(option.content[0]!.content![0]!.marks![0]!.type).toBe('italic');
    expect(state.doc.textContent).toBe('Before  after');
    const extracted = state.doc;
    undo(state, (tr) => {
      state = state.apply(tr);
    });
    expect(state.doc.eq(original)).toBe(true);
    redo(state, (tr) => {
      state = state.apply(tr);
    });
    expect(state.doc.eq(extracted)).toBe(true);
    state = apply(state, returnOption(state, 'q1', option.id));
    expect(state.doc.textContent).toBe(original.textContent);
    expect(readOptions(state.doc.firstChild!.attrs.options)).toHaveLength(0);
  });

  it('extracts multiline options and restores the original paragraphs in reverse return order', () => {
    let state = stateFor([
      'Question?',
      'A. First',
      'Continuation of first',
      'B) Second',
      '(C) Third',
    ]);
    const original = state.doc;
    state = selectText(state, 'A. First', '(C) Third');
    state = apply(state, extractOptions(state, true));
    const options = readOptions(state.doc.firstChild!.attrs.options);
    expect(options).toHaveLength(3);
    expect(
      options[0]!.content
        .map((block) => block.content?.map((node) => node.text ?? '').join('') ?? '')
        .join(' '),
    ).toContain('Continuation of first');
    expect(state.doc.textContent).toBe('Question?');
    for (const option of [...options].reverse())
      state = apply(state, returnOption(state, 'q1', option.id));
    expect(state.doc.textContent).toBe(original.textContent);
    expect(state.doc.firstChild!.content.eq(original.firstChild!.content)).toBe(true);
  });

  it('does not change an ambiguous selection or text across questions', () => {
    let state = selectText(stateFor(['A. One', 'C. Three']), 'A. One', 'C. Three');
    expect(extractOptions(state, true)).toHaveProperty('error');
    expect(readOptions(state.doc.firstChild!.attrs.options)).toHaveLength(0);
    const doc = schema.node('doc', null, [
      documentFor(['First']).firstChild!,
      schema.node('question', { id: 'q2' }, [
        schema.node('paragraph', null, schema.text('Second')),
      ]),
    ]);
    state = EditorState.create({ doc });
    state = selectText(state, 'First', 'Second');
    expect(extractOptions(state)).toHaveProperty('error');
  });

  it('keeps the answer key tied to ID during reorder and clears it on return', () => {
    let state = selectText(stateFor(['Question?', 'A. One', 'B. Two']), 'A. One', 'B. Two');
    state = apply(state, extractOptions(state, true));
    const option = readOptions(state.doc.firstChild!.attrs.options)[1]!;
    state = apply(state, setCorrectOption(state, 'q1', option.id));
    state = apply(state, moveOption(state, 'q1', option.id, -1));
    expect(readOptions(state.doc.firstChild!.attrs.options)[0]!.id).toBe(option.id);
    expect(state.doc.firstChild!.attrs.correctOptionId).toBe(option.id);
    state = apply(state, returnOption(state, 'q1', option.id));
    expect(state.doc.firstChild!.attrs.correctOptionId).toBeNull();
  });

  it('keeps ownership when a question is split and preserves keys through merge', () => {
    let state = selectText(stateFor(['Question?', 'A. One', 'B. Two']), 'A. One', 'B. Two');
    state = apply(state, extractOptions(state, true));
    const options = readOptions(state.doc.firstChild!.attrs.options);
    state = apply(state, setCorrectOption(state, 'q1', options[0]!.id));
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 6)));
    state = apply(state, splitAtCursor(state));
    expect(state.doc.childCount).toBe(2);
    expect(readOptions(state.doc.firstChild!.attrs.options)).toHaveLength(0);
    expect(readOptions(state.doc.lastChild!.attrs.options).map((option) => option.id)).toEqual(
      options.map((option) => option.id),
    );
    expect(state.doc.lastChild!.attrs.correctOptionId).toBe(options[0]!.id);
    state = apply(state, mergeQuestion(state, 'previous'));
    expect(readOptions(state.doc.firstChild!.attrs.options)).toHaveLength(2);
    expect(state.doc.firstChild!.attrs.correctOptionId).toBe(options[0]!.id);
  });

  it('builds an independent student snapshot without keys, source anchors, or recovery data', () => {
    let state = selectText(stateFor(['Question?', 'A. One', 'B. Two']), 'A. One', 'B. Two');
    state = apply(state, extractOptions(state, true));
    const option = readOptions(state.doc.firstChild!.attrs.options)[0]!;
    state = apply(state, setCorrectOption(state, 'q1', option.id));
    const student = toStudentQuestions(state.doc.toJSON());
    expect(Object.keys(student[0]!)).toEqual(['id', 'content', 'options']);
    expect(JSON.stringify(student)).not.toMatch(
      /correctOptionId|optionAnchor|optionSources|keyConflictIds/,
    );
    student[0]!.options[0]!.content[0]!.content![0]!.text = 'Changed in preview';
    expect(readOptions(state.doc.firstChild!.attrs.options)[0]!.content[0]!.content![0]!.text).toBe(
      'One',
    );
  });

  it('preserves both historical key candidates on merge instead of choosing silently', () => {
    const first = {
      id: 'first',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
    };
    const second = {
      id: 'second',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }],
    };
    const doc = schema.node('doc', null, [
      schema.node('question', { id: 'q1', options: [first], correctOptionId: 'first' }, [
        schema.node('paragraph', null, schema.text('First question')),
      ]),
      schema.node('question', { id: 'q2', options: [second], correctOptionId: 'second' }, [
        schema.node('paragraph', null, schema.text('Second question')),
      ]),
    ]);
    let state = EditorState.create({ doc, plugins: [history(), questionMetadataPlugin()] });
    state = apply(state, mergeQuestion(state, 'next'));
    expect(readOptions(state.doc.firstChild!.attrs.options)).toHaveLength(2);
    expect(state.doc.firstChild!.attrs.correctOptionId).toBeNull();
    expect(state.doc.firstChild!.attrs.keyConflictIds).toEqual(['first', 'second']);
    state = apply(state, setCorrectOption(state, 'q1', 'second'));
    expect(state.doc.firstChild!.attrs.correctOptionId).toBe('second');
    expect(state.doc.firstChild!.attrs.keyConflictIds).toEqual([]);
  });

  it('returns content after other edits and falls back to the end if its anchor was removed', () => {
    let state = selectText(stateFor(['Question?', 'A. One']), 'A. One');
    state = apply(state, extractOptions(state));
    const option = readOptions(state.doc.firstChild!.attrs.options)[0]!;
    state = state.apply(state.tr.insertText('Prefix ', 2));
    state = apply(state, returnOption(state, 'q1', option.id));
    expect(state.doc.textContent).toBe('Prefix Question?A. One');

    state = selectText(state, 'A. One');
    state = apply(state, extractOptions(state));
    const again = readOptions(state.doc.firstChild!.attrs.options)[0]!;
    let position = -1;
    state.doc.descendants((node, offset) => {
      if (node.type.name === 'optionAnchor') position = offset;
    });
    state = state.apply(state.tr.delete(position, position + 1));
    expect(readOptions(state.doc.firstChild!.attrs.options)).toHaveLength(1);
    state = apply(state, returnOption(state, 'q1', again.id));
    expect(state.doc.textContent).toBe('Prefix Question?A. One');
  });

  it('supports soft-break option labels without losing paragraph formatting', () => {
    const block = schema.node('paragraph', null, [
      schema.text('A. First', [schema.mark('bold')]),
      schema.node('hardBreak'),
      schema.text('b) Second', [schema.mark('italic')]),
    ]);
    const doc = schema.node('doc', null, [schema.node('question', { id: 'q1' }, [block])]);
    let state = EditorState.create({ doc, plugins: [history(), questionMetadataPlugin()] });
    state = selectText(state, 'A. First', 'b) Second');
    state = apply(state, extractOptions(state, true));
    expect(readOptions(state.doc.firstChild!.attrs.options)).toHaveLength(2);
    for (const option of [...readOptions(state.doc.firstChild!.attrs.options)].reverse())
      state = apply(state, returnOption(state, 'q1', option.id));
    expect(state.doc.firstChild!.content.eq(doc.firstChild!.content)).toBe(true);
  });

  it('accepts legacy drafts and rejects an invalid option key before editing', () => {
    const legacy = {
      type: 'doc',
      content: [{ type: 'question', attrs: { id: 'legacy' }, content: [{ type: 'paragraph' }] }],
    };
    expect(validateDocument(schema, legacy).firstChild!.attrs.correctOptionId).toBeNull();
    expect(() =>
      validateDocument(schema, {
        type: 'doc',
        content: [
          {
            type: 'question',
            attrs: { id: 'invalid', correctOptionId: 'missing' },
            content: [{ type: 'paragraph' }],
          },
        ],
      }),
    ).toThrow();
  });
});
