import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { history, redo, undo } from '@tiptap/pm/history';
import { describe, expect, it } from 'vitest';
import { questionExtensions } from './extensions';
import {
  addQuestion,
  delimiterTextInput,
  mergeQuestion,
  questionAt,
  splitAtCursor,
  splitDelimiters,
} from './document';

const schema = getSchema(questionExtensions());
function stateFor(paragraphs: string[]) {
  const doc = schema.node('doc', null, [
    schema.node(
      'question',
      { id: 'original' },
      paragraphs.map((text) =>
        schema.node('paragraph', null, text ? schema.text(text, [schema.mark('bold')]) : undefined),
      ),
    ),
  ]);
  return EditorState.create({ doc, plugins: [history()] });
}

describe('question transformations', () => {
  it('splits 50 questions without losing marked content and undoes as one operation', () => {
    const text = Array.from({ length: 50 }, (_, index) => `Soal ${index + 1}`);
    const state = stateFor(
      text.flatMap((value, index) => (index === 49 ? [value] : [value, '%%%'])),
    );
    const operation = splitDelimiters(state);
    if ('error' in operation) throw new Error(operation.error);
    let next = state.apply(operation.transaction);
    expect(next.doc.childCount).toBe(50);
    const ids = new Set<string>();
    next.doc.forEach((question, _offset, index) => {
      expect(question.textContent).toBe(text[index]);
      expect(question.firstChild!.firstChild!.marks[0]!.type.name).toBe('bold');
      ids.add(question.attrs.id as string);
    });
    expect(ids.size).toBe(50);
    expect(next.doc.firstChild!.attrs.id).toBe('original');
    undo(next, (transaction) => {
      next = next.apply(transaction);
    });
    expect(next.doc.eq(state.doc)).toBe(true);
    redo(next, (transaction) => {
      next = next.apply(transaction);
    });
    expect(next.doc.childCount).toBe(50);
  });

  it('keeps inline delimiters and allows empty drafts around standalone delimiters', () => {
    expect(splitDelimiters(stateFor(['Use %%% in this text']))).toHaveProperty('error');
    for (const paragraphs of [
      ['%%%', 'Question'],
      ['Question', '%%%'],
      ['A', '%%%', '%%%', 'B'],
    ]) {
      const state = stateFor(paragraphs);
      const result = splitDelimiters(state);
      if ('error' in result) throw new Error(result.error);
      const next = state.apply(result.transaction);
      expect(next.doc.childCount).toBe(paragraphs.filter((text) => text === '%%%').length + 1);
      next.doc.check();
      expect(next.selection.$from.node(1)).toBe(next.doc.lastChild);
    }
  });

  it('splits inside a paragraph while preserving every character and formatting', () => {
    let state = stateFor(['Alpha Beta']);
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 7)));
    const operation = splitAtCursor(state);
    if ('error' in operation) throw new Error(operation.error);
    const next = state.apply(operation.transaction);
    expect(next.doc.childCount).toBe(2);
    expect(next.doc.textContent).toBe(state.doc.textContent);
    expect(next.doc.firstChild!.textContent).toBe('Alpha');
    expect(next.doc.lastChild!.firstChild!.firstChild!.marks[0]!.type.name).toBe('bold');
    const merge = mergeQuestion(next, 'previous');
    if ('error' in merge) throw new Error(merge.error);
    expect(next.apply(merge.transaction).doc.textContent).toBe('Alpha Beta');
  });

  it('rejects a range selection but allows a new question at the start, end, and in an empty draft', () => {
    const state = stateFor(['Alpha Beta']);
    const range = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 3, 5)));
    expect(splitAtCursor(range)).toHaveProperty('error');
    for (const position of [2, 12]) {
      const boundary = state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, position)),
      );
      const operation = splitAtCursor(boundary);
      if ('error' in operation) throw new Error(operation.error);
      const next = boundary.apply(operation.transaction);
      expect(next.doc.childCount).toBe(2);
      expect(next.doc.textContent).toBe(state.doc.textContent);
      expect(questionAt(next)?.index).toBe(1);
    }
    const empty = stateFor(['']);
    const operation = splitAtCursor(empty);
    if ('error' in operation) throw new Error(operation.error);
    expect(empty.apply(operation.transaction).doc.childCount).toBe(2);
    expect(mergeQuestion(state, 'previous')).toHaveProperty('error');
    expect(mergeQuestion(state, 'next')).toHaveProperty('error');
  });

  it('consumes a trailing delimiter and focuses an empty next question', () => {
    let state = stateFor(['Ikan Cakalang', '%%%']);
    state = state.apply(state.tr.setSelection(TextSelection.atEnd(state.doc)));
    const result = splitAtCursor(state);
    if ('error' in result) throw new Error(result.error);
    let next = state.apply(result.transaction);
    expect(next.doc.childCount).toBe(2);
    expect(next.doc.firstChild!.textContent).toBe('Ikan Cakalang');
    expect(next.doc.lastChild!.textContent).toBe('');
    expect(questionAt(next)?.index).toBe(1);
    undo(next, (tr) => {
      next = next.apply(tr);
    });
    expect(next.doc.eq(state.doc)).toBe(true);
  });

  it('turns the third typed percent into a new question without rerunning on undo', () => {
    let state = stateFor(['Question', '%%']);
    state = state.apply(state.tr.setSelection(TextSelection.atEnd(state.doc)));
    const result = delimiterTextInput(state, state.selection.from, state.selection.to, '%');
    expect(result).not.toBeNull();
    let next = state.apply(result!);
    expect(next.doc.childCount).toBe(2);
    expect(next.doc.textContent).toBe('Question');
    expect(questionAt(next)?.index).toBe(1);
    undo(next, (tr) => {
      next = next.apply(tr);
    });
    expect(next.doc.eq(state.doc)).toBe(true);
    redo(next, (tr) => {
      next = next.apply(tr);
    });
    expect(next.doc.childCount).toBe(2);
    const inline = stateFor(['Question %%']);
    const end = inline.doc.content.size - 2;
    expect(delimiterTextInput(inline, end, end, '%')).toBeNull();
  });

  it('adds an empty question after the active one and preserves its content', () => {
    const state = stateFor(['Original']);
    const next = state.apply(addQuestion(state));
    expect(next.doc.childCount).toBe(2);
    expect(next.doc.firstChild!.eq(state.doc.firstChild!)).toBe(true);
    expect(next.doc.lastChild!.textContent).toBe('');
    expect(questionAt(next)?.index).toBe(1);
  });

  it('recognizes delimiters on soft-break lines and preserves surrounding marks', () => {
    const paragraph = schema.node('paragraph', null, [
      schema.text('First', [schema.mark('bold')]),
      schema.node('hardBreak'),
      schema.text('%%%'),
      schema.node('hardBreak'),
      schema.text('Second', [schema.mark('italic')]),
    ]);
    const doc = schema.node('doc', null, [
      schema.node('question', { id: 'soft-break' }, [paragraph]),
    ]);
    const state = EditorState.create({ doc, plugins: [history()] });
    const result = splitDelimiters(state);
    if ('error' in result) throw new Error(result.error);
    const next = state.apply(result.transaction);
    expect(next.doc.childCount).toBe(2);
    expect(next.doc.firstChild!.textContent).toBe('First');
    expect(next.doc.lastChild!.textContent).toBe('Second');
    expect(next.doc.firstChild!.firstChild!.firstChild!.marks[0]!.type.name).toBe('bold');
    expect(next.doc.lastChild!.firstChild!.firstChild!.marks[0]!.type.name).toBe('italic');
    const cursor = state.apply(state.tr.setSelection(TextSelection.create(doc, 10)));
    const split = splitAtCursor(cursor);
    if ('error' in split) throw new Error(split.error);
    expect(cursor.apply(split.transaction).doc.eq(next.doc)).toBe(false); // Independent new IDs.
    expect(cursor.apply(split.transaction).doc.textContent).toBe('FirstSecond');
  });
});
